-- MAXIMUM AI OS 17. TEMPORARY PRIVILEGE: red-risk plans execute only inside a short, approved, auto-expiring window.
CREATE TABLE public.aegis_privilege_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  capability text NOT NULL DEFAULT 'red_execution',
  reason text NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason text
);
GRANT SELECT ON public.aegis_privilege_grants TO authenticated;
GRANT ALL ON public.aegis_privilege_grants TO service_role;
ALTER TABLE public.aegis_privilege_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read grants" ON public.aegis_privilege_grants FOR SELECT TO authenticated USING (public.empyrean_is_admin());
CREATE INDEX aegis_privilege_grants_plan ON public.aegis_privilege_grants(plan_id) WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.aegis_privilege_active(_plan uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM aegis_privilege_grants WHERE plan_id = _plan AND revoked_at IS NULL AND expires_at > now())
$$;

CREATE OR REPLACE FUNCTION public.aegis_grant_privilege(_plan uuid, _minutes int, _reason text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p workforce_plans; exp timestamptz;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM empyrean_emergency_controls WHERE scope = 'global' AND (paused OR read_only)) THEN
    RAISE EXCEPTION 'AEGIS: vészleállítás aktív — jogosultság nem adható'; END IF;
  IF _minutes IS NULL OR _minutes < 5 OR _minutes > 240 THEN RAISE EXCEPTION 'AEGIS: az időablak 5–240 perc lehet'; END IF;
  IF char_length(coalesce(trim(_reason),'')) < 20 THEN RAISE EXCEPTION 'AEGIS: ideiglenes jogosultsághoz részletes indoklás kell (min. 20 karakter)'; END IF;
  SELECT * INTO p FROM workforce_plans WHERE id = _plan FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'nincs ilyen terv'; END IF;
  IF p.risk <> 'red' THEN RAISE EXCEPTION 'AEGIS: ideiglenes jogosultság csak piros kockázatú tervhez kell'; END IF;
  IF p.status NOT IN ('approved','in_progress') THEN RAISE EXCEPTION 'AEGIS: előbb jóvá kell hagyni a tervet'; END IF;
  IF public.aegis_privilege_active(_plan) THEN RAISE EXCEPTION 'AEGIS: már van érvényes jogosultság ehhez a tervhez'; END IF;
  exp := now() + make_interval(mins => _minutes);
  INSERT INTO aegis_privilege_grants(plan_id, reason, granted_by, expires_at) VALUES (_plan, left(_reason,500), auth.uid(), exp);
  INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (_plan, 'privilege_granted', auth.uid(), jsonb_build_object('minutes', _minutes, 'expires_at', exp, 'reason', left(_reason,500)));
  RETURN exp;
END $$;

CREATE OR REPLACE FUNCTION public.aegis_revoke_privilege(_plan uuid, _reason text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE aegis_privilege_grants SET revoked_at = now(), revoke_reason = left(coalesce(_reason,'kézi visszavonás'),500)
  WHERE plan_id = _plan AND revoked_at IS NULL AND expires_at > now();
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (_plan, 'privilege_revoked', auth.uid(), jsonb_build_object('reason', left(coalesce(_reason,'kézi visszavonás'),500))); END IF;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.aegis_privilege_active(uuid), public.aegis_grant_privilege(uuid,int,text), public.aegis_revoke_privilege(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aegis_grant_privilege(uuid,int,text), public.aegis_revoke_privilege(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aegis_privilege_active(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.workforce_execute_step(_step uuid, _confirmed boolean, _ok boolean, _result text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st workforce_plan_steps; p workforce_plans; blockers int; remaining int; f text[]; recent int; strikes int; h text;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM empyrean_emergency_controls WHERE scope = 'global' AND (paused OR read_only)) THEN
    RAISE EXCEPTION 'AEGIS: vészleállítás aktív — végrehajtás tiltva'; END IF;
  SELECT count(*) INTO strikes FROM workforce_audit WHERE actor = auth.uid() AND action IN ('aegis_blocked','aegis_tamper') AND created_at > now() - interval '10 minutes';
  IF strikes >= 3 THEN RAISE EXCEPTION 'AEGIS: 3 blokkolt kísérlet 10 percen belül — végrehajtás 10 percre zárolva'; END IF;
  SELECT count(*) INTO recent FROM workforce_audit WHERE actor = auth.uid() AND action IN ('step_done','step_failed') AND created_at > now() - interval '1 minute';
  IF recent >= 20 THEN RAISE EXCEPTION 'AEGIS: túl sok végrehajtás percenként (max. 20)'; END IF;
  IF _confirmed IS NOT TRUE THEN RAISE EXCEPTION 'megerősítés nélkül nem hajtható végre'; END IF;
  IF char_length(coalesce(trim(_result),'')) < 3 THEN RAISE EXCEPTION 'eredmény/bizonyíték kötelező'; END IF;
  SELECT * INTO st FROM workforce_plan_steps WHERE id = _step FOR UPDATE;
  IF st.id IS NULL THEN RAISE EXCEPTION 'nincs ilyen lépés'; END IF;
  IF _ok AND NOT public.workforce_evidence_ok(_result) THEN
    INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail)
    VALUES (st.plan_id, _step, 'aegis_weak_evidence', auth.uid(), jsonb_build_object('phase', st.phase, 'result', left(_result, 200)));
    RETURN 'aegis_weak_evidence';
  END IF;
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
  IF p.risk = 'red' AND NOT public.aegis_privilege_active(p.id) THEN
    RAISE EXCEPTION 'AEGIS: piros tervhez érvényes ideiglenes jogosultság kell — kérj időablakot'; END IF;
  h := public.workforce_payload_hash(p.id);
  IF p.payload_hash IS NULL OR p.payload_hash <> h THEN
    UPDATE workforce_plans SET status = 'cancelled', updated_at = now() WHERE id = p.id;
    UPDATE aegis_privilege_grants SET revoked_at = now(), revoke_reason = 'AEGIS: tartalom eltért' WHERE plan_id = p.id AND revoked_at IS NULL;
    INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail)
    VALUES (p.id, _step, 'aegis_tamper', auth.uid(), jsonb_build_object('phase', st.phase, 'findings', jsonb_build_array('payload_tamper'), 'approved_hash', p.payload_hash, 'current_hash', h));
    RETURN 'aegis_tamper';
  END IF;
  IF st.status = 'done' THEN RAISE EXCEPTION 'a lépés már kész (ismételt végrehajtás tiltva)'; END IF;
  SELECT count(*) INTO blockers FROM workforce_plan_steps WHERE plan_id = st.plan_id AND idx < st.idx AND status <> 'done';
  IF blockers > 0 THEN RAISE EXCEPTION 'előbb az előző lépéseket kell befejezni'; END IF;
  UPDATE workforce_plan_steps SET status = CASE WHEN _ok THEN 'done' ELSE 'failed' END, result = left(_result, 2000), executed_by = auth.uid(), executed_at = now() WHERE id = _step;
  SELECT count(*) INTO remaining FROM workforce_plan_steps WHERE plan_id = st.plan_id AND status <> 'done';
  UPDATE workforce_plans SET status = CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END, updated_at = now() WHERE id = st.plan_id;
  INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail) VALUES (st.plan_id, _step, CASE WHEN _ok THEN 'step_done' ELSE 'step_failed' END, auth.uid(), jsonb_build_object('phase', st.phase, 'result', left(_result, 500), 'aegis', to_jsonb(f), 'payload_hash', h));
  IF remaining = 0 THEN
    INSERT INTO workforce_audit(plan_id, action, actor) VALUES (st.plan_id, 'done', auth.uid());
    UPDATE aegis_privilege_grants SET revoked_at = now(), revoke_reason = 'terv kész — automatikus visszavonás' WHERE plan_id = st.plan_id AND revoked_at IS NULL;
  END IF;
  RETURN CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END;
END $$;
REVOKE ALL ON FUNCTION public.workforce_execute_step(uuid,boolean,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workforce_execute_step(uuid,boolean,boolean,text) TO authenticated;

-- Kill switch also revokes every temporary privilege (43. REVOKE TEMPORARY ACCESS)
CREATE OR REPLACE FUNCTION public.aegis_full_stop(_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; stopped int := 0; revoked int := 0;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF char_length(coalesce(trim(_reason),'')) < 20 THEN RAISE EXCEPTION 'AEGIS: teljes vészleállításhoz részletes indoklás kell (min. 20 karakter)'; END IF;
  INSERT INTO aegis_agent_controls(agent, state, reason, updated_by, updated_at) VALUES ('*', 'killed', left(_reason,500), auth.uid(), now())
  ON CONFLICT (agent) DO UPDATE SET state='killed', reason=EXCLUDED.reason, updated_by=EXCLUDED.updated_by, updated_at=now();
  UPDATE empyrean_emergency_controls SET paused = true, reason = left(_reason,500), updated_at = now();
  UPDATE aegis_privilege_grants SET revoked_at = now(), revoke_reason = 'AEGIS: teljes vészleállítás' WHERE revoked_at IS NULL AND expires_at > now();
  GET DIAGNOSTICS revoked = ROW_COUNT;
  FOR r IN SELECT id, status FROM workforce_plans WHERE status IN ('approved','in_progress') FOR UPDATE LOOP
    UPDATE workforce_plans SET status='cancelled', updated_at=now() WHERE id = r.id;
    INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (r.id, 'aegis_full_stop', auth.uid(), jsonb_build_object('from', r.status, 'reason', left(_reason,500)));
    stopped := stopped + 1;
  END LOOP;
  INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
  VALUES (auth.uid(), 'aegis', 'full_stop', '*', jsonb_build_object('reason', left(_reason,500), 'plans_stopped', stopped, 'privileges_revoked', revoked));
  RETURN jsonb_build_object('agents', 'killed', 'execution', 'paused', 'plans_stopped', stopped, 'privileges_revoked', revoked);
END $$;
REVOKE ALL ON FUNCTION public.aegis_full_stop(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aegis_full_stop(text) TO authenticated;