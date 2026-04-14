ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS product_scheduling_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_scheduling_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_assurance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_assurance_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS product_recall_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_recall_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS order_consolidation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_consolidation_settings jsonb DEFAULT '{}'::jsonb;