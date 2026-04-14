ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS accounting_vat_rate numeric DEFAULT 27,
  ADD COLUMN IF NOT EXISTS accounting_invoice_prefix text DEFAULT 'INV-',
  ADD COLUMN IF NOT EXISTS accounting_auto_invoice boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS accounting_export_format text DEFAULT 'csv',
  ADD COLUMN IF NOT EXISTS multilang_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS multilang_default_language text DEFAULT 'hu',
  ADD COLUMN IF NOT EXISTS multilang_available_languages jsonb DEFAULT '["hu"]'::jsonb,
  ADD COLUMN IF NOT EXISTS multilang_auto_translate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_templates_custom jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS email_sender_domain text DEFAULT '',
  ADD COLUMN IF NOT EXISTS attribution_utm_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attribution_channels jsonb DEFAULT '["web","mobile","social"]'::jsonb;