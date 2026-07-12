
CREATE TABLE IF NOT EXISTS public.voice_shopping_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transcript text NOT NULL,
  response_text text,
  intent_category text,
  intent_color text,
  intent_size text,
  intent_max_price numeric,
  clicked_product_ids uuid[] DEFAULT '{}',
  added_to_cart boolean DEFAULT false,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.voice_shopping_queries TO authenticated;
GRANT INSERT ON public.voice_shopping_queries TO anon;
GRANT ALL ON public.voice_shopping_queries TO service_role;

ALTER TABLE public.voice_shopping_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vs_insert_all" ON public.voice_shopping_queries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "vs_select_own" ON public.voice_shopping_queries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "vs_update_own" ON public.voice_shopping_queries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS voice_shopping_queries_created_at_idx
  ON public.voice_shopping_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS voice_shopping_queries_user_idx
  ON public.voice_shopping_queries(user_id);
