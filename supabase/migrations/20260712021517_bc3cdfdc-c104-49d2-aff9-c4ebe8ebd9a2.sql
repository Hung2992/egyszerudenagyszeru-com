
CREATE TABLE IF NOT EXISTS public.product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  embedding vector(3072),
  visual_tags JSONB DEFAULT '{}'::jsonb,
  model TEXT NOT NULL DEFAULT 'google/gemini-embedding-2',
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, image_url)
);

GRANT SELECT ON public.product_embeddings TO authenticated, anon;
GRANT ALL ON public.product_embeddings TO service_role;
ALTER TABLE public.product_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_embeddings public read"
ON public.product_embeddings FOR SELECT
USING (true);

CREATE POLICY "product_embeddings admin manage"
ON public.product_embeddings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS product_embeddings_hnsw_idx
  ON public.product_embeddings
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

CREATE INDEX IF NOT EXISTS product_embeddings_product_idx ON public.product_embeddings(product_id);
CREATE INDEX IF NOT EXISTS product_embeddings_status_idx ON public.product_embeddings(status);

CREATE TABLE IF NOT EXISTS public.visual_search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  uploaded_image_url TEXT,
  detected_category TEXT,
  detected_colors JSONB,
  visual_tags JSONB,
  ai_description TEXT,
  top_matches JSONB,
  result_count INT DEFAULT 0,
  top_similarity NUMERIC,
  no_results BOOLEAN DEFAULT false,
  clicked_product_id UUID,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.visual_search_queries TO authenticated;
GRANT INSERT ON public.visual_search_queries TO anon;
GRANT ALL ON public.visual_search_queries TO service_role;
ALTER TABLE public.visual_search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visual_search_queries own read"
ON public.visual_search_queries FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "visual_search_queries insert"
ON public.visual_search_queries FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "visual_search_queries update own click"
ON public.visual_search_queries FOR UPDATE
TO authenticated, anon
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS visual_search_queries_user_idx ON public.visual_search_queries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS visual_search_queries_created_idx ON public.visual_search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS visual_search_queries_no_results_idx ON public.visual_search_queries(no_results) WHERE no_results = true;

CREATE OR REPLACE FUNCTION public.match_product_images(
  query_embedding vector(3072),
  match_count int DEFAULT 12,
  min_similarity float DEFAULT 0.55
)
RETURNS TABLE (
  product_id UUID,
  image_url TEXT,
  visual_tags JSONB,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    pe.product_id,
    pe.image_url,
    pe.visual_tags,
    1 - (pe.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.product_embeddings pe
  WHERE pe.embedding IS NOT NULL
    AND pe.status = 'ready'
    AND (1 - (pe.embedding::halfvec(3072) <=> query_embedding::halfvec(3072))) >= min_similarity
  ORDER BY pe.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.trg_product_embeddings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS product_embeddings_updated_at ON public.product_embeddings;
CREATE TRIGGER product_embeddings_updated_at
  BEFORE UPDATE ON public.product_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.trg_product_embeddings_updated_at();
