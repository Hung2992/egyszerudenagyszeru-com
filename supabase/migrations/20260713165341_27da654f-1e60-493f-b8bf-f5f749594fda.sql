
CREATE TABLE public.ai_stylist_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  occasion TEXT,
  style TEXT,
  budget_max NUMERIC,
  gender TEXT,
  size TEXT,
  user_prompt TEXT,
  ai_outfit JSONB,
  matched_products JSONB,
  total_price NUMERIC,
  tokens_used INTEGER,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  added_to_cart BOOLEAN NOT NULL DEFAULT false,
  purchased BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ai_stylist_sessions TO authenticated;
GRANT ALL ON public.ai_stylist_sessions TO service_role;

ALTER TABLE public.ai_stylist_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own stylist sessions"
  ON public.ai_stylist_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own stylist sessions"
  ON public.ai_stylist_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_ai_stylist_sessions_user ON public.ai_stylist_sessions(user_id, created_at DESC);
CREATE INDEX idx_ai_stylist_sessions_created ON public.ai_stylist_sessions(created_at DESC);
