CREATE TABLE public.partner_campaign_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal text NOT NULL,
  audience text NOT NULL,
  tone text,
  message_headline text,
  message_body text,
  newsletter_subject text,
  newsletter_body text,
  page_slug text,
  page_headline text,
  page_subheadline text,
  page_body text,
  page_cta_text text,
  qa_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  approved_at timestamptz,
  published_at timestamptz,
  published_landing_page_id uuid,
  published_blast_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_campaign_plans_status_chk CHECK (status IN ('draft','approved','published'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_campaign_plans TO authenticated;
GRANT ALL ON public.partner_campaign_plans TO service_role;

ALTER TABLE public.partner_campaign_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own campaign plans"
ON public.partner_campaign_plans FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_campaign_plans.partner_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_campaign_plans.partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins manage all campaign plans"
ON public.partner_campaign_plans FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_partner_campaign_plans_partner ON public.partner_campaign_plans(partner_id, created_at DESC);

CREATE TRIGGER partner_campaign_plans_updated_at
BEFORE UPDATE ON public.partner_campaign_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();