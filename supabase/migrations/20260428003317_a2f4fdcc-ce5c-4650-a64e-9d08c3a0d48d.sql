-- Extensions for future scheduled video worker
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Video / audio / image queue table
CREATE TABLE IF NOT EXISTS public.ai_video_processing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_job_id uuid REFERENCES public.ai_bulk_ingest_jobs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  media_type text NOT NULL DEFAULT 'video', -- video | audio | image
  status text NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed | skipped_no_credit | skipped_disabled
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  transcript text,
  visual_description text,
  body_language text,
  environment text,
  style_notes text,
  generated_article text,
  knowledge_document_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_video_queue_status ON public.ai_video_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_queue_job ON public.ai_video_processing_queue(bulk_job_id);

ALTER TABLE public.ai_video_processing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage video queue"
ON public.ai_video_processing_queue
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage video queue"
ON public.ai_video_processing_queue
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Personal profile aggregated from videos and text
CREATE TABLE IF NOT EXISTS public.ai_personal_profile (
  id integer PRIMARY KEY DEFAULT 1,
  voice_style text,
  visual_style text,
  body_language text,
  recurring_themes text,
  personality_traits text,
  communication_style text,
  total_videos_analyzed integer NOT NULL DEFAULT 0,
  total_text_sources integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  raw_aggregations jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.ai_personal_profile (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_personal_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage personal profile"
ON public.ai_personal_profile
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage personal profile"
ON public.ai_personal_profile
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Settings table for video processing toggle (default OFF = no AI cost)
CREATE TABLE IF NOT EXISTS public.ai_bulk_ingest_settings (
  id integer PRIMARY KEY DEFAULT 1,
  video_analysis_enabled boolean NOT NULL DEFAULT false,
  max_videos_per_job integer NOT NULL DEFAULT 100,
  parallel_workers integer NOT NULL DEFAULT 1,
  daily_budget_usd numeric NOT NULL DEFAULT 0,
  spent_today_usd numeric NOT NULL DEFAULT 0,
  budget_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  paused boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);

INSERT INTO public.ai_bulk_ingest_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_bulk_ingest_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bulk ingest settings"
ON public.ai_bulk_ingest_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role read bulk ingest settings"
ON public.ai_bulk_ingest_settings
FOR SELECT
USING (auth.role() = 'service_role');