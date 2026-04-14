ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS remarketing_automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS remarketing_automation_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS installment_payment_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_payment_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS product_ranking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_ranking_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_product_tagging_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_product_tagging_settings jsonb DEFAULT '{}'::jsonb;