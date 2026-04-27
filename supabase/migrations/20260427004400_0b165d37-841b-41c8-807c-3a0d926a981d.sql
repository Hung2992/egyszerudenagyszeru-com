-- Add quality scoring + usage tracking to AI knowledge for self-pruning meta-learning
ALTER TABLE public.ai_knowledge_documents
  ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_score numeric NOT NULL DEFAULT 1.0;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_docs_quality ON public.ai_knowledge_documents(quality_score DESC, last_used_at DESC NULLS LAST);

-- RPC to bump usage when a chunk is retrieved by the assistant
CREATE OR REPLACE FUNCTION public.bump_ai_knowledge_usage(_document_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_knowledge_documents
  SET usage_count = usage_count + 1,
      last_used_at = now(),
      quality_score = LEAST(quality_score + 0.05, 5.0)
  WHERE id = ANY(_document_ids);
$$;

-- RPC to decay quality of unused self-learned facts (called by cron)
CREATE OR REPLACE FUNCTION public.decay_ai_knowledge_quality()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE archived_count integer;
BEGIN
  -- Decay quality of self-learned facts not used in 14 days
  UPDATE public.ai_knowledge_documents
  SET quality_score = GREATEST(quality_score - 0.1, 0)
  WHERE source_type = 'self_learning'
    AND (last_used_at IS NULL OR last_used_at < now() - interval '14 days')
    AND quality_score > 0;

  -- Archive (mark as archived) facts whose score dropped to 0
  UPDATE public.ai_knowledge_documents
  SET status = 'archived'
  WHERE source_type = 'self_learning'
    AND quality_score <= 0
    AND status = 'ready';
  GET DIAGNOSTICS archived_count = ROW_COUNT;

  RETURN archived_count;
END;
$$;