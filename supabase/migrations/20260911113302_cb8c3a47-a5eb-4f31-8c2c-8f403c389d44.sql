CREATE TABLE public.partner_newsletter_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blast_id uuid NOT NULL REFERENCES public.partner_email_blasts(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_newsletter_deliveries TO authenticated;
GRANT ALL ON public.partner_newsletter_deliveries TO service_role;
ALTER TABLE public.partner_newsletter_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner reads own newsletter deliveries"
ON public.partner_newsletter_deliveries FOR SELECT TO authenticated
USING (
  partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE INDEX idx_pnd_blast ON public.partner_newsletter_deliveries(blast_id, created_at DESC);
CREATE INDEX idx_pnd_partner ON public.partner_newsletter_deliveries(partner_id, created_at DESC);

CREATE TABLE public.partner_comm_survey (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  preferred_provider text,
  account_owner text,
  sms_sender text,
  whatsapp_sender text,
  channels text[] NOT NULL DEFAULT ARRAY[]::text[],
  message_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  monthly_volume text,
  notes text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.partner_comm_survey TO authenticated;
GRANT ALL ON public.partner_comm_survey TO service_role;
ALTER TABLE public.partner_comm_survey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner manages own comm survey"
ON public.partner_comm_survey FOR ALL TO authenticated
USING (
  partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER trg_partner_comm_survey_updated
BEFORE UPDATE ON public.partner_comm_survey
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();