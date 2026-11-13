CREATE OR REPLACE FUNCTION public.workforce_evidence_ok(_r text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT char_length(t) >= 20
    AND t !~* '^(ok|oké|kész|done|megvan|megcsinálva|rendben|igen|teszt|test|x+|\.+|-+)[\s.!]*$'
    AND (t ~ '\d' OR t ~* 'https?://' OR array_length(regexp_split_to_array(t, '\s+'), 1) >= 5)
  FROM (SELECT trim(coalesce(_r, '')) AS t) s
$$;
REVOKE ALL ON FUNCTION public.workforce_evidence_ok(text) FROM PUBLIC, anon, authenticated;

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
  h := public.workforce_payload_hash(p.id);
  IF p.payload_hash IS NULL OR p.payload_hash <> h THEN
    UPDATE workforce_plans SET status = 'cancelled', updated_at = now() WHERE id = p.id;
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
  IF remaining = 0 THEN INSERT INTO workforce_audit(plan_id, action, actor) VALUES (st.plan_id, 'done', auth.uid()); END IF;
  RETURN CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END;
END $$;
REVOKE ALL ON FUNCTION public.workforce_execute_step(uuid,boolean,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workforce_execute_step(uuid,boolean,boolean,text) TO authenticated;