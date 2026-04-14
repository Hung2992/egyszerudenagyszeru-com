ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS loyalty_points_rules_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS loyalty_points_rules_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS product_compare_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS product_compare_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS coupon_rules_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS coupon_rules_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS stock_alert_auto_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_alert_auto_settings jsonb DEFAULT '{}'::jsonb;