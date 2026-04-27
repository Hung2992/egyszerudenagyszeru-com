-- Stability + control layer for AI knowledge brain
ALTER TABLE public.ai_knowledge_documents
  ADD COLUMN IF NOT EXISTS confidence numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS source_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'auto_approved',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_document_id uuid;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_docs_review ON public.ai_knowledge_documents(review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_docs_domain ON public.ai_knowledge_documents(domain);

-- Daily learning quota (prevents runaway learning)
CREATE TABLE IF NOT EXISTS public.ai_learn_quota (
  id integer PRIMARY KEY DEFAULT 1,
  learn_date date NOT NULL DEFAULT CURRENT_DATE,
  learn_count integer NOT NULL DEFAULT 0,
  daily_limit integer NOT NULL DEFAULT 50,
  meta_count integer NOT NULL DEFAULT 0,
  meta_daily_limit integer NOT NULL DEFAULT 10,
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.ai_learn_quota (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_learn_quota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage learn quota" ON public.ai_learn_quota;
CREATE POLICY "Admins manage learn quota" ON public.ai_learn_quota
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Atomic quota check & increment, returns true if learning allowed
CREATE OR REPLACE FUNCTION public.check_and_bump_learn_quota(_kind text DEFAULT 'fact')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q RECORD;
BEGIN
  -- Reset on new day
  UPDATE public.ai_learn_quota
  SET learn_date = CURRENT_DATE, learn_count = 0, meta_count = 0
  WHERE learn_date <> CURRENT_DATE;

  SELECT * INTO q FROM public.ai_learn_quota WHERE id = 1;

  IF _kind = 'meta' THEN
    IF q.meta_count >= q.meta_daily_limit THEN RETURN false; END IF;
    UPDATE public.ai_learn_quota SET meta_count = meta_count + 1 WHERE id = 1;
  ELSE
    IF q.learn_count >= q.daily_limit THEN RETURN false; END IF;
    UPDATE public.ai_learn_quota SET learn_count = learn_count + 1 WHERE id = 1;
  END IF;
  RETURN true;
END;
$$;

-- Get reviews pending admin approval
CREATE OR REPLACE FUNCTION public.get_pending_ai_reviews(_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid, title text, summary text, raw_text text, source_type text,
  domain text, confidence numeric, source_count integer, version integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, summary, raw_text, source_type,
         domain, confidence, source_count, version, created_at
  FROM public.ai_knowledge_documents
  WHERE review_status = 'pending_review'
  ORDER BY created_at DESC
  LIMIT _limit;
$$;

-- Approve a pending knowledge document
CREATE OR REPLACE FUNCTION public.approve_ai_knowledge(_doc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.ai_knowledge_documents
  SET review_status = 'approved', status = 'ready', quality_score = GREATEST(quality_score, 2.0)
  WHERE id = _doc_id;
  RETURN true;
END;
$$;

-- Reject (archives) a pending knowledge document
CREATE OR REPLACE FUNCTION public.reject_ai_knowledge(_doc_id uuid, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.ai_knowledge_documents
  SET review_status = 'rejected', status = 'archived',
      error_message = COALESCE(_reason, 'admin rejected')
  WHERE id = _doc_id;
  RETURN true;
END;
$$;

-- Rollback: re-activate a parent version, archive the current one
CREATE OR REPLACE FUNCTION public.rollback_ai_knowledge(_doc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE parent_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT parent_document_id INTO parent_id
  FROM public.ai_knowledge_documents WHERE id = _doc_id;

  IF parent_id IS NULL THEN
    RAISE EXCEPTION 'no_parent_version';
  END IF;

  UPDATE public.ai_knowledge_documents
  SET status = 'archived', review_status = 'rejected'
  WHERE id = _doc_id;

  UPDATE public.ai_knowledge_documents
  SET status = 'ready', review_status = 'approved'
  WHERE id = parent_id;
  RETURN true;
END;
$$;