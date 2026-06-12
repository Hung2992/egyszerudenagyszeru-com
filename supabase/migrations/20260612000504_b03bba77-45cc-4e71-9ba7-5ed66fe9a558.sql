
-- TOTP secrets
CREATE TABLE IF NOT EXISTS public.accountant_totp_secrets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  backup_codes text[] DEFAULT '{}',
  verified_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accountant_totp_secrets TO authenticated;
GRANT ALL ON public.accountant_totp_secrets TO service_role;

ALTER TABLE public.accountant_totp_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self read totp" ON public.accountant_totp_secrets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Self write totp" ON public.accountant_totp_secrets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER totp_set_updated_at BEFORE UPDATE ON public.accountant_totp_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Welcome flag for invites
ALTER TABLE public.pending_accountant_invites
  ADD COLUMN IF NOT EXISTS welcomed_at timestamptz;

-- Audit export RPC (admin only)
CREATE OR REPLACE FUNCTION public.admin_export_accountant_audit(_from timestamptz, _to timestamptz)
RETURNS TABLE (
  id uuid, user_id uuid, user_email text, action text, resource text,
  ip_address text, user_agent text, metadata jsonb, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT l.id, l.user_id, u.email::text, l.action, l.resource,
           l.ip_address, l.user_agent, l.metadata, l.created_at
    FROM public.accountant_access_log l
    LEFT JOIN auth.users u ON u.id = l.user_id
    WHERE l.created_at >= _from AND l.created_at < _to
    ORDER BY l.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_export_accountant_audit(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_export_accountant_audit(timestamptz, timestamptz) TO authenticated;
