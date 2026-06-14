
-- 1. Add consent + retention fields
ALTER TABLE public.tenant_kyc_submissions
  ADD COLUMN IF NOT EXISTS consent_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip text,
  ADD COLUMN IF NOT EXISTS consent_version text DEFAULT 'v1-2026-06',
  ADD COLUMN IF NOT EXISTS data_retention_until timestamptz;

-- 2. Audit log table
CREATE TABLE IF NOT EXISTS public.tenant_kyc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.tenant_kyc_submissions(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL DEFAULT 'admin',
  event_type text NOT NULL,
  field_accessed text,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.tenant_kyc_audit_log TO authenticated;
GRANT ALL ON public.tenant_kyc_audit_log TO service_role;

ALTER TABLE public.tenant_kyc_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin view kyc audit" ON public.tenant_kyc_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert kyc audit" ON public.tenant_kyc_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_kyc_audit_submission ON public.tenant_kyc_audit_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_created ON public.tenant_kyc_audit_log(created_at DESC);

-- 3. Enforce consent on insert
CREATE OR REPLACE FUNCTION public.enforce_kyc_consent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.consent_accepted IS NOT TRUE THEN
    RAISE EXCEPTION 'KYC consent required';
  END IF;
  IF NEW.consent_accepted_at IS NULL THEN
    NEW.consent_accepted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kyc_enforce_consent ON public.tenant_kyc_submissions;
CREATE TRIGGER trg_kyc_enforce_consent
  BEFORE INSERT ON public.tenant_kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_consent();

-- 4. Auto-set retention on status change
CREATE OR REPLACE FUNCTION public.set_kyc_retention()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.data_retention_until := now() + interval '60 days';
  ELSIF NEW.status = 'approved' THEN
    NEW.data_retention_until := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kyc_retention ON public.tenant_kyc_submissions;
CREATE TRIGGER trg_kyc_retention
  BEFORE UPDATE ON public.tenant_kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_kyc_retention();

-- 5. Purge expired rejected KYC (cron)
CREATE OR REPLACE FUNCTION public.purge_expired_kyc()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  WITH del AS (
    DELETE FROM public.tenant_kyc_submissions
    WHERE status = 'rejected'
      AND data_retention_until IS NOT NULL
      AND data_retention_until < now()
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM del;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_kyc() FROM public, anon, authenticated;

-- 6. Log KYC access (admin only)
CREATE OR REPLACE FUNCTION public.log_kyc_access(
  _submission_id uuid,
  _event_type text,
  _field text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.tenant_kyc_audit_log (submission_id, actor_id, actor_role, event_type, field_accessed, details)
  VALUES (_submission_id, auth.uid(), 'admin', _event_type, _field, _details);
END;
$$;
