
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS review_moderation_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_moderation_settings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS multi_warehouse_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS multi_warehouse_settings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS product_seo_manager_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_seo_manager_settings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS csat_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS csat_settings jsonb DEFAULT '{}';
