ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS margin_management_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS margin_management_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS satisfaction_automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS satisfaction_automation_settings jsonb DEFAULT '{}'::jsonb;