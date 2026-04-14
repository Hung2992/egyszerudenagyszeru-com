
-- Package tracking
CREATE TABLE public.package_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  carrier TEXT NOT NULL DEFAULT 'GLS',
  tracking_number TEXT,
  tracking_url TEXT,
  status TEXT NOT NULL DEFAULT 'preparing',
  last_update TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.package_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tracking" ON public.package_tracking FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = package_tracking.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admin manage tracking" ON public.package_tracking FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Price drop alerts
CREATE TABLE public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  target_price INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own alerts" ON public.price_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own alerts" ON public.price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own alerts" ON public.price_alerts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own alerts" ON public.price_alerts FOR UPDATE USING (auth.uid() = user_id);

-- Followed brands
CREATE TABLE public.followed_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, brand_name)
);
ALTER TABLE public.followed_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own follows" ON public.followed_brands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own follows" ON public.followed_brands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own follows" ON public.followed_brands FOR DELETE USING (auth.uid() = user_id);
