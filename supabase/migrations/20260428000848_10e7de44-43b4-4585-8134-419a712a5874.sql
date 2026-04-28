-- 1. Bővítjük a tudásbázis dokumentumokat
ALTER TABLE public.ai_knowledge_documents
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_hash TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS article_md TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS bulk_job_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_knowledge_docs_source_hash
  ON public.ai_knowledge_documents(source_hash) WHERE source_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_docs_category
  ON public.ai_knowledge_documents(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_docs_bulk_job
  ON public.ai_knowledge_documents(bulk_job_id) WHERE bulk_job_id IS NOT NULL;

-- 2. Tömeges import job tábla
CREATE TABLE IF NOT EXISTS public.ai_bulk_ingest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('json','urls','zip','mixed')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','partial')),
  source_payload JSONB,
  zip_storage_path TEXT,
  total_sources INTEGER NOT NULL DEFAULT 0,
  processed_sources INTEGER NOT NULL DEFAULT 0,
  succeeded_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.ai_bulk_ingest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bulk ingest jobs"
  ON public.ai_bulk_ingest_jobs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ai_bulk_jobs_created
  ON public.ai_bulk_ingest_jobs(created_at DESC);

-- 3. Privát storage bucket a ZIP-eknek
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-bulk-uploads', 'ai-bulk-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read bulk uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ai-bulk-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert bulk uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ai-bulk-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete bulk uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ai-bulk-uploads' AND public.has_role(auth.uid(), 'admin'));