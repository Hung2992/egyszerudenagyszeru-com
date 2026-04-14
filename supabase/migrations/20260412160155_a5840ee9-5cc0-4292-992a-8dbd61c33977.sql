ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS popup_banner_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS popup_banner_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS customer_segmentation_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_segmentation_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS dynamic_pricing_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dynamic_pricing_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS product_scheduling_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS product_scheduling_settings jsonb DEFAULT '{}'::jsonb;