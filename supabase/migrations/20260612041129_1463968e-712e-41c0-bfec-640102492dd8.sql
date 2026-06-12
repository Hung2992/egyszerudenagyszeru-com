
-- ============= 1) partner_access_log =============
CREATE TABLE IF NOT EXISTS public.partner_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('menu_shown','drawer_opened','portal_entered','redirected','activation_email_sent')),
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_access_log_partner ON public.partner_access_log(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_access_log_user ON public.partner_access_log(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.partner_access_log TO authenticated;
GRANT ALL ON public.partner_access_log TO service_role;

ALTER TABLE public.partner_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read partner access log"
  ON public.partner_access_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "users insert own access log"
  ON public.partner_access_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============= 2) partner_referral_status_history =============
CREATE TABLE IF NOT EXISTS public.partner_referral_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.partner_referrals(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_role text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_status_history_partner ON public.partner_referral_status_history(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_status_history_referral ON public.partner_referral_status_history(referral_id, created_at DESC);

GRANT SELECT ON public.partner_referral_status_history TO authenticated;
GRANT ALL ON public.partner_referral_status_history TO service_role;

ALTER TABLE public.partner_referral_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read all referral status history"
  ON public.partner_referral_status_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "partners read own referral status history"
  ON public.partner_referral_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_referral_status_history.partner_id
      AND p.user_id = auth.uid()
  ));

-- ============= 3) Trigger: minden status változást rögzít =============
CREATE OR REPLACE FUNCTION public.log_partner_referral_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.partner_referral_status_history (
      referral_id, partner_id, old_status, new_status, changed_by, changed_by_role, note
    ) VALUES (
      NEW.id, NEW.partner_id, NULL, NEW.status, auth.uid(), COALESCE(auth.role(),'system'),
      'létrehozva'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.partner_referral_status_history (
      referral_id, partner_id, old_status, new_status, changed_by, changed_by_role, note
    ) VALUES (
      NEW.id, NEW.partner_id, OLD.status, NEW.status, auth.uid(), COALESCE(auth.role(),'system'),
      CASE
        WHEN NEW.status = 'confirmed' THEN 'jutalék megerősítve'
        WHEN NEW.status = 'cancelled' THEN 'jutalék lemondva'
        WHEN NEW.status = 'paid' THEN 'kifizetve'
        ELSE 'státusz változott'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_partner_referral_status ON public.partner_referrals;
CREATE TRIGGER trg_log_partner_referral_status
AFTER INSERT OR UPDATE OF status ON public.partner_referrals
FOR EACH ROW EXECUTE FUNCTION public.log_partner_referral_status_change();

-- Engedjük a realtime értesítéseket a payouts változásairól (frontend subscription)
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_payouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_referral_status_history;
