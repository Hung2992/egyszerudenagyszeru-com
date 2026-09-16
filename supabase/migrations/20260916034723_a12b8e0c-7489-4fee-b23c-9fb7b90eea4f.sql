ALTER TABLE public.partner_storefronts
  ADD COLUMN IF NOT EXISTS payment_methods jsonb NOT NULL DEFAULT '["cod","transfer"]'::jsonb,
  ADD COLUMN IF NOT EXISTS bank_account_holder text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_iban text,
  ADD COLUMN IF NOT EXISTS payment_instructions text;

ALTER TABLE public.partner_orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;