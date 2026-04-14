ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS inventory_forecast_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_forecast_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS order_automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_automation_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS media_manager_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS media_manager_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS retention_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_settings jsonb DEFAULT '{}'::jsonb;