ALTER TABLE public.partner_action_plans
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by_email text,
  ADD COLUMN IF NOT EXISTS approval_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rollback_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rolled_back_at timestamptz,
  ADD COLUMN IF NOT EXISTS rolled_back_by uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'partner';

CREATE INDEX IF NOT EXISTS idx_partner_action_plans_correlation ON public.partner_action_plans(correlation_id);

CREATE TABLE IF NOT EXISTS public.partner_action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.partner_action_plans(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  correlation_id uuid,
  event_type text NOT NULL,
  risk_level text,
  actor_id uuid,
  actor_email text,
  actor_role text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.partner_action_audit TO authenticated;
GRANT ALL ON public.partner_action_audit TO service_role;
ALTER TABLE public.partner_action_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner reads own action audit" ON public.partner_action_audit
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Partner inserts own action audit" ON public.partner_action_audit
  FOR INSERT TO authenticated
  WITH CHECK (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_partner_action_audit_action ON public.partner_action_audit(action_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_action_audit_partner ON public.partner_action_audit(partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.partner_autopilot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  goals text[] NOT NULL DEFAULT '{}',
  auto_allowed_types text[] NOT NULL DEFAULT '{}',
  max_risk_level text NOT NULL DEFAULT 'alacsony',
  max_price_change_pct numeric NOT NULL DEFAULT 10,
  max_auto_actions_per_day integer NOT NULL DEFAULT 3,
  notify_email boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_autopilot_settings TO authenticated;
GRANT ALL ON public.partner_autopilot_settings TO service_role;
ALTER TABLE public.partner_autopilot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner manages own autopilot" ON public.partner_autopilot_settings
  FOR ALL TO authenticated
  USING (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER partner_autopilot_settings_updated_at BEFORE UPDATE ON public.partner_autopilot_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();