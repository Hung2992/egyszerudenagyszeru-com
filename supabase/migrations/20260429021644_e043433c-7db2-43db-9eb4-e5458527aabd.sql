ALTER TABLE public.ai_studio_settings
  ADD COLUMN IF NOT EXISTS export_4k boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_sample_rate integer NOT NULL DEFAULT 48000,
  ADD COLUMN IF NOT EXISTS audio_bitrate_kbps integer NOT NULL DEFAULT 256,
  ADD COLUMN IF NOT EXISTS show_safe_zone boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bg_human_check_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bg_max_regenerations integer NOT NULL DEFAULT 2;