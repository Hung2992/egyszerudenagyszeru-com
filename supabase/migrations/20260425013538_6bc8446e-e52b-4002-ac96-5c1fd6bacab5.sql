ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS cookie_policy text,
  ADD COLUMN IF NOT EXISTS withdrawal_policy text,
  ADD COLUMN IF NOT EXISTS shipping_policy text,
  ADD COLUMN IF NOT EXISTS warranty_policy text,
  ADD COLUMN IF NOT EXISTS imprint text,
  ADD COLUMN IF NOT EXISTS legal_disclaimer text,
  ADD COLUMN IF NOT EXISTS legal_require_consent_register boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS legal_require_consent_checkout boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS legal_show_in_footer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS legal_version text DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS legal_effective_date date;