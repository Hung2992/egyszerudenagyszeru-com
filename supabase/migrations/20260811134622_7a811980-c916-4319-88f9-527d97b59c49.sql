CREATE TABLE public.partner_fulfillment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  customer_email text,
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_fulfillment_audit TO authenticated;
GRANT ALL ON public.partner_fulfillment_audit TO service_role;

ALTER TABLE public.partner_fulfillment_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own fulfillment audit"
ON public.partner_fulfillment_audit FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_fulfillment_audit.partner_id AND p.user_id = auth.uid())
);

CREATE INDEX idx_pfa_partner_created ON public.partner_fulfillment_audit (partner_id, created_at DESC);