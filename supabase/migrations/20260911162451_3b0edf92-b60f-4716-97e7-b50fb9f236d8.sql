ALTER TABLE public.partner_recruitment_videos
  ADD COLUMN IF NOT EXISTS scene_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS narration_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS rendered_at TIMESTAMPTZ;