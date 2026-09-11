ALTER TABLE public.partner_recruitment_videos
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timing JSONB NOT NULL DEFAULT '{}'::jsonb;