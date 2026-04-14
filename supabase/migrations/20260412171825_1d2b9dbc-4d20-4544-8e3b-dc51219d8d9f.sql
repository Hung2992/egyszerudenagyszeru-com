ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS product_scheduling_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_scheduling_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_assurance_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_assurance_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS remarketing_automation_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS remarketing_automation_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS product_ranking_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_ranking_settings jsonb DEFAULT '{}'::jsonb;