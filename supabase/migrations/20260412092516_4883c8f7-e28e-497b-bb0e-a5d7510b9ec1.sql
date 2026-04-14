
-- Vélemény-ösztönző
CREATE TABLE public.review_incentives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID,
  review_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  reward_code TEXT,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.review_incentives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own review incentives" ON public.review_incentives FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Limitált termék előjegyzés
CREATE TABLE public.product_preorders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID,
  notify_email TEXT,
  status TEXT DEFAULT 'waiting',
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.product_preorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own preorders" ON public.product_preorders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Hűségpont beváltási szabályok (admin kezeli, vásárló olvassa)
CREATE TABLE public.loyalty_redemption_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  points_required INTEGER NOT NULL DEFAULT 0,
  reward_type TEXT DEFAULT 'discount',
  reward_value NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  min_order_amount NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_redemption_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active rules" ON public.loyalty_redemption_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage rules" ON public.loyalty_redemption_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- AI méretajánlások
CREATE TABLE public.ai_size_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID,
  recommended_size TEXT,
  confidence_score NUMERIC,
  based_on_orders INTEGER DEFAULT 0,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_size_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own size recommendations" ON public.ai_size_recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
