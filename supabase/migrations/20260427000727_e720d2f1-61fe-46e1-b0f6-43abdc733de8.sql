
-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table (one row per uploaded file/text)
CREATE TABLE public.ai_knowledge_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'pdf' | 'docx' | 'txt' | 'audio' | 'video' | 'image' | 'text' | 'url'
  file_path TEXT, -- path in storage bucket
  file_size_bytes BIGINT,
  mime_type TEXT,
  raw_text TEXT, -- extracted plain text
  summary TEXT, -- AI-generated short summary
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'ready' | 'error'
  error_message TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chunks table (vector embeddings for RAG)
CREATE TABLE public.ai_knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.ai_knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- gemini text-embedding-004 dimension
  token_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chunks_document ON public.ai_knowledge_chunks(document_id);
CREATE INDEX idx_ai_chunks_embedding ON public.ai_knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Owner profile (single row, "who you are")
CREATE TABLE public.ai_owner_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT,
  business_name TEXT,
  role TEXT,
  bio TEXT,
  goals TEXT,
  tone_of_voice TEXT,
  writing_style TEXT,
  target_audience TEXT,
  expertise_areas TEXT,
  preferences TEXT,
  custom_instructions TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_owner_profile ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins manage knowledge documents"
ON public.ai_knowledge_documents FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage knowledge chunks"
ON public.ai_knowledge_chunks FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage owner profile"
ON public.ai_owner_profile FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER set_ai_knowledge_documents_updated
  BEFORE UPDATE ON public.ai_knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ai_owner_profile_updated
  BEFORE UPDATE ON public.ai_owner_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vector similarity search function
CREATE OR REPLACE FUNCTION public.match_ai_knowledge(
  query_embedding vector(768),
  match_count INTEGER DEFAULT 6,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id as chunk_id,
    c.document_id,
    d.title as document_title,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM public.ai_knowledge_chunks c
  JOIN public.ai_knowledge_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND d.status = 'ready'
    AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Storage bucket for uploaded knowledge files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-knowledge', 'ai-knowledge', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admin only
CREATE POLICY "Admins read ai-knowledge files"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-knowledge' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins upload ai-knowledge files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-knowledge' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update ai-knowledge files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ai-knowledge' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete ai-knowledge files"
ON storage.objects FOR DELETE
USING (bucket_id = 'ai-knowledge' AND public.has_role(auth.uid(), 'admin'::app_role));
