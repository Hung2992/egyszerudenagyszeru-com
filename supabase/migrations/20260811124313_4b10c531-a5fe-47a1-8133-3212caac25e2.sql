ALTER TABLE public.partner_action_plans
  ADD COLUMN IF NOT EXISTS pre_rollback_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS integrity_check jsonb;