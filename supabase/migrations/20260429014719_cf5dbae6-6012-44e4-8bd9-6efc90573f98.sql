ALTER TABLE public.ai_studio_settings
  ADD COLUMN IF NOT EXISTS segmentation_quality text NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS edge_softness numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS supports_any_background boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS busy_background_tolerance numeric NOT NULL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS mask_threshold numeric NOT NULL DEFAULT 0.5;