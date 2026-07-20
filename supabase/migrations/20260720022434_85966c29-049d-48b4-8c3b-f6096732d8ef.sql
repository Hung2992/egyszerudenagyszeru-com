
CREATE TABLE public.partner_recruitment_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal TEXT,
  budget_huf NUMERIC DEFAULT 0,
  target_audience TEXT,
  platforms TEXT[] DEFAULT ARRAY['facebook','instagram','tiktok'],
  kpis JSONB DEFAULT '{}'::jsonb,
  ai_suggestions JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_recruitment_campaigns TO authenticated;
GRANT ALL ON public.partner_recruitment_campaigns TO service_role;
ALTER TABLE public.partner_recruitment_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all recruitment_campaigns" ON public.partner_recruitment_campaigns
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.partner_recruitment_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.partner_recruitment_posts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  script JSONB DEFAULT '[]'::jsonb,
  storyboard JSONB DEFAULT '[]'::jsonb,
  narration TEXT,
  captions TEXT,
  music_suggestion TEXT,
  thumbnail_prompt TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_recruitment_videos TO authenticated;
GRANT ALL ON public.partner_recruitment_videos TO service_role;
ALTER TABLE public.partner_recruitment_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all recruitment_videos" ON public.partner_recruitment_videos
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.partner_recruitment_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.partner_recruitment_posts(id) ON DELETE CASCADE,
  target_lang TEXT NOT NULL,
  hook TEXT,
  body TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  cta TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, target_lang)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_recruitment_translations TO authenticated;
GRANT ALL ON public.partner_recruitment_translations TO service_role;
ALTER TABLE public.partner_recruitment_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all recruitment_translations" ON public.partner_recruitment_translations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.partner_recruitment_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.partner_recruitment_campaigns(id) ON DELETE CASCADE,
  predicted_reach INTEGER,
  predicted_leads INTEGER,
  predicted_signups INTEGER,
  predicted_conversion NUMERIC,
  recommended_posts_per_day INTEGER,
  reasoning TEXT,
  confidence NUMERIC,
  raw JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_recruitment_predictions TO authenticated;
GRANT ALL ON public.partner_recruitment_predictions TO service_role;
ALTER TABLE public.partner_recruitment_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all recruitment_predictions" ON public.partner_recruitment_predictions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_pr_campaigns_updated BEFORE UPDATE ON public.partner_recruitment_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pr_videos_updated BEFORE UPDATE ON public.partner_recruitment_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.partner_recruitment_posts ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.partner_recruitment_campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.partner_recruitment_posts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'hu';
