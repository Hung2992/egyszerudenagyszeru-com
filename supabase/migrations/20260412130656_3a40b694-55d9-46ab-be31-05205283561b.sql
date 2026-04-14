
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS loyalty_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_points_per_currency integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS loyalty_redemption_rate numeric DEFAULT 0.01,
  ADD COLUMN IF NOT EXISTS loyalty_levels jsonb DEFAULT '["Bronz","Ezüst","Arany","Platina"]'::jsonb,
  ADD COLUMN IF NOT EXISTS loyalty_expiry_months integer DEFAULT 12,

  ADD COLUMN IF NOT EXISTS shipping_zones jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_free_limit numeric DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS shipping_default_cost numeric DEFAULT 1490,
  ADD COLUMN IF NOT EXISTS shipping_methods jsonb DEFAULT '["Futár","Csomagpont","Személyes átvétel"]'::jsonb,

  ADD COLUMN IF NOT EXISTS seo_meta_title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_meta_description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_og_image text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_robots text DEFAULT 'index, follow',
  ADD COLUMN IF NOT EXISTS seo_sitemap_enabled boolean DEFAULT true,

  ADD COLUMN IF NOT EXISTS stock_alert_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS stock_alert_threshold integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS stock_alert_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS stock_auto_hide boolean DEFAULT false;
