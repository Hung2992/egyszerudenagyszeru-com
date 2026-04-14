ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS checkout_custom_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkout_custom_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recommendation_engine_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommendation_engine_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS gdpr_center_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gdpr_center_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS webhook_events_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_events_settings jsonb DEFAULT '{}'::jsonb;