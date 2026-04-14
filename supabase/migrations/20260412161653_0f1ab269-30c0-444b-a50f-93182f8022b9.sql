ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS crosssell_upsell_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS crosssell_upsell_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS customer_surveys_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_surveys_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS order_workflow_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS order_workflow_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS product_badges_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS product_badges_settings jsonb DEFAULT '{}'::jsonb;