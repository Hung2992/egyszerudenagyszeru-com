
-- Price alerts
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID,
  product_name TEXT,
  target_price NUMERIC NOT NULL,
  current_price NUMERIC,
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own price alerts" ON public.price_alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Material preferences
CREATE TABLE IF NOT EXISTS public.material_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  sensitive_materials TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.material_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own material prefs" ON public.material_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Birthday discounts
CREATE TABLE IF NOT EXISTS public.birthday_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  birthday DATE,
  discount_code TEXT,
  discount_percent INT DEFAULT 10,
  last_sent_year INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.birthday_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own birthday discount" ON public.birthday_discounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Gift wrapping preferences
CREATE TABLE IF NOT EXISTS public.gift_wrapping_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  wrapping_style TEXT DEFAULT 'classic',
  default_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.gift_wrapping_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gift wrapping" ON public.gift_wrapping_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
