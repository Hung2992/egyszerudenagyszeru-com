
CREATE TABLE IF NOT EXISTS public.order_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  quantities INT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own order templates" ON public.order_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.locale_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  language TEXT NOT NULL DEFAULT 'hu',
  currency TEXT NOT NULL DEFAULT 'HUF',
  date_format TEXT NOT NULL DEFAULT 'YYYY.MM.DD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.locale_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own locale prefs" ON public.locale_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  username TEXT,
  profile_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own social links" ON public.social_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public social links viewable" ON public.social_links FOR SELECT USING (is_public = true);

CREATE TABLE IF NOT EXISTS public.brand_size_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_a TEXT NOT NULL,
  size_a TEXT NOT NULL,
  brand_b TEXT NOT NULL,
  size_b TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_size_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own size comparisons" ON public.brand_size_comparisons FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
