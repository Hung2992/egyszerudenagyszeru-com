ALTER TABLE public.ai_studio_settings
  ADD COLUMN IF NOT EXISTS voice_naturalness numeric NOT NULL DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS voice_variance numeric NOT NULL DEFAULT 0.35,
  ADD COLUMN IF NOT EXISTS voice_breathiness numeric NOT NULL DEFAULT 0.4,
  ADD COLUMN IF NOT EXISTS preserve_original_video boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS background_only_mode boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS never_modify_face boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS natural_pauses_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS avoid_robotic_perfection boolean NOT NULL DEFAULT true;