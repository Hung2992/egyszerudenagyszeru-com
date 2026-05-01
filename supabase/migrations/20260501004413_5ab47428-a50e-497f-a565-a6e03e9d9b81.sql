
-- ============ 1. TTS GLOBÁLIS BEÁLLÍTÁSOK ============
CREATE TABLE IF NOT EXISTS public.tts_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sample_ttl_days integer NOT NULL DEFAULT 90,
  generation_ttl_days integer NOT NULL DEFAULT 30,
  use_custom_gpu boolean NOT NULL DEFAULT false,
  custom_gpu_endpoint text,
  custom_gpu_secret_name text DEFAULT 'CUSTOM_GPU_TTS_TOKEN',
  enable_size_check boolean NOT NULL DEFAULT true,
  enable_clamav_scan boolean NOT NULL DEFAULT false,
  enable_ai_moderation boolean NOT NULL DEFAULT true,
  clamav_endpoint text,
  max_sample_size_mb integer NOT NULL DEFAULT 25,
  max_sample_duration_sec integer NOT NULL DEFAULT 60,
  allowed_mime_types text[] NOT NULL DEFAULT ARRAY['audio/wav','audio/mpeg','audio/mp3','audio/x-m4a','audio/mp4','audio/ogg','audio/webm']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tts_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read tts_settings" ON public.tts_settings FOR SELECT USING (true);
CREATE POLICY "admin manage tts_settings" ON public.tts_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.tts_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER tts_settings_updated_at BEFORE UPDATE ON public.tts_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 2. PRESETS ============
CREATE TABLE IF NOT EXISTS public.tts_voice_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'Mic',
  category text NOT NULL DEFAULT 'general',
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_models text[] DEFAULT ARRAY['xtts-v2']::text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tts_voice_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read presets" ON public.tts_voice_presets FOR SELECT USING (true);
CREATE POLICY "admin manage presets" ON public.tts_voice_presets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tts_voice_presets_updated_at BEFORE UPDATE ON public.tts_voice_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tts_voice_presets (slug, name, description, icon, category, is_system, sort_order, parameters) VALUES
('hu-podcast', 'Magyar Podcast', 'Természetes, lazább podcast hangzás magyar nyelvre', 'Mic', 'podcast', true, 10,
  '{"language":"hu","stability":0.75,"similarity_boost":0.85,"style":0.2,"speed":1.0,"use_speaker_boost":true}'::jsonb),
('narrator', 'Narrátor', 'Mély, kimért, hangoskönyv stílus', 'BookOpen', 'narration', true, 20,
  '{"language":"hu","stability":0.85,"similarity_boost":0.9,"style":0.1,"speed":0.95,"use_speaker_boost":true}'::jsonb),
('ad-spot', 'Reklám / Spot', 'Energikus, figyelemfelkeltő reklám hang', 'Megaphone', 'advertising', true, 30,
  '{"language":"hu","stability":0.5,"similarity_boost":0.75,"style":0.6,"speed":1.1,"use_speaker_boost":true}'::jsonb),
('chat-joy', 'Chat — Öröm', 'Vidám, lelkes válaszhang', 'Smile', 'chat', true, 40,
  '{"language":"hu","stability":0.45,"similarity_boost":0.8,"style":0.7,"speed":1.05,"use_speaker_boost":true}'::jsonb),
('chat-empathy', 'Chat — Empátia', 'Megértő, lágy hangzás', 'Heart', 'chat', true, 50,
  '{"language":"hu","stability":0.7,"similarity_boost":0.85,"style":0.4,"speed":0.95,"use_speaker_boost":true}'::jsonb),
('chat-excited', 'Chat — Izgatott', 'Lendületes, gyorsabb tempó', 'Zap', 'chat', true, 60,
  '{"language":"hu","stability":0.4,"similarity_boost":0.78,"style":0.8,"speed":1.15,"use_speaker_boost":true}'::jsonb),
('chat-calm', 'Chat — Nyugodt', 'Higgadt, lassú beszéd', 'Moon', 'chat', true, 70,
  '{"language":"hu","stability":0.85,"similarity_boost":0.88,"style":0.15,"speed":0.92,"use_speaker_boost":true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============ 3. TTS_VOICES_V2 BŐVÍTÉS ============
ALTER TABLE public.tts_voices_v2
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderation_notes text,
  ADD COLUMN IF NOT EXISTS virus_scan_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS audio_duration_seconds numeric,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint;

-- ============ 4. TTS_GENERATIONS_V2 BŐVÍTÉS ============
ALTER TABLE public.tts_generations_v2
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS progress_percent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_prediction_id text;

-- ============ 5. TTL TRIGGER ============
CREATE OR REPLACE FUNCTION public.tts_set_voice_expiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ttl integer;
BEGIN
  SELECT sample_ttl_days INTO _ttl FROM public.tts_settings WHERE id = 1;
  IF NEW.expires_at IS NULL AND COALESCE(_ttl, 0) > 0 THEN
    NEW.expires_at := now() + (_ttl || ' days')::interval;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tts_voices_v2_set_expiry ON public.tts_voices_v2;
CREATE TRIGGER tts_voices_v2_set_expiry BEFORE INSERT ON public.tts_voices_v2
  FOR EACH ROW EXECUTE FUNCTION public.tts_set_voice_expiry();

CREATE OR REPLACE FUNCTION public.tts_set_generation_expiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ttl integer;
BEGIN
  SELECT generation_ttl_days INTO _ttl FROM public.tts_settings WHERE id = 1;
  IF NEW.expires_at IS NULL AND COALESCE(_ttl, 0) > 0 THEN
    NEW.expires_at := now() + (_ttl || ' days')::interval;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tts_generations_v2_set_expiry ON public.tts_generations_v2;
CREATE TRIGGER tts_generations_v2_set_expiry BEFORE INSERT ON public.tts_generations_v2
  FOR EACH ROW EXECUTE FUNCTION public.tts_set_generation_expiry();

-- Backfill existing rows
UPDATE public.tts_voices_v2 SET expires_at = created_at + interval '90 days' WHERE expires_at IS NULL;
UPDATE public.tts_generations_v2 SET expires_at = created_at + interval '30 days' WHERE expires_at IS NULL;

-- ============ 6. CLEANUP FUNCTION ============
CREATE OR REPLACE FUNCTION public.tts_cleanup_expired()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _voices_deleted integer := 0;
  _gens_deleted integer := 0;
BEGIN
  -- Delete expired voices (storage cleanup happens via edge function reading the path)
  WITH del AS (
    DELETE FROM public.tts_voices_v2
    WHERE expires_at IS NOT NULL AND expires_at < now()
    RETURNING id
  ) SELECT COUNT(*) INTO _voices_deleted FROM del;

  WITH del AS (
    DELETE FROM public.tts_generations_v2
    WHERE expires_at IS NOT NULL AND expires_at < now()
    RETURNING id
  ) SELECT COUNT(*) INTO _gens_deleted FROM del;

  RETURN jsonb_build_object(
    'voices_deleted', _voices_deleted,
    'generations_deleted', _gens_deleted,
    'timestamp', now()
  );
END $$;

-- ============ 7. REALTIME ============
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tts_generations_v2';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tts_voices_v2';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.tts_generations_v2 REPLICA IDENTITY FULL;
ALTER TABLE public.tts_voices_v2 REPLICA IDENTITY FULL;
