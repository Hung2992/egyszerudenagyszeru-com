ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS popup_banner_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_banner_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_zones_mgmt_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipping_zones_mgmt_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS returns_mgmt_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS returns_mgmt_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS product_scheduling_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_scheduling_settings jsonb DEFAULT '{}'::jsonb;