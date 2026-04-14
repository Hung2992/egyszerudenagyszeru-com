
-- Konverzió: A/B tesztek
CREATE TABLE public.conversion_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'ab_test',
  variants JSONB NOT NULL DEFAULT '[]',
  traffic_split JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  winner_variant TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversion_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage conversion tests" ON public.conversion_tests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Konverzió: Popup szabályok
CREATE TABLE public.popup_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  popup_type TEXT NOT NULL DEFAULT 'exit_intent',
  content JSONB NOT NULL DEFAULT '{}',
  conditions JSONB DEFAULT '{}',
  display_frequency TEXT DEFAULT 'once_per_session',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.popup_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage popup rules" ON public.popup_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Konverzió: Upsell/Cross-sell szabályok
CREATE TABLE public.upsell_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'upsell',
  source_product_id UUID,
  source_category TEXT,
  recommended_product_ids UUID[],
  discount_pct NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.upsell_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view upsell rules" ON public.upsell_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage upsell rules" ON public.upsell_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Többnyelvűség: Pénznem beállítások
CREATE TABLE public.currency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  decimal_places INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.currency_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view currencies" ON public.currency_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage currencies" ON public.currency_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Rendszer: Napló
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view system logs" ON public.system_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert logs" ON public.system_logs FOR INSERT WITH CHECK (true);

-- Rendszer: Karbantartási mód
CREATE TABLE public.maintenance_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT false,
  message TEXT DEFAULT 'A webshop karbantartás alatt áll. Kérjük, látogasson vissza később.',
  planned_end TIMESTAMPTZ,
  allowed_ips TEXT[],
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_mode ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view maintenance status" ON public.maintenance_mode FOR SELECT USING (true);
CREATE POLICY "Admins manage maintenance" ON public.maintenance_mode FOR ALL USING (public.has_role(auth.uid(), 'admin'));
