
ALTER TABLE public.partner_recruitment_posts
  ADD COLUMN IF NOT EXISTS viral_score INTEGER,
  ADD COLUMN IF NOT EXISTS viral_analysis JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hook_variants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS campaign_group TEXT,
  ADD COLUMN IF NOT EXISTS best_time_hint TEXT;

CREATE INDEX IF NOT EXISTS idx_prp_campaign_group ON public.partner_recruitment_posts(campaign_group);
CREATE INDEX IF NOT EXISTS idx_prp_scheduled_for ON public.partner_recruitment_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_prp_viral_score ON public.partner_recruitment_posts(viral_score DESC);

CREATE TABLE IF NOT EXISTS public.partner_recruitment_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  topic TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}'::text[],
  hook_examples TEXT[] DEFAULT '{}'::text[],
  audience_note TEXT,
  score INTEGER,
  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_recruitment_trends TO authenticated;
GRANT ALL ON public.partner_recruitment_trends TO service_role;

ALTER TABLE public.partner_recruitment_trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage recruitment trends" ON public.partner_recruitment_trends;
CREATE POLICY "Admins manage recruitment trends"
  ON public.partner_recruitment_trends
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_prt_platform_created ON public.partner_recruitment_trends(platform, created_at DESC);
