ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS product_variants_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_variants_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS loyalty_rewards_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_rewards_settings jsonb DEFAULT '{}'::jsonb;