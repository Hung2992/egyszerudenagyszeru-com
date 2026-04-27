
-- Reflexiók táblája
CREATE TABLE IF NOT EXISTS public.ai_response_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  user_question TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  used_knowledge_ids UUID[] DEFAULT '{}',
  used_domains TEXT[] DEFAULT '{}',
  self_correctness NUMERIC NOT NULL DEFAULT 0.7,
  self_completeness NUMERIC NOT NULL DEFAULT 0.7,
  self_tone NUMERIC NOT NULL DEFAULT 0.7,
  overall_score NUMERIC GENERATED ALWAYS AS ((self_correctness + self_completeness + self_tone) / 3.0) STORED,
  identified_gaps TEXT,
  suggested_strategy TEXT,
  applied_to_learning BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_response_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reflections"
  ON public.ai_response_reflections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage reflections"
  ON public.ai_response_reflections FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_ai_reflections_created ON public.ai_response_reflections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reflections_score ON public.ai_response_reflections(overall_score);

-- Felhasználói visszajelzés táblája
CREATE TABLE IF NOT EXISTS public.ai_response_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id UUID REFERENCES public.ai_response_reflections(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 0, 1)),
  correction TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_response_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage feedback"
  ON public.ai_response_feedback FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ai_feedback_reflection ON public.ai_response_feedback(reflection_id);

-- Insight RPC: aggregált önértékelési statisztikák
CREATE OR REPLACE FUNCTION public.get_reflection_insights(_limit INT DEFAULT 50)
RETURNS TABLE (
  avg_correctness NUMERIC,
  avg_completeness NUMERIC,
  avg_tone NUMERIC,
  avg_overall NUMERIC,
  weak_count BIGINT,
  total BIGINT,
  recent_gaps TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH recent AS (
    SELECT * FROM public.ai_response_reflections
    ORDER BY created_at DESC
    LIMIT _limit
  )
  SELECT
    ROUND(AVG(self_correctness)::numeric, 3),
    ROUND(AVG(self_completeness)::numeric, 3),
    ROUND(AVG(self_tone)::numeric, 3),
    ROUND(AVG(overall_score)::numeric, 3),
    COUNT(*) FILTER (WHERE overall_score < 0.6),
    COUNT(*),
    string_agg(DISTINCT NULLIF(identified_gaps, ''), ' | ' ORDER BY NULLIF(identified_gaps, '')) FILTER (WHERE identified_gaps IS NOT NULL)
  FROM recent;
$$;

GRANT EXECUTE ON FUNCTION public.get_reflection_insights(INT) TO authenticated, service_role;
