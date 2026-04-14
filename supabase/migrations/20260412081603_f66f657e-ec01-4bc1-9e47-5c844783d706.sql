
-- Review images
CREATE TABLE public.review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view review images" ON public.review_images FOR SELECT USING (true);
CREATE POLICY "Users can insert own review images" ON public.review_images FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_reviews WHERE id = review_id AND user_id = auth.uid()));

-- Gift wrap options
CREATE TABLE public.gift_wrap_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gift_wrap_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active gift wraps" ON public.gift_wrap_options FOR SELECT USING (is_active = true);

INSERT INTO public.gift_wrap_options (name, price, description, sort_order) VALUES
  ('Standard csomagolás', 490, 'Elegáns papír, szalaggal', 1),
  ('Prémium díszdoboz', 990, 'Márkázott díszdoboz, selyempapír', 2),
  ('Ajándéktasak + kártya', 690, 'Tasak egyedi üzenetkártyával', 3);

-- Product recommendations
CREATE TABLE public.product_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  score NUMERIC DEFAULT 1.0,
  recommendation_type TEXT DEFAULT 'similar' CHECK (recommendation_type IN ('similar','complementary','trending','bought_together')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, recommended_product_id)
);
ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read recommendations" ON public.product_recommendations FOR SELECT USING (true);

-- Order tracking
CREATE TABLE public.order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  description TEXT,
  carrier TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order tracking" ON public.order_tracking FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()));

-- Storage bucket for review images
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view review images storage" ON storage.objects FOR SELECT USING (bucket_id = 'review-images');
CREATE POLICY "Auth users can upload review images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'review-images' AND auth.role() = 'authenticated');
