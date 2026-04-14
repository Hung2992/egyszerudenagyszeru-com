
-- Store settings extensions
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS custom_order_statuses jsonb DEFAULT '[{"key":"pending","label":"Függőben","color":"yellow"},{"key":"processing","label":"Feldolgozás","color":"blue"},{"key":"packed","label":"Csomagolva","color":"orange"},{"key":"shipped","label":"Elküldve","color":"purple"},{"key":"delivered","label":"Kézbesítve","color":"green"},{"key":"cancelled","label":"Törölve","color":"red"}]'::jsonb,
  ADD COLUMN IF NOT EXISTS size_chart_template text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS return_policy text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warranty_info text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS loyalty_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_points_per_currency integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS loyalty_discount_per_points integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS loyalty_min_redeem integer DEFAULT 500,
  ADD COLUMN IF NOT EXISTS reviews_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS reviews_require_approval boolean DEFAULT true;

-- Product reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  is_approved boolean DEFAULT false,
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
  ON public.product_reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Admins can view all reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create reviews"
  ON public.product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update reviews"
  ON public.product_reviews FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reviews"
  ON public.product_reviews FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Loyalty points table
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  source text NOT NULL DEFAULT 'purchase',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points"
  ON public.loyalty_points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points"
  ON public.loyalty_points FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage points"
  ON public.loyalty_points FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON public.product_reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON public.loyalty_points(user_id);
