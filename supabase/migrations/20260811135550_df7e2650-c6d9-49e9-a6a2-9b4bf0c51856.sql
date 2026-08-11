ALTER TABLE public.partner_fulfillment_audit
  ADD COLUMN IF NOT EXISTS action_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS plan_id uuid,
  ADD COLUMN IF NOT EXISTS result text NOT NULL DEFAULT 'success';

CREATE INDEX IF NOT EXISTS idx_pfa_plan ON public.partner_fulfillment_audit (plan_id);
CREATE INDEX IF NOT EXISTS idx_pfa_action ON public.partner_fulfillment_audit (action_id);