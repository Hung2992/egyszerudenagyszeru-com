ALTER TABLE public.ai_studio_renders
  ADD COLUMN IF NOT EXISTS subject_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS background_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS background_is_video BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS target_resolution_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS max_duration_snapshot INT;