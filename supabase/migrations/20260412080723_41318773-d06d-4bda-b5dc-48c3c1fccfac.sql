
-- Wishlist sharing
CREATE TABLE public.wishlist_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  title TEXT DEFAULT 'Kívánságlistám',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.wishlist_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public shares" ON public.wishlist_shares FOR SELECT USING (is_public = true);
CREATE POLICY "Users manage own shares" ON public.wishlist_shares FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enhanced coupons
CREATE TABLE public.enhanced_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed','free_shipping','first_purchase')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  first_purchase_only BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.enhanced_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active coupons" ON public.enhanced_coupons FOR SELECT USING (is_active = true);

-- Loyalty tiers
CREATE TABLE public.loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  discount_percentage NUMERIC DEFAULT 0,
  free_shipping BOOLEAN DEFAULT false,
  early_access BOOLEAN DEFAULT false,
  icon TEXT DEFAULT '⭐',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tiers" ON public.loyalty_tiers FOR SELECT USING (true);

INSERT INTO public.loyalty_tiers (name, min_points, discount_percentage, free_shipping, early_access, icon, sort_order) VALUES
  ('Bronze', 0, 0, false, false, '🥉', 1),
  ('Ezüst', 500, 5, false, false, '🥈', 2),
  ('Arany', 1500, 10, true, false, '🥇', 3),
  ('VIP', 5000, 15, true, true, '💎', 4);
