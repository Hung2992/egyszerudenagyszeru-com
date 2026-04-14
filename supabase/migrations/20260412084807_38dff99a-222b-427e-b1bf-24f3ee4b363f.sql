
-- Size profiles
CREATE TABLE IF NOT EXISTS public.user_size_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  top_size TEXT,
  bottom_size TEXT,
  shoe_size TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  body_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_size_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own size profile" ON public.user_size_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Community lookbooks
CREATE TABLE IF NOT EXISTS public.community_lookbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_urls TEXT[] DEFAULT '{}',
  product_ids UUID[] DEFAULT '{}',
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.community_lookbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read lookbooks" ON public.community_lookbooks FOR SELECT USING (true);
CREATE POLICY "Users create own lookbooks" ON public.community_lookbooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own lookbooks" ON public.community_lookbooks FOR DELETE USING (auth.uid() = user_id);

-- Auto reorders
CREATE TABLE IF NOT EXISTS public.auto_reorders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  interval_days INT NOT NULL DEFAULT 30,
  next_order_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.auto_reorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reorders" ON public.auto_reorders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Packaging preferences
CREATE TABLE IF NOT EXISTS public.packaging_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  packaging_type TEXT NOT NULL DEFAULT 'standard',
  gift_wrap BOOLEAN NOT NULL DEFAULT false,
  gift_message TEXT,
  eco_packaging BOOLEAN NOT NULL DEFAULT false,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.packaging_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own packaging prefs" ON public.packaging_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
