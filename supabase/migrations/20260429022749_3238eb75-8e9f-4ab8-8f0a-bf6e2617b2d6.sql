-- Export preset rendszer + strict vision check + HD preview kapcsoló
ALTER TABLE public.ai_studio_settings
  ADD COLUMN IF NOT EXISTS export_preset text NOT NULL DEFAULT 'youtube_4k_landscape',
  ADD COLUMN IF NOT EXISTS export_orientation text NOT NULL DEFAULT 'landscape',
  ADD COLUMN IF NOT EXISTS export_width integer NOT NULL DEFAULT 3840,
  ADD COLUMN IF NOT EXISTS export_height integer NOT NULL DEFAULT 2160,
  ADD COLUMN IF NOT EXISTS export_video_bitrate_mbps integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS bg_strict_human_check boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preview_hd_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ai_studio_settings.export_preset IS 'Preset key: tiktok_1080_vertical | tiktok_4k_vertical | youtube_4k_landscape | youtube_1080_landscape | custom';
COMMENT ON COLUMN public.ai_studio_settings.export_orientation IS 'landscape | vertical';
COMMENT ON COLUMN public.ai_studio_settings.export_video_bitrate_mbps IS 'Video bitrate Mbps (15-50 ajánlott 4K-hoz)';
COMMENT ON COLUMN public.ai_studio_settings.bg_strict_human_check IS 'Ha true: vision check hibája esetén NEM menti a hátteret automatikusan';
