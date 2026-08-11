CREATE TABLE public.partner_action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  goal text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'proposed',
  expected_impact text,
  risk_level text DEFAULT 'alacsony',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  execution_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_at timestamptz,
  executed_at timestamptz,
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_action_plans TO authenticated;
GRANT ALL ON public.partner_action_plans TO service_role;

ALTER TABLE public.partner_action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner own action plans" ON public.partner_action_plans
FOR ALL TO authenticated
USING ((partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_partner_action_plans_partner ON public.partner_action_plans(partner_id, created_at DESC);

CREATE TRIGGER partner_action_plans_updated_at
BEFORE UPDATE ON public.partner_action_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();