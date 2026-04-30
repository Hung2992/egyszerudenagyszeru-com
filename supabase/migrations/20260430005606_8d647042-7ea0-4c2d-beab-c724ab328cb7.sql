-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.ai_studio_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  source_video_path TEXT,
  background_type TEXT NOT NULL DEFAULT 'ai_text',
  background_prompt TEXT,
  background_asset_path TEXT,
  voice_id UUID REFERENCES public.ai_studio_voices(id) ON DELETE SET NULL,
  voice_text TEXT,
  voice_settings JSONB NOT NULL DEFAULT '{"stability":0.45,"similarity_boost":0.85,"style":0.35,"speed":1.0}'::jsonb,
  matting_mode TEXT NOT NULL DEFAULT 'fast',
  upscale_enabled BOOLEAN NOT NULL DEFAULT true,
  target_resolution TEXT NOT NULL DEFAULT '4k',
  max_duration_seconds INT NOT NULL DEFAULT 180,
  status TEXT NOT NULL DEFAULT 'draft',
  error_message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai studio projects"
ON public.ai_studio_projects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_studio_projects_updated
BEFORE UPDATE ON public.ai_studio_projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_studio_renders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ai_studio_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  current_step TEXT,
  output_video_path TEXT,
  duration_seconds NUMERIC,
  file_size_bytes BIGINT,
  cost_estimate NUMERIC,
  replicate_matting_id TEXT,
  replicate_upscale_id TEXT,
  error_message TEXT,
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_studio_renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai studio renders"
ON public.ai_studio_renders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_studio_renders_updated
BEFORE UPDATE ON public.ai_studio_renders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_studio_renders_project ON public.ai_studio_renders(project_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-studio-projects', 'ai-studio-projects', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read ai-studio-projects"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ai-studio-projects' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload ai-studio-projects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ai-studio-projects' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update ai-studio-projects"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ai-studio-projects' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete ai-studio-projects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ai-studio-projects' AND public.has_role(auth.uid(), 'admin'));