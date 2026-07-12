
CREATE TABLE public.drop_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID REFERENCES public.product_drops(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  prediction JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  confidence_score NUMERIC(5,2),
  model_version TEXT,
  input_snapshot JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drop_ai_insights_drop ON public.drop_ai_insights(drop_id, insight_type, generated_at DESC);
CREATE INDEX idx_drop_ai_insights_type ON public.drop_ai_insights(insight_type, generated_at DESC);

GRANT SELECT ON public.drop_ai_insights TO authenticated;
GRANT ALL ON public.drop_ai_insights TO service_role;

ALTER TABLE public.drop_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/drop managers can view insights"
ON public.drop_ai_insights FOR SELECT
TO authenticated
USING (public.can_manage_drops(auth.uid()));

CREATE POLICY "Service role manages insights"
ON public.drop_ai_insights FOR ALL
TO service_role
USING (true) WITH CHECK (true);
