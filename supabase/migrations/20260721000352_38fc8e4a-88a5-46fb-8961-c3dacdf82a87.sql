
-- Queue
CREATE TABLE public.social_publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','tiktok')),
  content TEXT NOT NULL,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image','video','carousel','text')),
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','published','failed','cancelled','skipped')),
  external_post_id TEXT,
  external_permalink TEXT,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  metrics JSONB NOT NULL DEFAULT '{}',
  metrics_updated_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',
  source_ref UUID,
  campaign_id UUID,
  autopilot BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spq_status_sched ON public.social_publish_queue(status, scheduled_at);
CREATE INDEX idx_spq_platform ON public.social_publish_queue(platform);
CREATE INDEX idx_spq_campaign ON public.social_publish_queue(campaign_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_publish_queue TO authenticated;
GRANT ALL ON public.social_publish_queue TO service_role;
ALTER TABLE public.social_publish_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_queue" ON public.social_publish_queue FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Events log
CREATE TABLE public.social_publish_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES public.social_publish_queue(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  platform TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spe_queue ON public.social_publish_events(queue_id, created_at DESC);
GRANT SELECT ON public.social_publish_events TO authenticated;
GRANT ALL ON public.social_publish_events TO service_role;
ALTER TABLE public.social_publish_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_events" ON public.social_publish_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Settings
CREATE TABLE public.social_auto_publish_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autopilot_enabled BOOLEAN NOT NULL DEFAULT false,
  facebook_enabled BOOLEAN NOT NULL DEFAULT false,
  instagram_enabled BOOLEAN NOT NULL DEFAULT false,
  tiktok_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_limit_facebook INT NOT NULL DEFAULT 3,
  daily_limit_instagram INT NOT NULL DEFAULT 2,
  daily_limit_tiktok INT NOT NULL DEFAULT 2,
  quiet_hours_start INT NOT NULL DEFAULT 22 CHECK (quiet_hours_start BETWEEN 0 AND 23),
  quiet_hours_end INT NOT NULL DEFAULT 7 CHECK (quiet_hours_end BETWEEN 0 AND 23),
  default_hashtags TEXT[] NOT NULL DEFAULT '{}',
  facebook_page_id TEXT,
  instagram_business_id TEXT,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.social_auto_publish_settings TO authenticated;
GRANT ALL ON public.social_auto_publish_settings TO service_role;
ALTER TABLE public.social_auto_publish_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_settings_all" ON public.social_auto_publish_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.social_auto_publish_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

-- updated_at triggers
CREATE TRIGGER trg_spq_updated BEFORE UPDATE ON public.social_publish_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_saps_updated BEFORE UPDATE ON public.social_auto_publish_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
