ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS auto_reorder_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reorder_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS multichannel_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS multichannel_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_assurance_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_assurance_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS loyalty_analytics_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_analytics_settings jsonb DEFAULT '{}'::jsonb;