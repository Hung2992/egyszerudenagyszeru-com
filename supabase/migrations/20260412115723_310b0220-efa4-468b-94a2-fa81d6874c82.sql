
-- Language settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS lang_default text DEFAULT 'hu',
  ADD COLUMN IF NOT EXISTS lang_available text[] DEFAULT ARRAY['hu'],
  ADD COLUMN IF NOT EXISTS lang_auto_detect boolean NOT NULL DEFAULT false;

-- Discount rules
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS discount_quantity_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_quantity_rules jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS discount_vip_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_vip_tiers jsonb DEFAULT '[{"name":"Bronz","min_orders":5,"discount_pct":5},{"name":"Ezüst","min_orders":15,"discount_pct":10},{"name":"Arany","min_orders":30,"discount_pct":15}]'::jsonb,
  ADD COLUMN IF NOT EXISTS discount_auto_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_auto_min_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_auto_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_auto_type text DEFAULT 'percent';

-- Product list display
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS product_default_view text DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS product_grid_columns integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS product_items_per_page integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS product_default_sort text DEFAULT 'newest',
  ADD COLUMN IF NOT EXISTS product_quick_view_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_show_stock_badge boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_show_discount_badge boolean NOT NULL DEFAULT true;

-- Registration settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS reg_require_name boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reg_require_phone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reg_require_address boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reg_social_login_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reg_terms_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reg_welcome_message text DEFAULT 'Üdvözlünk a boltunkban! Köszönjük, hogy regisztráltál.';
