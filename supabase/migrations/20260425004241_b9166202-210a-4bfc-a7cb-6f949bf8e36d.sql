
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS vat_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 27,
  ADD COLUMN IF NOT EXISTS vat_mode text NOT NULL DEFAULT 'gross',
  ADD COLUMN IF NOT EXISTS price_display_mode text NOT NULL DEFAULT 'gross',
  ADD COLUMN IF NOT EXISTS vat_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_exempt_reason text DEFAULT 'AAM (alanyi adómentes)',
  ADD COLUMN IF NOT EXISTS reverse_charge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accounting_vat_rate numeric DEFAULT 27,
  ADD COLUMN IF NOT EXISTS accounting_invoice_prefix text DEFAULT 'INV-',
  ADD COLUMN IF NOT EXISTS accounting_auto_invoice boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS accounting_export_format text DEFAULT 'csv';
