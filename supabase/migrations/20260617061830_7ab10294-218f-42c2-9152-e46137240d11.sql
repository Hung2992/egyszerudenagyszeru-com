
-- ============== STORE SETTINGS BŐVÍTÉS ==============
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS partner_platform_fee_pct numeric NOT NULL DEFAULT 10;

-- ============== PARTNER STOREFRONTS ==============
CREATE TABLE IF NOT EXISTS public.partner_storefronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  tagline text,
  about_html text,
  -- branding
  logo_url text,
  banner_url text,
  primary_color text DEFAULT '#000000',
  accent_color text DEFAULT '#D4AF37',
  bg_color text DEFAULT '#0a0a0a',
  text_color text DEFAULT '#ffffff',
  font_heading text DEFAULT 'Space Grotesk',
  font_body text DEFAULT 'Inter',
  theme_preset text DEFAULT 'dark_minimal',
  -- hero
  hero_title text,
  hero_subtitle text,
  hero_cta_text text DEFAULT 'Vásárolj most',
  hero_image_url text,
  -- social
  instagram_url text,
  tiktok_url text,
  facebook_url text,
  youtube_url text,
  -- seo
  meta_title text,
  meta_description text,
  og_image_url text,
  -- publishing
  is_published boolean NOT NULL DEFAULT false,
  publish_requested_at timestamptz,
  published_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_storefronts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_storefronts TO authenticated;
GRANT ALL ON public.partner_storefronts TO service_role;

ALTER TABLE public.partner_storefronts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published storefronts"
  ON public.partner_storefronts FOR SELECT
  USING (is_published = true);

CREATE POLICY "Partners can view own storefront"
  ON public.partner_storefronts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Partners can insert own storefront"
  ON public.partner_storefronts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid() AND p.status = 'active'));

CREATE POLICY "Partners can update own storefront fields"
  ON public.partner_storefronts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins manage all storefronts"
  ON public.partner_storefronts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_partner_storefronts_updated
  BEFORE UPDATE ON public.partner_storefronts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: partner soha nem publikálhatja saját magát
CREATE OR REPLACE FUNCTION public.enforce_storefront_publish_admin_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.is_published IS DISTINCT FROM OLD.is_published
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change publish status';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.is_published = true
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.is_published := false;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_storefront_publish_guard
  BEFORE INSERT OR UPDATE ON public.partner_storefronts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_storefront_publish_admin_only();

-- ============== PARTNER PRODUCTS ==============
DO $$ BEGIN
  CREATE TYPE public.partner_product_status AS ENUM ('draft','pending_review','active','paused','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.partner_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  price_huf integer NOT NULL CHECK (price_huf >= 0),
  compare_price_huf integer,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text,
  tags text[] DEFAULT ARRAY[]::text[],
  stock_qty integer NOT NULL DEFAULT 0,
  sku text,
  weight_g integer,
  material text,
  origin_country text,
  status public.partner_product_status NOT NULL DEFAULT 'draft',
  rejection_reason text,
  view_count integer NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id, slug)
);

GRANT SELECT ON public.partner_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_products TO authenticated;
GRANT ALL ON public.partner_products TO service_role;

ALTER TABLE public.partner_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views active products"
  ON public.partner_products FOR SELECT
  USING (status = 'active');

CREATE POLICY "Partners view own products"
  ON public.partner_products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Partners insert own products"
  ON public.partner_products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid() AND p.status = 'active'));

CREATE POLICY "Partners update own products"
  ON public.partner_products FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Partners delete own products"
  ON public.partner_products FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins manage all partner products"
  ON public.partner_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_partner_products_updated
  BEFORE UPDATE ON public.partner_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Csak admin állíthat aktív státuszra
CREATE OR REPLACE FUNCTION public.enforce_product_status_admin_for_active()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('active','rejected')
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can activate or reject products';
  END IF;
  IF NEW.status = 'pending_review' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending_review') THEN
    NEW.submitted_at := now();
  END IF;
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_partner_product_status_guard
  BEFORE INSERT OR UPDATE ON public.partner_products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_status_admin_for_active();

-- ============== PARTNER PRODUCT VARIANTS ==============
CREATE TABLE IF NOT EXISTS public.partner_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.partner_products(id) ON DELETE CASCADE,
  size text,
  color text,
  stock_qty integer NOT NULL DEFAULT 0,
  price_override_huf integer,
  sku text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_product_variants TO authenticated;
GRANT ALL ON public.partner_product_variants TO service_role;

ALTER TABLE public.partner_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views variants of active products"
  ON public.partner_product_variants FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.partner_products pp WHERE pp.id = product_id AND pp.status = 'active'));

CREATE POLICY "Partners manage own product variants"
  ON public.partner_product_variants FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_products pp
    JOIN public.partners p ON p.id = pp.partner_id
    WHERE pp.id = product_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.partner_products pp
    JOIN public.partners p ON p.id = pp.partner_id
    WHERE pp.id = product_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage all variants"
  ON public.partner_product_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_partner_variants_updated
  BEFORE UPDATE ON public.partner_product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== PARTNER ORDERS ==============
CREATE TABLE IF NOT EXISTS public.partner_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  order_number text NOT NULL UNIQUE,
  customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  billing_address jsonb DEFAULT '{}'::jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_huf integer NOT NULL DEFAULT 0,
  shipping_huf integer NOT NULL DEFAULT 0,
  total_huf integer NOT NULL DEFAULT 0,
  platform_fee_pct numeric NOT NULL DEFAULT 10,
  platform_fee_huf integer NOT NULL DEFAULT 0,
  partner_payout_huf integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_status text DEFAULT 'pending',
  stripe_payment_intent text,
  tracking_number text,
  carrier text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_orders TO authenticated;
GRANT ALL ON public.partner_orders TO service_role;

ALTER TABLE public.partner_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own orders"
  ON public.partner_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Customers view own orders"
  ON public.partner_orders FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

CREATE POLICY "Partners update own order status"
  ON public.partner_orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins manage all partner orders"
  ON public.partner_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_partner_orders_updated
  BEFORE UPDATE ON public.partner_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-calculate fees and order number
CREATE OR REPLACE FUNCTION public.partner_order_compute_fees()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_default_pct numeric;
  v_slug text;
  v_seq integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(partner_platform_fee_pct, 10) INTO v_default_pct FROM public.store_settings LIMIT 1;
    IF NEW.platform_fee_pct IS NULL OR NEW.platform_fee_pct = 0 THEN
      NEW.platform_fee_pct := COALESCE(v_default_pct, 10);
    END IF;
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
      SELECT s.slug INTO v_slug FROM public.partner_storefronts s WHERE s.partner_id = NEW.partner_id;
      SELECT COUNT(*) + 1 INTO v_seq FROM public.partner_orders WHERE partner_id = NEW.partner_id;
      NEW.order_number := 'P-' || COALESCE(v_slug, substr(NEW.partner_id::text, 1, 8)) || '-' || LPAD(v_seq::text, 5, '0');
    END IF;
  END IF;
  NEW.total_huf := COALESCE(NEW.subtotal_huf, 0) + COALESCE(NEW.shipping_huf, 0);
  NEW.platform_fee_huf := FLOOR(NEW.total_huf * NEW.platform_fee_pct / 100)::integer;
  NEW.partner_payout_huf := NEW.total_huf - NEW.platform_fee_huf;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_partner_order_compute_fees
  BEFORE INSERT OR UPDATE OF subtotal_huf, shipping_huf, platform_fee_pct ON public.partner_orders
  FOR EACH ROW EXECUTE FUNCTION public.partner_order_compute_fees();

-- ============== STOREFRONT SETTINGS ==============
CREATE TABLE IF NOT EXISTS public.partner_storefront_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  shipping_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping_rates jsonb NOT NULL DEFAULT '[]'::jsonb,
  accept_cod boolean NOT NULL DEFAULT false,
  accept_card boolean NOT NULL DEFAULT true,
  min_order_huf integer DEFAULT 0,
  free_shipping_threshold_huf integer,
  return_policy_html text,
  shipping_policy_html text,
  bank_account_for_payouts text,
  vat_number text,
  vat_included boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_storefront_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_storefront_settings TO authenticated;
GRANT ALL ON public.partner_storefront_settings TO service_role;

ALTER TABLE public.partner_storefront_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view storefront settings of published stores"
  ON public.partner_storefront_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.partner_storefronts s WHERE s.partner_id = partner_storefront_settings.partner_id AND s.is_published = true));

CREATE POLICY "Partners manage own storefront settings"
  ON public.partner_storefront_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins manage all storefront settings"
  ON public.partner_storefront_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_partner_storefront_settings_updated
  BEFORE UPDATE ON public.partner_storefront_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== INDEXES ==============
CREATE INDEX IF NOT EXISTS idx_partner_products_partner_status ON public.partner_products(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_orders_partner_status ON public.partner_orders(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_storefronts_published ON public.partner_storefronts(is_published) WHERE is_published = true;
