
-- Store settings table (single-row config)
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'My Store',
  logo_url text,
  currency text NOT NULL DEFAULT 'HUF',
  shipping_fee numeric NOT NULL DEFAULT 1490,
  free_shipping_above numeric DEFAULT NULL,
  contact_email text,
  contact_phone text,
  contact_address text,
  -- Payment toggles
  payment_cash_enabled boolean NOT NULL DEFAULT true,
  payment_card_enabled boolean NOT NULL DEFAULT true,
  payment_cod_enabled boolean NOT NULL DEFAULT true,
  -- Email notification toggles
  email_order_confirmation boolean NOT NULL DEFAULT true,
  email_shipping_notification boolean NOT NULL DEFAULT true,
  email_coupon_notification boolean NOT NULL DEFAULT false,
  -- Social
  social_facebook text,
  social_instagram text,
  social_tiktok text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Public read for store name, currency etc
CREATE POLICY "Anyone can read store settings"
ON public.store_settings FOR SELECT USING (true);

-- Only admins can update
CREATE POLICY "Admins can update store settings"
ON public.store_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert store settings"
ON public.store_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.store_settings (store_name, currency, shipping_fee) 
VALUES ('My Store', 'HUF', 1490);
