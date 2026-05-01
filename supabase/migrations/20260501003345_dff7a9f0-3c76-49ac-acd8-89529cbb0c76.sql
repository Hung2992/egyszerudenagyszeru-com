-- Helper function ha még nem létezik
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1) Provider/modell katalógus
CREATE TABLE IF NOT EXISTS public.tts_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  description TEXT,
  supports_cloning BOOLEAN NOT NULL DEFAULT true,
  supports_hungarian BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tts_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TTS modellek nyilvánosan olvashatók" ON public.tts_models FOR SELECT USING (true);
CREATE POLICY "Csak admin módosíthatja a modelleket" ON public.tts_models FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Saját hangok v2
CREATE TABLE IF NOT EXISTS public.tts_voices_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  model_id UUID REFERENCES public.tts_models(id),
  sample_storage_path TEXT,
  provider_voice_id TEXT,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tts_voices_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin teljes hozzáférés a hangokhoz" ON public.tts_voices_v2 FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Publikus hangokat mindenki láthatja" ON public.tts_voices_v2 FOR SELECT USING (is_public = true);

-- 3) Generálási előzmények v2
CREATE TABLE IF NOT EXISTS public.tts_generations_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_id UUID REFERENCES public.tts_voices_v2(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.tts_models(id),
  text TEXT NOT NULL,
  voice_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_storage_path TEXT,
  duration_seconds NUMERIC,
  generation_time_ms INTEGER,
  cost_usd NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  provider TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tts_generations_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin teljes hozzáférés a generálásokhoz" ON public.tts_generations_v2 FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triggerek
DROP TRIGGER IF EXISTS trg_tts_models_updated_at ON public.tts_models;
CREATE TRIGGER trg_tts_models_updated_at BEFORE UPDATE ON public.tts_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_tts_voices_v2_updated_at ON public.tts_voices_v2;
CREATE TRIGGER trg_tts_voices_v2_updated_at BEFORE UPDATE ON public.tts_voices_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tts_voices_v2_created_by ON public.tts_voices_v2(created_by);
CREATE INDEX IF NOT EXISTS idx_tts_voices_v2_model_id ON public.tts_voices_v2(model_id);
CREATE INDEX IF NOT EXISTS idx_tts_generations_v2_voice_id ON public.tts_generations_v2(voice_id);
CREATE INDEX IF NOT EXISTS idx_tts_generations_v2_created_at ON public.tts_generations_v2(created_at DESC);

-- Seed: alap modellek
INSERT INTO public.tts_models (slug, name, provider, description, supports_hungarian, priority, config) VALUES
  ('xtts-v2', 'Coqui XTTS-v2', 'replicate', 'Legjobb magyar támogatás, 6mp minta elég klónozáshoz, 16 nyelv', true, 10,
   '{"replicate_model": "lucataco/xtts-v2:684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e", "languages": ["hu","en","es","fr","de","it","pt","pl","tr","ru","nl","cs","ar","zh-cn","ja","hi","ko"]}'::jsonb),
  ('f5-tts', 'F5-TTS', 'replicate', 'Legmodernebb (2024 okt), nagyon természetes angol hangzás', false, 20,
   '{"replicate_model": "x-lance/f5-tts:87faf6dd7a692dd82043f662e76369cab126a2cf1937e25a9d41e0b834fd230e", "languages": ["en","zh"]}'::jsonb),
  ('chatterbox', 'Chatterbox TTS', 'replicate', 'Resemble AI, érzelmek + stílus kontroll', false, 30,
   '{"replicate_model": "resemble-ai/chatterbox", "languages": ["en"]}'::jsonb),
  ('elevenlabs-v2', 'ElevenLabs Multilingual v2', 'elevenlabs', 'Külső szolgáltatás fallback, prémium minőség', true, 40,
   '{"model_id": "eleven_multilingual_v2"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Storage bucket + policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-voices-v2', 'tts-voices-v2', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin teljes hozzáférés a tts-voices-v2 buckethez" ON storage.objects;
CREATE POLICY "Admin teljes hozzáférés a tts-voices-v2 buckethez"
  ON storage.objects FOR ALL
  USING (bucket_id = 'tts-voices-v2' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'tts-voices-v2' AND public.has_role(auth.uid(), 'admin'));