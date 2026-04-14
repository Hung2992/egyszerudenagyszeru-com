ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS popup_banners jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS popup_exit_intent_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_rules_scheduled jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_rules_seasonal_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS supplier_management jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS supplier_auto_reorder_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_gamification jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS loyalty_badges_enabled boolean DEFAULT false;