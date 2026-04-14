
-- Fulfillment settings
CREATE TABLE IF NOT EXISTS public.fulfillment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_name TEXT NOT NULL,
  tracking_url_template TEXT,
  packaging_type TEXT DEFAULT 'standard',
  auto_tracking_email BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fulfillment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fulfillment" ON public.fulfillment_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read fulfillment" ON public.fulfillment_settings FOR SELECT TO anon USING (is_active = true);

-- Sales rules (bundles, cross-sell, upsell, auto discounts)
CREATE TABLE IF NOT EXISTS public.sales_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'auto_discount',
  conditions JSONB DEFAULT '{}',
  action JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access sales_rules" ON public.sales_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Product attributes for filtering
CREATE TABLE IF NOT EXISTS public.product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  attribute_type TEXT NOT NULL DEFAULT 'select',
  possible_values TEXT[] DEFAULT '{}',
  category_filter TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access product_attributes" ON public.product_attributes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read product_attributes" ON public.product_attributes FOR SELECT TO anon USING (is_active = true);

-- Wishlists
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.shop_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlists" ON public.wishlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
