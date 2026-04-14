ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS loyalty_tiers jsonb DEFAULT '[{"name":"Bronz","badge":"🥉","min_points":0,"discount_percent":0},{"name":"Ezüst","badge":"🥈","min_points":500,"discount_percent":5},{"name":"Arany","badge":"🥇","min_points":2000,"discount_percent":10},{"name":"Platina","badge":"💎","min_points":5000,"discount_percent":15}]'::jsonb,
  ADD COLUMN IF NOT EXISTS loyalty_badge_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_scheduling_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_auto_archive_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_seasonal_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_stacking_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_tier_pricing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_advanced_rules jsonb DEFAULT '[]'::jsonb;