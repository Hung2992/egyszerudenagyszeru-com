ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS feedback_campaigns_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedback_campaigns_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS bundle_deals_mgmt_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bundle_deals_mgmt_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS invoice_generator_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_generator_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS personalized_recommendations_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS personalized_recommendations_settings jsonb DEFAULT '{}'::jsonb;