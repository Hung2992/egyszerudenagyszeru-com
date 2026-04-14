
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS shipping_methods jsonb DEFAULT '[{"key":"courier","label":"Futárszolgálat","price":1490,"description":"1-2 munkanap","is_active":true},{"key":"parcel_point","label":"Csomagpont","price":990,"description":"2-3 munkanap","is_active":true},{"key":"personal","label":"Személyes átvétel","price":0,"description":"Üzletünkben","is_active":true}]'::jsonb,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auto_hide_out_of_stock boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_new_order boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_low_stock boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_new_review boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_company_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_tax_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_bank_account text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_address text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_header_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_footer_text text DEFAULT NULL;
