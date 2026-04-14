ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS returns_automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS returns_automation_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_segmentation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_segmentation_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dynamic_pricing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dynamic_pricing_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_zones_mgmt_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipping_zones_mgmt_settings jsonb DEFAULT '{}'::jsonb;