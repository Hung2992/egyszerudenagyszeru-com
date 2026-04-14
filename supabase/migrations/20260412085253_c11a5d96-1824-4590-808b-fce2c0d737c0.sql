
-- Low stock alerts
CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  threshold INT NOT NULL DEFAULT 5,
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stock alerts" ON public.low_stock_alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Style preferences
CREATE TABLE IF NOT EXISTS public.style_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  favorite_colors TEXT[] DEFAULT '{}',
  favorite_styles TEXT[] DEFAULT '{}',
  avoid_colors TEXT[] DEFAULT '{}',
  avoid_styles TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.style_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own style prefs" ON public.style_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Digital receipts
CREATE TABLE IF NOT EXISTS public.digital_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID,
  receipt_email TEXT,
  receipt_type TEXT NOT NULL DEFAULT 'digital',
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.digital_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own receipts" ON public.digital_receipts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Also store user preference for digital receipts
CREATE TABLE IF NOT EXISTS public.receipt_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_digital_preferred BOOLEAN NOT NULL DEFAULT true,
  receipt_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.receipt_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own receipt prefs" ON public.receipt_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Budget settings
CREATE TABLE IF NOT EXISTS public.budget_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  monthly_budget NUMERIC NOT NULL DEFAULT 0,
  current_spent NUMERIC NOT NULL DEFAULT 0,
  alert_threshold_percent INT NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reset_day INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget" ON public.budget_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
