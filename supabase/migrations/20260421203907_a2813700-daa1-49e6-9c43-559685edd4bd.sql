-- Termék variánsok (méret/szín kombinációk)
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  size TEXT,
  color TEXT,
  sku TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  preorder_limit INTEGER,
  preorder_count INTEGER NOT NULL DEFAULT 0,
  price_modifier NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, size, color)
);

CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_active ON public.product_variants(product_id, is_active);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active variants"
  ON public.product_variants FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Méret-táblázat (cm-ben)
CREATE TABLE public.product_size_chart (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  chest_cm NUMERIC,
  waist_cm NUMERIC,
  hip_cm NUMERIC,
  length_cm NUMERIC,
  shoulder_cm NUMERIC,
  sleeve_cm NUMERIC,
  inseam_cm NUMERIC,
  extra_measurements JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, size)
);

CREATE INDEX idx_size_chart_product ON public.product_size_chart(product_id);

ALTER TABLE public.product_size_chart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read size chart"
  ON public.product_size_chart FOR SELECT
  USING (true);

CREATE POLICY "Admins manage size chart"
  ON public.product_size_chart FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Termék kiegészítő mezők
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS material TEXT,
  ADD COLUMN IF NOT EXISTS care_instructions TEXT,
  ADD COLUMN IF NOT EXISTS origin_country TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS size_chart_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS has_variants BOOLEAN NOT NULL DEFAULT false;

-- Pre-order kapcsolat a variánssal
ALTER TABLE public.product_preorders
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_size TEXT,
  ADD COLUMN IF NOT EXISTS selected_color TEXT;

-- Trigger: variáns preorder szám frissítése
CREATE OR REPLACE FUNCTION public.update_variant_preorder_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.variant_id IS NOT NULL THEN
    UPDATE product_variants
      SET preorder_count = preorder_count + NEW.quantity
      WHERE id = NEW.variant_id;
  ELSIF TG_OP = 'DELETE' AND OLD.variant_id IS NOT NULL THEN
    UPDATE product_variants
      SET preorder_count = GREATEST(0, preorder_count - OLD.quantity)
      WHERE id = OLD.variant_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_variant_preorder_counter
  AFTER INSERT OR DELETE ON public.product_preorders
  FOR EACH ROW EXECUTE FUNCTION public.update_variant_preorder_count();