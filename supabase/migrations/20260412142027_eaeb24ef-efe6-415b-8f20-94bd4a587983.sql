ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS preorder_mgmt_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_mgmt_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS packaging_custom_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS packaging_custom_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS invoice_automation_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_automation_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS nps_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nps_settings jsonb DEFAULT '{}'::jsonb;