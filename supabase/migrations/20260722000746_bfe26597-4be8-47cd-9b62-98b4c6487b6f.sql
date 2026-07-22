
-- Extend social_publish_queue
ALTER TABLE public.social_publish_queue
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES public.social_publish_queue(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS predicted_reach INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_engagement NUMERIC,
  ADD COLUMN IF NOT EXISTS ai_score NUMERIC;

CREATE INDEX IF NOT EXISTS idx_spq_priority_sched
  ON public.social_publish_queue (status, priority DESC, scheduled_at ASC);

-- Metrics time-series
CREATE TABLE IF NOT EXISTS public.social_post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.social_publish_queue(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_post_id TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  engagement_rate NUMERIC,
  conversion_leads INTEGER DEFAULT 0,
  conversion_signups INTEGER DEFAULT 0,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spm_queue ON public.social_post_metrics (queue_id, collected_at DESC);

GRANT SELECT ON public.social_post_metrics TO authenticated;
GRANT ALL ON public.social_post_metrics TO service_role;
ALTER TABLE public.social_post_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read metrics" ON public.social_post_metrics
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "service manages metrics" ON public.social_post_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- AI marketing insights (learning outputs)
CREATE TABLE IF NOT EXISTS public.ai_marketing_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'global',
  platform TEXT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  insight TEXT NOT NULL,
  recommendation TEXT,
  confidence NUMERIC DEFAULT 0.5,
  evidence JSONB DEFAULT '{}'::jsonb,
  auto_applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ami_active ON public.ai_marketing_insights (status, platform, created_at DESC);
GRANT SELECT ON public.ai_marketing_insights TO authenticated;
GRANT ALL ON public.ai_marketing_insights TO service_role;
ALTER TABLE public.ai_marketing_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read insights" ON public.ai_marketing_insights
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update insights" ON public.ai_marketing_insights
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "service manages insights" ON public.ai_marketing_insights
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Daily/weekly briefings from AI Marketing CEO
CREATE TABLE IF NOT EXISTS public.ai_marketing_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period TEXT NOT NULL DEFAULT 'daily',
  summary TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_amb_date_period ON public.ai_marketing_briefings (briefing_date, period);
GRANT SELECT ON public.ai_marketing_briefings TO authenticated;
GRANT ALL ON public.ai_marketing_briefings TO service_role;
ALTER TABLE public.ai_marketing_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read briefings" ON public.ai_marketing_briefings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "service manages briefings" ON public.ai_marketing_briefings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Approvals audit log
CREATE TABLE IF NOT EXISTS public.social_post_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.social_publish_queue(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_email TEXT,
  note TEXT,
  snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spa_queue ON public.social_post_approvals (queue_id, created_at DESC);
GRANT SELECT ON public.social_post_approvals TO authenticated;
GRANT ALL ON public.social_post_approvals TO service_role;
ALTER TABLE public.social_post_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read approvals" ON public.social_post_approvals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert approvals" ON public.social_post_approvals
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "service manages approvals" ON public.social_post_approvals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ami_updated_at ON public.ai_marketing_insights;
CREATE TRIGGER trg_ami_updated_at BEFORE UPDATE ON public.ai_marketing_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
