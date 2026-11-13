-- MAXIMUM AI OS 15. POLICY-AS-CODE + 16. ZERO-TRUST: machine-checked rules and a decision record for every execution attempt.
CREATE TABLE public.aegis_policies (
  code text PRIMARY KEY,
  title text NOT NULL,
  rule text NOT NULL,
  effect text NOT NULL CHECK (effect IN ('deny','require_privilege')),
  enabled boolean NOT NULL DEFAULT true,
  locked boolean NOT NULL DEFAULT false,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aegis_policies TO authenticated;
GRANT ALL ON public.aegis_policies TO service_role;
ALTER TABLE public.aegis_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read policies" ON public.aegis_policies FOR SELECT TO authenticated USING (public.empyrean_is_admin());

INSERT INTO public.aegis_policies(code, title, rule, effect, locked, params) VALUES
 ('high_risk_human', 'Magas kockázat → emberi jóváhagyás + időablak', 'IF plan.risk = RED THEN human_approval AND temporary_privilege REQUIRED', 'require_privilege', true, '{}'),
 ('financial_limit', 'Pénzügyi limit', 'IF amount_in_plan > limit_huf THEN deny', 'deny', true, '{"limit_huf":100000}'),
 ('red_hours', 'Piros művelet csak munkaidőben', 'IF plan.risk = RED AND hour(Budapest) NOT IN [from,to) THEN deny', 'deny', false, '{"from":8,"to":20}'),
 ('daily_step_limit', 'Napi végrehajtási limit', 'IF steps_today(actor) >= max THEN deny', 'deny', false, '{"max":100}'),
 ('evidence_required', 'Bizonyíték nélkül nincs siker', 'IF ok AND evidence_weak THEN deny', 'deny', true, '{}')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE public.aegis_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  who uuid,
  what text NOT NULL,
  why text,
  resource text NOT NULL,
  permission text NOT NULL,
  risk text,
  data_findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  consequence text,
  decision text NOT NULL CHECK (decision IN ('allow','deny')),
  policy_hits jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT ON public.aegis_decisions TO authenticated;
GRANT ALL ON public.aegis_decisions TO service_role;
ALTER TABLE public.aegis_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read decisions" ON public.aegis_decisions FOR SELECT TO authenticated USING (public.empyrean_is_admin());
CREATE TRIGGER aegis_append_only BEFORE UPDATE OR DELETE ON public.aegis_decisions FOR EACH ROW EXECUTE FUNCTION public.aegis_append_only();
CREATE INDEX aegis_decisions_created ON public.aegis_decisions(created_at DESC);

-- Largest HUF amount mentioned anywhere in the plan (goal + steps)
CREATE OR REPLACE FUNCTION public.aegis_plan_max_amount(_plan uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(max(nullif(regexp_replace(m[1], '[^0-9]', '', 'g'), '')::numeric), 0)
  FROM (
    SELECT goal AS t FROM workforce_plans WHERE id = _plan
    UNION ALL SELECT coalesce(task,'') || ' ' || coalesce(evidence,'') FROM workforce_plan_steps WHERE plan_id = _plan
  ) s, LATERAL regexp_matches(s.t, '(\d[\d \.]{0,15})\s*(ft|huf|forint)', 'gi') m
$$;

CREATE OR REPLACE FUNCTION public.aegis_evaluate_policies(_plan uuid, _actor uuid)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p workforce_plans; pol record; hits text[] := '{}'; h int; n int;
BEGIN
  SELECT * INTO p FROM workforce_plans WHERE id = _plan;
  FOR pol IN SELECT * FROM aegis_policies WHERE enabled OR locked LOOP
    IF pol.code = 'financial_limit' AND public.aegis_plan_max_amount(_plan) > coalesce((pol.params->>'limit_huf')::numeric, 100000) THEN
      hits := hits || 'financial_limit';
    ELSIF pol.code = 'red_hours' AND p.risk = 'red' THEN
      h := extract(hour FROM now() AT TIME ZONE 'Europe/Budapest');
      IF h < coalesce((pol.params->>'from')::int, 8) OR h >= coalesce((pol.params->>'to')::int, 20) THEN hits := hits || 'red_hours'; END IF;
    ELSIF pol.code = 'daily_step_limit' THEN
      SELECT count(*) INTO n FROM workforce_audit WHERE actor = _actor AND action IN ('step_done','step_failed') AND created_at > now() - interval '24 hours';
      IF n >= coalesce((pol.params->>'max')::int, 100) THEN hits := hits || 'daily_step_limit'; END IF;
    END IF;
  END LOOP;
  RETURN hits;
END $$;

CREATE OR REPLACE FUNCTION public.aegis_log_decision(_p workforce_plans, _st workforce_plan_steps, _decision text, _hits text[], _findings text[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO aegis_decisions(who, what, why, resource, permission, risk, data_findings, consequence, decision, policy_hits)
  VALUES (auth.uid(), 'workforce.execute_step: ' || coalesce(_st.phase,'?'), left(_p.goal, 300),
    'plan:' || _p.id || ' / step:' || _st.id,
    'admin' || CASE WHEN _p.risk = 'red' THEN CASE WHEN public.aegis_privilege_active(_p.id) THEN ' + ideiglenes jogosultság' ELSE ' (nincs időablak)' END ELSE '' END,
    _p.risk, to_jsonb(coalesce(_findings, '{}'::text[])),
    CASE WHEN public.aegis_plan_max_amount(_p.id) > 0 THEN 'pénzösszeg: ' || public.aegis_plan_max_amount(_p.id) || ' Ft' ELSE 'állapotváltás: ' || coalesce(_st.phase,'') END,
    _decision, to_jsonb(coalesce(_hits, '{}'::text[])))
$$;

CREATE OR REPLACE FUNCTION public.aegis_set_policy(_code text, _enabled boolean, _params jsonb, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur aegis_policies;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF char_length(coalesce(trim(_reason),'')) < 20 THEN RAISE EXCEPTION 'AEGIS: szabálymódosításhoz részletes indoklás kell (min. 20 karakter)'; END IF;
  SELECT * INTO cur FROM aegis_policies WHERE code = _code FOR UPDATE;
  IF cur.code IS NULL THEN RAISE EXCEPTION 'nincs ilyen szabály'; END IF;
  IF cur.locked AND _enabled IS FALSE THEN RAISE EXCEPTION 'AEGIS: alapszabály, nem kapcsolható ki'; END IF;
  IF _code = 'financial_limit' AND (_params->>'limit_huf')::numeric NOT BETWEEN 0 AND 10000000 THEN RAISE EXCEPTION 'AEGIS: a limit 0 és 10 000 000 Ft között lehet'; END IF;
  IF _code = 'red_hours' AND ((_params->>'from')::int NOT BETWEEN 0 AND 23 OR (_params->>'to')::int NOT BETWEEN 1 AND 24 OR (_params->>'from')::int >= (_params->>'to')::int) THEN RAISE EXCEPTION 'AEGIS: érvénytelen időszak'; END IF;
  IF _code = 'daily_step_limit' AND (_params->>'max')::int NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'AEGIS: a napi limit 1 és 1000 között lehet'; END IF;
  UPDATE aegis_policies SET enabled = coalesce(_enabled, enabled), params = CASE WHEN _code IN ('financial_limit','red_hours','daily_step_limit') THEN coalesce(_params, params) ELSE params END, updated_by = auth.uid(), updated_at = now() WHERE code = _code;
  INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
  VALUES (auth.uid(), 'aegis', 'policy_change', _code, jsonb_build_object('from', jsonb_build_object('enabled', cur.enabled, 'params', cur.params), 'to', jsonb_build_object('enabled', _enabled, 'params', _params), 'reason', left(_reason,500)));
END $$;

REVOKE ALL ON FUNCTION public.aegis_plan_max_amount(uuid), public.aegis_evaluate_policies(uuid,uuid), public.aegis_log_decision(workforce_plans, workforce_plan_steps, text, text[], text[]), public.aegis_set_policy(text,boolean,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aegis_set_policy(text,boolean,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.workforce_execute_step(_step uuid, _confirmed boolean, _ok boolean, _result text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st workforce_plan_steps; p workforce_plans; blockers int; remaining int; f text[]; recent int; strikes int; h text; hits text[];
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM empyrean_emergency_controls WHERE scope = 'global' AND (paused OR read_only)) THEN
    RAISE EXCEPTION 'AEGIS: vészleállítás aktív — végrehajtás tiltva'; END IF;
  SELECT count(*) INTO strikes FROM workforce_audit WHERE actor = auth.uid() AND action IN ('aegis_blocked','aegis_tamper','aegis_policy') AND created_at > now() - interval '10 minutes';
  IF strikes >= 3 THEN RAISE EXCEPTION 'AEGIS: 3 blokkolt kísérlet 10 percen belül — végrehajtás 10 percre zárolva'; END IF;
  SELECT count(*) INTO recent FROM workforce_audit WHERE actor = auth.uid() AND action IN ('step_done','step_failed') AND created_at > now() - interval '1 minute';
  IF recent >= 20 THEN RAISE EXCEPTION 'AEGIS: túl sok végrehajtás percenként (max. 20)'; END IF;
  IF _confirmed IS NOT TRUE THEN RAISE EXCEPTION 'megerősítés nélkül nem hajtható végre'; END IF;
  IF char_length(coalesce(trim(_result),'')) < 3 THEN RAISE EXCEPTION 'eredmény/bizonyíték kötelező'; END IF;
  SELECT * INTO st FROM workforce_plan_steps WHERE id = _step FOR UPDATE;
  IF st.id IS NULL THEN RAISE EXCEPTION 'nincs ilyen lépés'; END IF;
  SELECT * INTO p FROM workforce_plans WHERE id = st.plan_id FOR UPDATE;
  f := public.aegis_scan(_result);
  IF _ok AND NOT public.workforce_evidence_ok(_result) THEN
    INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail)
    VALUES (st.plan_id, _step, 'aegis_weak_evidence', auth.uid(), jsonb_build_object('phase', st.phase, 'result', left(_result, 200)));
    PERFORM public.aegis_log_decision(p, st, 'deny', ARRAY['evidence_required'], f);
    RETURN 'aegis_weak_evidence';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(f) x WHERE x LIKE 'block:%') THEN
    INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail)
    VALUES (st.plan_id, _step, 'aegis_blocked', auth.uid(), jsonb_build_object('phase', st.phase, 'findings', to_jsonb(f)));
    PERFORM public.aegis_log_decision(p, st, 'deny', ARRAY['output_scan'], f);
    RETURN 'aegis_blocked';
  END IF;
  IF p.status NOT IN ('approved','in_progress') THEN RAISE EXCEPTION 'a terv nincs jóváhagyva (%)', p.status; END IF;
  IF p.status = 'approved' AND p.approval_expires_at IS NOT NULL AND p.approval_expires_at < now() THEN
    RAISE EXCEPTION 'AEGIS: a jóváhagyás lejárt — újítsd meg'; END IF;
  IF p.risk = 'red' AND NOT public.aegis_privilege_active(p.id) THEN
    PERFORM public.aegis_log_decision(p, st, 'deny', ARRAY['high_risk_human'], f);
    RETURN 'aegis_privilege';
  END IF;
  hits := public.aegis_evaluate_policies(p.id, auth.uid());
  IF cardinality(hits) > 0 THEN
    INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail)
    VALUES (p.id, _step, 'aegis_policy', auth.uid(), jsonb_build_object('phase', st.phase, 'findings', to_jsonb(hits), 'amount', public.aegis_plan_max_amount(p.id)));
    PERFORM public.aegis_log_decision(p, st, 'deny', hits, f);
    RETURN 'aegis_policy';
  END IF;
  h := public.workforce_payload_hash(p.id);
  IF p.payload_hash IS NULL OR p.payload_hash <> h THEN
    UPDATE workforce_plans SET status = 'cancelled', updated_at = now() WHERE id = p.id;
    UPDATE aegis_privilege_grants SET revoked_at = now(), revoke_reason = 'AEGIS: tartalom eltért' WHERE plan_id = p.id AND revoked_at IS NULL;
    INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail)
    VALUES (p.id, _step, 'aegis_tamper', auth.uid(), jsonb_build_object('phase', st.phase, 'findings', jsonb_build_array('payload_tamper'), 'approved_hash', p.payload_hash, 'current_hash', h));
    PERFORM public.aegis_log_decision(p, st, 'deny', ARRAY['payload_tamper'], f);
    RETURN 'aegis_tamper';
  END IF;
  IF st.status = 'done' THEN RAISE EXCEPTION 'a lépés már kész (ismételt végrehajtás tiltva)'; END IF;
  SELECT count(*) INTO blockers FROM workforce_plan_steps WHERE plan_id = st.plan_id AND idx < st.idx AND status <> 'done';
  IF blockers > 0 THEN RAISE EXCEPTION 'előbb az előző lépéseket kell befejezni'; END IF;
  PERFORM public.aegis_log_decision(p, st, 'allow', '{}'::text[], f);
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