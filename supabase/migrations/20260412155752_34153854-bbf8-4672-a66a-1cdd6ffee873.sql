
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS email_sequences_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sequences_settings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS shipping_zones_mgmt_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipping_zones_mgmt_settings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS giftcard_system_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS giftcard_system_settings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS product_recall_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_recall_settings jsonb DEFAULT '{}';
