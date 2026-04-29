
-- ============== TÁBLÁK ==============
CREATE TABLE public.ai_studio_voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_sec NUMERIC,
  pitch_hz NUMERIC,
  tempo_wpm NUMERIC,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  analysis_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_studio_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_sec NUMERIC,
  width INT,
  height INT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_studio_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  bg_type TEXT NOT NULL DEFAULT 'image', -- 'image' | 'video' | 'product'
  storage_path TEXT,
  product_id UUID,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_studio_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_video_id UUID REFERENCES public.ai_studio_videos(id) ON DELETE SET NULL,
  background_id UUID REFERENCES public.ai_studio_backgrounds(id) ON DELETE SET NULL,
  voice_sample_id UUID REFERENCES public.ai_studio_voice_samples(id) ON DELETE SET NULL,
  generated_text TEXT,
  output_path TEXT,
  audio_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'rendering' | 'ready' | 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== RLS ==============
ALTER TABLE public.ai_studio_voice_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_studio_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_studio_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_studio_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all voices" ON public.ai_studio_voice_samples
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin all videos" ON public.ai_studio_videos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin all backgrounds" ON public.ai_studio_backgrounds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin all clips" ON public.ai_studio_clips
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at triggerek
CREATE TRIGGER set_voice_updated BEFORE UPDATE ON public.ai_studio_voice_samples
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_clips_updated BEFORE UPDATE ON public.ai_studio_clips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== STORAGE BUCKETS ==============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('ai-studio-voices', 'ai-studio-voices', false),
  ('ai-studio-videos', 'ai-studio-videos', false),
  ('ai-studio-backgrounds', 'ai-studio-backgrounds', true),
  ('ai-studio-clips', 'ai-studio-clips', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — csak admin
CREATE POLICY "admin manage voices bucket" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ai-studio-voices' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'ai-studio-voices' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin manage videos bucket" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ai-studio-videos' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'ai-studio-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin manage backgrounds bucket" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ai-studio-backgrounds' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'ai-studio-backgrounds' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "public read backgrounds" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ai-studio-backgrounds');

CREATE POLICY "admin manage clips bucket" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ai-studio-clips' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'ai-studio-clips' AND public.has_role(auth.uid(), 'admin'::app_role));
