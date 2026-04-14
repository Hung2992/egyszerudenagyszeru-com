
CREATE TABLE public.preorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own preorders" ON public.preorders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own preorders" ON public.preorders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own preorders" ON public.preorders FOR DELETE USING (auth.uid() = user_id);
CREATE UNIQUE INDEX idx_preorders_unique ON public.preorders (user_id, product_id) WHERE status = 'pending';

CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'question',
  likes_count INT NOT NULL DEFAULT 0,
  replies_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.community_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read replies" ON public.community_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users create replies" ON public.community_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own replies" ON public.community_replies FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.size_quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  height INT NOT NULL,
  weight INT NOT NULL,
  body_type TEXT NOT NULL DEFAULT 'regular',
  chest INT,
  waist INT,
  hip INT,
  recommended_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.size_quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own quiz" ON public.size_quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own quiz" ON public.size_quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own quiz" ON public.size_quiz_results FOR UPDATE USING (auth.uid() = user_id);
