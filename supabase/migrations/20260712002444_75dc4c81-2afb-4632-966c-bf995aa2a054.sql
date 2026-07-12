
-- 1. USER GAMIFICATION
CREATE TABLE public.user_gamification (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  total_xp INT NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_login_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_gamification TO authenticated;
GRANT ALL ON public.user_gamification TO service_role;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gamification select" ON public.user_gamification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own gamification insert" ON public.user_gamification FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own gamification update" ON public.user_gamification FOR UPDATE USING (auth.uid() = user_id);

-- 2. USER BADGES
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own badges select" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own badges insert" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. DAILY QUESTS (globális küldetéskatalógus)
CREATE TABLE public.daily_quests (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INT NOT NULL DEFAULT 10,
  points_reward INT NOT NULL DEFAULT 0,
  quest_type TEXT NOT NULL DEFAULT 'daily',
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_quests TO authenticated, anon;
GRANT ALL ON public.daily_quests TO service_role;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests public read" ON public.daily_quests FOR SELECT USING (true);
CREATE POLICY "quests admin write" ON public.daily_quests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. QUEST COMPLETIONS
CREATE TABLE public.quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  quest_key TEXT NOT NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_earned INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_key, completed_date)
);
GRANT SELECT, INSERT ON public.quest_completions TO authenticated;
GRANT ALL ON public.quest_completions TO service_role;
ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own completions select" ON public.quest_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own completions insert" ON public.quest_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. PRODUCT BUNDLES
CREATE TABLE public.product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  discount_percent INT NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  min_items INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_bundles TO authenticated, anon;
GRANT ALL ON public.product_bundles TO service_role;
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundles public read" ON public.product_bundles FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bundles admin write" ON public.product_bundles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. FREQUENT PAIRS
CREATE TABLE public.product_frequent_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_a UUID NOT NULL,
  product_b UUID NOT NULL,
  co_occurrence INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_a, product_b)
);
GRANT SELECT ON public.product_frequent_pairs TO authenticated, anon;
GRANT ALL ON public.product_frequent_pairs TO service_role;
ALTER TABLE public.product_frequent_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pairs public read" ON public.product_frequent_pairs FOR SELECT USING (true);

-- 7. AI SHOPPING CONVERSATIONS
CREATE TABLE public.ai_shopping_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  session_id TEXT,
  user_message TEXT NOT NULL,
  assistant_message TEXT,
  recommended_product_ids UUID[] DEFAULT '{}',
  filters JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_shopping_conversations TO authenticated;
GRANT INSERT ON public.ai_shopping_conversations TO anon;
GRANT ALL ON public.ai_shopping_conversations TO service_role;
ALTER TABLE public.ai_shopping_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own convos select" ON public.ai_shopping_conversations FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "convos insert" ON public.ai_shopping_conversations FOR INSERT WITH CHECK (true);

-- 8. MARKETING SEGMENTS
CREATE TABLE public.marketing_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  user_count INT NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL DEFAULT '{}',
  suggested_campaign JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketing_segments TO authenticated;
GRANT ALL ON public.marketing_segments TO service_role;
ALTER TABLE public.marketing_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "segments admin read" ON public.marketing_segments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "segments admin write" ON public.marketing_segments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_gami_upd BEFORE UPDATE ON public.user_gamification FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_bundle_upd BEFORE UPDATE ON public.product_bundles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_seg_upd BEFORE UPDATE ON public.marketing_segments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed daily quests
INSERT INTO public.daily_quests (key, title, description, xp_reward, points_reward, icon, sort_order) VALUES
('daily_login', 'Napi bejelentkezés', 'Jelentkezz be minden nap!', 10, 5, 'calendar', 1),
('browse_products', 'Böngéssz 3 terméket', 'Nézz meg legalább 3 termékoldalt', 15, 0, 'eye', 2),
('add_to_wishlist', 'Adj hozzá 1 kedvencet', 'Ments el egy terméket a kívánságlistára', 20, 10, 'heart', 3),
('write_review', 'Írj egy értékelést', 'Értékelj egy már megvásárolt terméket', 50, 50, 'star', 4),
('share_product', 'Ossz meg egy terméket', 'Küldd el barátodnak egy termék linkjét', 25, 15, 'share', 5),
('complete_purchase', 'Vásárolj', 'Fejezz be egy rendelést', 100, 100, 'shopping-bag', 6),
('use_size_quiz', 'Töltsd ki a mérettáblát', 'Használd a mérettanácsadót', 15, 5, 'ruler', 7);
