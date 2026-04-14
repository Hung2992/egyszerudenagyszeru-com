ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS shipping_cost_rules_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipping_cost_rules_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS inventory_movement_log_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_movement_log_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS loyalty_dashboard_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_dashboard_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dynamic_price_automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dynamic_price_automation_settings jsonb DEFAULT '{}'::jsonb;