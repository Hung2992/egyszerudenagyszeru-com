
-- =========================
-- ai_pricing_rules
-- =========================
CREATE TABLE public.ai_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  max_discount_percent numeric(5,2) NOT NULL DEFAULT 10.00,
  min_margin_percent numeric(5,2) NOT NULL DEFAULT 15.00,
  min_cart_value numeric(12,2) NOT NULL DEFAULT 0,
  offer_ttl_minutes int NOT NULL DEFAULT 30,
  allow_on_sale_products boolean NOT NULL DEFAULT false,
  allow_on_new_products boolean NOT NULL DEFAULT false,
  allow_on_clearance boolean NOT NULL DEFAULT true,
  allowed_categories text[] NOT NULL DEFAULT '{}',
  blocked_categories text[] NOT NULL DEFAULT '{}',
  eligible_customer_tags text[] NOT NULL DEFAULT '{}',
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_pricing_rules TO anon, authenticated;
GRANT ALL ON public.ai_pricing_rules TO service_role;
ALTER TABLE public.ai_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pricing rules"
  ON public.ai_pricing_rules FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage pricing rules"
  ON public.ai_pricing_rules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_pricing_rules_updated
  BEFORE UPDATE ON public.ai_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- ai_price_offers
-- =========================
CREATE TABLE public.ai_price_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  product_id uuid,
  product_name text,
  original_price numeric(12,2) NOT NULL,
  offered_price numeric(12,2) NOT NULL,
  discount_percent numeric(5,2) NOT NULL,
  rule_id uuid REFERENCES public.ai_pricing_rules(id) ON DELETE SET NULL,
  coupon_code text,
  reasoning text,
  cart_value numeric(12,2),
  expires_at timestamptz NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_price_offers_user ON public.ai_price_offers(user_id, created_at DESC);
CREATE INDEX idx_ai_price_offers_product ON public.ai_price_offers(product_id);
CREATE INDEX idx_ai_price_offers_coupon ON public.ai_price_offers(coupon_code);

GRANT SELECT, INSERT, UPDATE ON public.ai_price_offers TO authenticated;
GRANT ALL ON public.ai_price_offers TO service_role;
ALTER TABLE public.ai_price_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own offers"
  ON public.ai_price_offers FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own offers to accept"
  ON public.ai_price_offers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all offers"
  ON public.ai_price_offers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- ai_pricing_events (audit)
-- =========================
CREATE TABLE public.ai_pricing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  product_id uuid,
  requested_discount_percent numeric(5,2),
  granted boolean NOT NULL DEFAULT false,
  rule_id uuid REFERENCES public.ai_pricing_rules(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.ai_price_offers(id) ON DELETE SET NULL,
  reason text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_pricing_events_created ON public.ai_pricing_events(created_at DESC);
CREATE INDEX idx_ai_pricing_events_user ON public.ai_pricing_events(user_id);

GRANT ALL ON public.ai_pricing_events TO service_role;
ALTER TABLE public.ai_pricing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read pricing events"
  ON public.ai_pricing_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Seed default rule
-- =========================
INSERT INTO public.ai_pricing_rules (name, description, priority, max_discount_percent, min_margin_percent, min_cart_value, offer_ttl_minutes, allow_on_sale_products, allow_on_new_products, allow_on_clearance)
VALUES
  ('Alap kedvezmény szabály', 'Standard AI áralku beállítás – max 10% engedmény, 15% margin védelem, 30 perc érvényesség.', 100, 10.00, 15.00, 0, 30, false, false, true),
  ('Kifutó készlet – erősebb ajánlat', 'Kifutó készletű termékekre 15% engedmény adható 15 perces érvényességgel.', 50, 15.00, 8.00, 0, 15, false, false, true);
