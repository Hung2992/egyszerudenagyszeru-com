
-- Drop existing function first to allow signature change
DROP FUNCTION IF EXISTS public.get_active_principles(text, integer);

-- ============================================================
-- 1. VERSION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_meta_principle_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principle_id uuid NOT NULL,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_type text NOT NULL DEFAULT 'update',
  change_reason text,
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_principle_versions_principle ON public.ai_meta_principle_versions(principle_id, version_number DESC);
ALTER TABLE public.ai_meta_principle_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage principle versions" ON public.ai_meta_principle_versions;
CREATE POLICY "Admins manage principle versions"
ON public.ai_meta_principle_versions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role manage principle versions" ON public.ai_meta_principle_versions;
CREATE POLICY "Service role manage principle versions"
ON public.ai_meta_principle_versions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.ai_strategy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_type text NOT NULL DEFAULT 'update',
  change_reason text,
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_strategy ON public.ai_strategy_versions(strategy_id, version_number DESC);
ALTER TABLE public.ai_strategy_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage strategy versions" ON public.ai_strategy_versions;
CREATE POLICY "Admins manage strategy versions"
ON public.ai_strategy_versions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role manage strategy versions" ON public.ai_strategy_versions;
CREATE POLICY "Service role manage strategy versions"
ON public.ai_strategy_versions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_meta_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  run_id uuid,
  target_table text,
  target_id uuid,
  actor_id uuid,
  actor_role text,
  input_stats jsonb DEFAULT '{}'::jsonb,
  output_payload jsonb DEFAULT '{}'::jsonb,
  decision text,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_audit_run ON public.ai_meta_audit_log(run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_audit_event ON public.ai_meta_audit_log(event_type, created_at DESC);
ALTER TABLE public.ai_meta_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit log" ON public.ai_meta_audit_log;
CREATE POLICY "Admins read audit log"
ON public.ai_meta_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role manage audit log" ON public.ai_meta_audit_log;
CREATE POLICY "Service role manage audit log"
ON public.ai_meta_audit_log FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins insert audit log" ON public.ai_meta_audit_log;
CREATE POLICY "Admins insert audit log"
ON public.ai_meta_audit_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 3. APPROVAL WORKFLOW COLUMNS
-- ============================================================

ALTER TABLE public.ai_meta_principles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS effective_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1;

UPDATE public.ai_meta_principles
SET approval_status = 'approved',
    effective_at = COALESCE(effective_at, created_at)
WHERE approval_status = 'pending' AND is_active = true;

ALTER TABLE public.ai_meta_actions
  ADD COLUMN IF NOT EXISTS effective_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.ai_response_strategies
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1;

-- ============================================================
-- 4. WEAKNESS REASON FIELDS
-- ============================================================

ALTER TABLE public.ai_response_reflections
  ADD COLUMN IF NOT EXISTS weakness_reason text,
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'auto_approved';

ALTER TABLE public.ai_knowledge_documents
  ADD COLUMN IF NOT EXISTS weakness_reason text,
  ADD COLUMN IF NOT EXISTS reviewer_notes text;

-- ============================================================
-- 5. AUTO-VERSIONING TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.snapshot_meta_principle()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ai_meta_principle_versions (
    principle_id, version_number, snapshot, change_type, changed_by
  ) VALUES (
    NEW.id, COALESCE(NEW.current_version, 1), to_jsonb(NEW),
    CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.bump_principle_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
       OLD.principle IS DISTINCT FROM NEW.principle
    OR OLD.weight IS DISTINCT FROM NEW.weight
    OR OLD.is_active IS DISTINCT FROM NEW.is_active
    OR OLD.approval_status IS DISTINCT FROM NEW.approval_status
  ) THEN
    NEW.current_version := COALESCE(OLD.current_version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bump_principle_version ON public.ai_meta_principles;
CREATE TRIGGER trg_bump_principle_version
BEFORE UPDATE ON public.ai_meta_principles
FOR EACH ROW EXECUTE FUNCTION public.bump_principle_version();

DROP TRIGGER IF EXISTS trg_snapshot_meta_principle ON public.ai_meta_principles;
CREATE TRIGGER trg_snapshot_meta_principle
AFTER INSERT OR UPDATE ON public.ai_meta_principles
FOR EACH ROW EXECUTE FUNCTION public.snapshot_meta_principle();

CREATE OR REPLACE FUNCTION public.snapshot_strategy()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ai_strategy_versions (
    strategy_id, version_number, snapshot, change_type, changed_by
  ) VALUES (
    NEW.id, COALESCE(NEW.current_version, 1), to_jsonb(NEW),
    CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.bump_strategy_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
       OLD.name IS DISTINCT FROM NEW.name
    OR OLD.prompt_addon IS DISTINCT FROM NEW.prompt_addon
    OR OLD.is_active IS DISTINCT FROM NEW.is_active
    OR OLD.min_confidence_threshold IS DISTINCT FROM NEW.min_confidence_threshold
  ) THEN
    NEW.current_version := COALESCE(OLD.current_version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bump_strategy_version ON public.ai_response_strategies;
CREATE TRIGGER trg_bump_strategy_version
BEFORE UPDATE ON public.ai_response_strategies
FOR EACH ROW EXECUTE FUNCTION public.bump_strategy_version();

DROP TRIGGER IF EXISTS trg_snapshot_strategy ON public.ai_response_strategies;
CREATE TRIGGER trg_snapshot_strategy
AFTER INSERT OR UPDATE ON public.ai_response_strategies
FOR EACH ROW EXECUTE FUNCTION public.snapshot_strategy();

-- ============================================================
-- 6. APPROVAL & ROLLBACK RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_meta_principle(
  _principle_id uuid,
  _effective_at timestamp with time zone DEFAULT now()
) RETURNS void AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve meta principles';
  END IF;
  UPDATE public.ai_meta_principles
  SET approval_status = 'approved', approved_by = auth.uid(), approved_at = now(),
      effective_at = _effective_at, is_active = true
  WHERE id = _principle_id;
  INSERT INTO public.ai_meta_audit_log (event_type, target_table, target_id, actor_id, actor_role, decision, output_payload)
  VALUES ('principle_approved', 'ai_meta_principles', _principle_id, auth.uid(), 'admin', 'approved',
    jsonb_build_object('effective_at', _effective_at));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_meta_principle(
  _principle_id uuid, _reason text
) RETURNS void AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reject meta principles';
  END IF;
  UPDATE public.ai_meta_principles
  SET approval_status = 'rejected', rejected_by = auth.uid(), rejected_at = now(),
      rejection_reason = _reason, is_active = false
  WHERE id = _principle_id;
  INSERT INTO public.ai_meta_audit_log (event_type, target_table, target_id, actor_id, actor_role, decision, reason)
  VALUES ('principle_rejected', 'ai_meta_principles', _principle_id, auth.uid(), 'admin', 'rejected', _reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.approve_meta_action(
  _action_id uuid, _effective_at timestamp with time zone DEFAULT now()
) RETURNS void AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve meta actions';
  END IF;
  UPDATE public.ai_meta_actions
  SET status = 'approved', applied_by = auth.uid(), applied_at = now(), effective_at = _effective_at
  WHERE id = _action_id;
  INSERT INTO public.ai_meta_audit_log (event_type, target_table, target_id, actor_id, actor_role, decision, output_payload)
  VALUES ('action_approved', 'ai_meta_actions', _action_id, auth.uid(), 'admin', 'approved',
    jsonb_build_object('effective_at', _effective_at));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_meta_action(
  _action_id uuid, _reason text
) RETURNS void AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reject meta actions';
  END IF;
  UPDATE public.ai_meta_actions
  SET status = 'rejected', rejected_by = auth.uid(), rejected_at = now(), rejection_reason = _reason
  WHERE id = _action_id;
  INSERT INTO public.ai_meta_audit_log (event_type, target_table, target_id, actor_id, actor_role, decision, reason)
  VALUES ('action_rejected', 'ai_meta_actions', _action_id, auth.uid(), 'admin', 'rejected', _reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.rollback_meta_principle(_version_id uuid)
RETURNS uuid AS $$
DECLARE v_snapshot jsonb; v_principle_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can rollback';
  END IF;
  SELECT snapshot, principle_id INTO v_snapshot, v_principle_id
  FROM public.ai_meta_principle_versions WHERE id = _version_id;
  IF v_snapshot IS NULL THEN RAISE EXCEPTION 'Version not found'; END IF;
  UPDATE public.ai_meta_principles SET
    principle = v_snapshot->>'principle',
    weight = (v_snapshot->>'weight')::numeric,
    context = v_snapshot->>'context',
    is_active = (v_snapshot->>'is_active')::boolean,
    approval_status = 'pending'
  WHERE id = v_principle_id;
  INSERT INTO public.ai_meta_audit_log (event_type, target_table, target_id, actor_id, actor_role, decision, output_payload)
  VALUES ('principle_rolled_back', 'ai_meta_principles', v_principle_id, auth.uid(), 'admin', 'rolled_back',
    jsonb_build_object('rolled_back_to_version_id', _version_id));
  RETURN v_principle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.rollback_strategy(_version_id uuid)
RETURNS uuid AS $$
DECLARE v_snapshot jsonb; v_strategy_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can rollback';
  END IF;
  SELECT snapshot, strategy_id INTO v_snapshot, v_strategy_id
  FROM public.ai_strategy_versions WHERE id = _version_id;
  IF v_snapshot IS NULL THEN RAISE EXCEPTION 'Version not found'; END IF;
  UPDATE public.ai_response_strategies SET
    name = v_snapshot->>'name',
    description = v_snapshot->>'description',
    prompt_addon = v_snapshot->>'prompt_addon',
    is_active = (v_snapshot->>'is_active')::boolean,
    min_confidence_threshold = COALESCE((v_snapshot->>'min_confidence_threshold')::numeric, 0)
  WHERE id = v_strategy_id;
  INSERT INTO public.ai_meta_audit_log (event_type, target_table, target_id, actor_id, actor_role, decision, output_payload)
  VALUES ('strategy_rolled_back', 'ai_response_strategies', v_strategy_id, auth.uid(), 'admin', 'rolled_back',
    jsonb_build_object('rolled_back_to_version_id', _version_id));
  RETURN v_strategy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 7. UPDATED get_active_principles (approval-aware)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_active_principles(
  _context text DEFAULT 'general',
  _limit integer DEFAULT 5
) RETURNS TABLE (id uuid, principle text, weight numeric, context text)
AS $$
  SELECT p.id, p.principle, p.weight, p.context
  FROM public.ai_meta_principles p
  WHERE p.is_active = true
    AND p.approval_status = 'approved'
    AND p.effective_at IS NOT NULL
    AND p.effective_at <= now()
    AND (p.context = _context OR p.context = 'general')
  ORDER BY CASE WHEN p.context = _context THEN 0 ELSE 1 END, p.weight DESC
  LIMIT _limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 8. AUDIT LOG HELPER FOR META RUNS
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_meta_run_audit(
  _run_id uuid, _event_type text,
  _input_stats jsonb DEFAULT '{}'::jsonb,
  _output_payload jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO public.ai_meta_audit_log (event_type, run_id, actor_role, input_stats, output_payload)
  VALUES (_event_type, _run_id, COALESCE(auth.role(), 'service_role'), _input_stats, _output_payload);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
