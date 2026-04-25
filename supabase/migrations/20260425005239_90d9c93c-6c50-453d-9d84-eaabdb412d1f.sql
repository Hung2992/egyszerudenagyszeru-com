-- Tax rates table
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  country TEXT NOT NULL DEFAULT 'HU',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tax rates"
  ON public.tax_rates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active tax rates"
  ON public.tax_rates FOR SELECT
  TO public
  USING (is_active = true);

-- Invoice settings table (singleton-ish)
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix TEXT NOT NULL DEFAULT 'EDN',
  next_number INTEGER NOT NULL DEFAULT 1,
  company_name TEXT,
  company_address TEXT,
  company_tax_number TEXT,
  company_bank_account TEXT,
  footer_note TEXT,
  auto_generate BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invoice settings"
  ON public.invoice_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_tax_rates_updated ON public.tax_rates;
CREATE TRIGGER trg_tax_rates_updated BEFORE UPDATE ON public.tax_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_invoice_settings_updated ON public.invoice_settings;
CREATE TRIGGER trg_invoice_settings_updated BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default Hungarian VAT rates
INSERT INTO public.tax_rates (name, rate, country, is_default, is_active)
VALUES
  ('Normál ÁFA', 27, 'HU', true, true),
  ('Kedvezményes ÁFA', 18, 'HU', false, true),
  ('Kedvezményes ÁFA', 5, 'HU', false, true),
  ('Adómentes', 0, 'HU', false, true)
ON CONFLICT DO NOTHING;

-- Seed empty invoice settings if none
INSERT INTO public.invoice_settings (prefix)
SELECT 'EDN' WHERE NOT EXISTS (SELECT 1 FROM public.invoice_settings);