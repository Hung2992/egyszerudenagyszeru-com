ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS order_consolidation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_consolidation_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS loyalty_automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_automation_settings jsonb DEFAULT '{}'::jsonb;