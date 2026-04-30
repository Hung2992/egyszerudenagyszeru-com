-- Local timestamp trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.ai_studio_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Voices table
CREATE TABLE IF NOT EXISTS public.ai_studio_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  elevenlabs_voice_id TEXT,
  sample_storage_path TEXT,
  sample_duration_sec NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_studio_voices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ai_studio_voices" ON public.ai_studio_voices;
CREATE POLICY "Admins manage ai_studio_voices"
ON public.ai_studio_voices FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_ai_studio_voices_updated_at ON public.ai_studio_voices;
CREATE TRIGGER trg_ai_studio_voices_updated_at
BEFORE UPDATE ON public.ai_studio_voices
FOR EACH ROW EXECUTE FUNCTION public.ai_studio_set_updated_at();

-- TTS render log
CREATE TABLE IF NOT EXISTS public.ai_studio_tts_renders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_id UUID REFERENCES public.ai_studio_voices(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  model_id TEXT NOT NULL DEFAULT 'eleven_multilingual_v2',
  stability NUMERIC NOT NULL DEFAULT 0.45,
  similarity_boost NUMERIC NOT NULL DEFAULT 0.85,
  style NUMERIC NOT NULL DEFAULT 0.35,
  speed NUMERIC NOT NULL DEFAULT 1.0,
  audio_storage_path TEXT,
  duration_sec NUMERIC,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_studio_tts_renders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ai_studio_tts_renders" ON public.ai_studio_tts_renders;
CREATE POLICY "Admins manage ai_studio_tts_renders"
ON public.ai_studio_tts_renders FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-studio-voices', 'ai-studio-voices', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read ai-studio-voices" ON storage.objects;
CREATE POLICY "Admins read ai-studio-voices"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-studio-voices' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins upload ai-studio-voices" ON storage.objects;
CREATE POLICY "Admins upload ai-studio-voices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-studio-voices' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update ai-studio-voices" ON storage.objects;
CREATE POLICY "Admins update ai-studio-voices"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ai-studio-voices' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete ai-studio-voices" ON storage.objects;
CREATE POLICY "Admins delete ai-studio-voices"
ON storage.objects FOR DELETE
USING (bucket_id = 'ai-studio-voices' AND public.has_role(auth.uid(), 'admin'));