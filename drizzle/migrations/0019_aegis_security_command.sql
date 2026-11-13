-- 1) Audit protection: append-only + tamper-evident hash chain
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER TABLE public.workforce_audit ADD COLUMN IF NOT EXISTS prev_hash text, ADD COLUMN IF NOT EXISTS hash text;

CREATE OR REPLACE FUNCTION public.aegis_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'AEGIS: a napló csak bővíthető (% tiltott a % táblán)', TG_OP, TG_TABLE_NAME;
END $$;
DROP TRIGGER IF EXISTS aegis_append_only ON public.workforce_audit;
CREATE TRIGGER aegis_append_only BEFORE UPDATE OR DELETE ON public.workforce_audit FOR EACH ROW EXECUTE FUNCTION public.aegis_append_only();
DROP TRIGGER IF EXISTS aegis_append_only ON public.aegis_events;
CREATE TRIGGER aegis_append_only BEFORE UPDATE OR DELETE ON public.aegis_events FOR EACH ROW EXECUTE FUNCTION public.aegis_append_only();
DROP TRIGGER IF EXISTS aegis_append_only ON public.empyrean_audit_log;
CREATE TRIGGER aegis_append_only BEFORE UPDATE OR DELETE ON public.empyrean_audit_log FOR EACH ROW EXECUTE FUNCTION public.aegis_append_only();

CREATE OR REPLACE FUNCTION public.workforce_audit_chain()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE prev text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('workforce_audit_chain'));
  SELECT hash INTO prev FROM workforce_audit WHERE hash IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1;
  NEW.prev_hash := coalesce(prev, 'GENESIS');
  NEW.hash := encode(extensions.digest(NEW.prev_hash || '|' || NEW.plan_id || '|' || coalesce(NEW.step_id::text,'') || '|' || NEW.action || '|' || coalesce(NEW.actor::text,'') || '|' || NEW.detail::text || '|' || NEW.created_at::text, 'sha256'), 'hex');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS workforce_audit_chain ON public.workforce_audit;
CREATE TRIGGER workforce_audit_chain BEFORE INSERT ON public.workforce_audit FOR EACH ROW EXECUTE FUNCTION public.workforce_audit_chain();

CREATE OR REPLACE FUNCTION public.aegis_verify_ledger()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r record; prev text := NULL; n int := 0; broken int := 0; legacy int := 0;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR r IN SELECT * FROM workforce_audit ORDER BY created_at, id LOOP
    IF r.hash IS NULL THEN legacy := legacy + 1; CONTINUE; END IF;
    n := n + 1;
    IF r.prev_hash <> coalesce(prev, r.prev_hash) OR r.hash <> encode(extensions.digest(r.prev_hash || '|' || r.plan_id || '|' || coalesce(r.step_id::text,'') || '|' || r.action || '|' || coalesce(r.actor::text,'') || '|' || r.detail::text || '|' || r.created_at::text, 'sha256'), 'hex') THEN
      broken := broken + 1; END IF;
    prev := r.hash;
  END LOOP;
  RETURN jsonb_build_object('checked', n, 'broken', broken, 'legacy', legacy, 'ok', broken = 0);
END $$;

-- 2) Approval expiry: plan approval valid 72h until first step runs
ALTER TABLE public.workforce_plans ADD COLUMN IF NOT EXISTS approval_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.workforce_set_status(_plan uuid, _status text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur text; rk text;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT status, risk INTO cur, rk FROM workforce_plans WHERE id = _plan FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'nincs ilyen terv'; END IF;
  IF NOT ((cur = 'draft' AND _status IN ('approved','cancelled')) OR (cur IN ('approved','in_progress') AND _status = 'cancelled')) THEN
    RAISE EXCEPTION 'tiltott állapotváltás: % → %', cur, _status; END IF;
  IF _status = 'approved' AND rk = 'red' AND char_length(coalesce(trim(_note),'')) < 10 THEN
    RAISE EXCEPTION 'AEGIS: piros kockázatú tervhez írásos indoklás kell (min. 10 karakter)'; END IF;
  UPDATE workforce_plans SET status = _status, updated_at = now(),
    approved_by = CASE WHEN _status='approved' THEN auth.uid() ELSE approved_by END,
    approved_at = CASE WHEN _status='approved' THEN now() ELSE approved_at END,
    approval_expires_at = CASE WHEN _status='approved' THEN now() + interval '72 hours' ELSE approval_expires_at END
  WHERE id = _plan;
  INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (_plan, _status, auth.uid(), jsonb_build_object('from', cur, 'note', left(_note, 500), 'risk', rk));
END $$;

-- re-approval of an expired plan
CREATE OR REPLACE FUNCTION public.workforce_reapprove(_plan uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p workforce_plans;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO p FROM workforce_plans WHERE id = _plan FOR UPDATE;
  IF p.status <> 'approved' OR p.approval_expires_at IS NULL OR p.approval_expires_at > now() THEN RAISE EXCEPTION 'csak lejárt jóváhagyás újítható meg'; END IF;
  IF p.risk = 'red' AND char_length(coalesce(trim(_note),'')) < 10 THEN RAISE EXCEPTION 'AEGIS: piros tervhez indoklás kell'; END IF;
  UPDATE workforce_plans SET approved_by = auth.uid(), approved_at = now(), approval_expires_at = now() + interval '72 hours', updated_at = now() WHERE id = _plan;
  INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (_plan, 'reapproved', auth.uid(), jsonb_build_object('note', left(_note, 500)));
END $$;

-- 3) Execution: emergency stop + expiry + rate limit + AEGIS lockout
CREATE OR REPLACE FUNCTION public.workforce_execute_step(_step uuid, _confirmed boolean, _ok boolean, _result text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st workforce_plan_steps; p workforce_plans; blockers int; remaining int; f text[]; recent int; strikes int;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM empyrean_emergency_controls WHERE scope = 'global' AND (paused OR read_only)) THEN
    RAISE EXCEPTION 'AEGIS: vészleállítás aktív — végrehajtás tiltva'; END IF;
  SELECT count(*) INTO strikes FROM workforce_audit WHERE actor = auth.uid() AND action = 'aegis_blocked' AND created_at > now() - interval '10 minutes';
  IF strikes >= 3 THEN RAISE EXCEPTION 'AEGIS: 3 blokkolt kísérlet 10 percen belül — végrehajtás 10 percre zárolva'; END IF;
  SELECT count(*) INTO recent FROM workforce_audit WHERE actor = auth.uid() AND action IN ('step_done','step_failed') AND created_at > now() - interval '1 minute';
  IF recent >= 20 THEN RAISE EXCEPTION 'AEGIS: túl sok végrehajtás percenként (max. 20)'; END IF;
  IF _confirmed IS NOT TRUE THEN RAISE EXCEPTION 'megerősítés nélkül nem hajtható végre'; END IF;
  IF char_length(coalesce(trim(_result),'')) < 3 THEN RAISE EXCEPTION 'eredmény/bizonyíték kötelező'; END IF;
  SELECT * INTO st FROM workforce_plan_steps WHERE id = _step FOR UPDATE;
  IF st.id IS NULL THEN RAISE EXCEPTION 'nincs ilyen lépés'; END IF;
  f := public.aegis_scan(_result);
  IF EXISTS (SELECT 1 FROM unnest(f) x WHERE x LIKE 'block:%') THEN
    INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail)
    VALUES (st.plan_id, _step, 'aegis_blocked', auth.uid(), jsonb_build_object('phase', st.phase, 'findings', to_jsonb(f)));
    RETURN 'aegis_blocked';
  END IF;
  SELECT * INTO p FROM workforce_plans WHERE id = st.plan_id FOR UPDATE;
  IF p.status NOT IN ('approved','in_progress') THEN RAISE EXCEPTION 'a terv nincs jóváhagyva (%)', p.status; END IF;
  IF p.status = 'approved' AND p.approval_expires_at IS NOT NULL AND p.approval_expires_at < now() THEN
    RAISE EXCEPTION 'AEGIS: a jóváhagyás lejárt — újítsd meg'; END IF;
  IF st.status = 'done' THEN RAISE EXCEPTION 'a lépés már kész (ismételt végrehajtás tiltva)'; END IF;
  SELECT count(*) INTO blockers FROM workforce_plan_steps WHERE plan_id = st.plan_id AND idx < st.idx AND status <> 'done';
  IF blockers > 0 THEN RAISE EXCEPTION 'előbb az előző lépéseket kell befejezni'; END IF;
  UPDATE workforce_plan_steps SET status = CASE WHEN _ok THEN 'done' ELSE 'failed' END, result = left(_result, 2000), executed_by = auth.uid(), executed_at = now() WHERE id = _step;
  SELECT count(*) INTO remaining FROM workforce_plan_steps WHERE plan_id = st.plan_id AND status <> 'done';
  UPDATE workforce_plans SET status = CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END, updated_at = now() WHERE id = st.plan_id;
  INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail) VALUES (st.plan_id, _step, CASE WHEN _ok THEN 'step_done' ELSE 'step_failed' END, auth.uid(), jsonb_build_object('phase', st.phase, 'result', left(_result, 500), 'aegis', to_jsonb(f)));
  IF remaining = 0 THEN INSERT INTO workforce_audit(plan_id, action, actor) VALUES (st.plan_id, 'done', auth.uid()); END IF;
  RETURN CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END;
END $$;

REVOKE ALL ON FUNCTION public.aegis_verify_ledger(), public.workforce_reapprove(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aegis_verify_ledger(), public.workforce_reapprove(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.aegis_append_only(), public.workforce_audit_chain() FROM PUBLIC, anon, authenticated;