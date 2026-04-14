
-- Kedvenc átvételi pontok
CREATE TABLE IF NOT EXISTS public.favorite_pickup_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.favorite_pickup_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pickup points" ON public.favorite_pickup_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pickup points" ON public.favorite_pickup_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pickup points" ON public.favorite_pickup_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own pickup points" ON public.favorite_pickup_points FOR DELETE USING (auth.uid() = user_id);

-- Termék várólisták
CREATE TABLE IF NOT EXISTS public.product_waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  position INTEGER,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, user_id)
);
ALTER TABLE public.product_waitlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own waitlist" ON public.product_waitlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users join waitlist" ON public.product_waitlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave waitlist" ON public.product_waitlists FOR DELETE USING (auth.uid() = user_id);

-- Szavazások
CREATE TABLE IF NOT EXISTS public.product_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.product_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active polls" ON public.product_polls FOR SELECT USING (is_active = true);

-- Szavazatok
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.product_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own votes" ON public.poll_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Személyre szabott ajánlatok
CREATE TABLE IF NOT EXISTS public.personalized_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_percent NUMERIC,
  discount_amount NUMERIC,
  coupon_code TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  valid_until TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.personalized_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own offers" ON public.personalized_offers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own offers" ON public.personalized_offers FOR UPDATE USING (auth.uid() = user_id);
