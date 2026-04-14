ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS product_feed_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_feed_channels jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_group_pricing jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS b2b_pricing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seo_advanced_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_sitemap_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS erp_sync_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS erp_sync_enabled boolean DEFAULT false;