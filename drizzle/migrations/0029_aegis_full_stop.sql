-- MAXIMUM AI OS 43. KILL SWITCH: stop all agents + stop tasks + block execution + preserve audit, one atomic step.
CREATE OR REPLACE FUNCTION public.aegis_full_stop(_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; stopped int := 0;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF char_length(coalesce(trim(_reason),'')) < 20 THEN RAISE EXCEPTION 'AEGIS: teljes vészleállításhoz részletes indoklás kell (min. 20 karakter)'; END IF;
  -- 1) STOP ALL AGENTS
  INSERT INTO aegis_agent_controls(agent, state, reason, updated_by, updated_at) VALUES ('*', 'killed', left(_reason,500), auth.uid(), now())
  ON CONFLICT (agent) DO UPDATE SET state='killed', reason=EXCLUDED.reason, updated_by=EXCLUDED.updated_by, updated_at=now();
  -- 2) BLOCK EXECUTION (emergency pause blocks every workforce step)
  UPDATE empyrean_emergency_controls SET paused = true, reason = left(_reason,500), updated_at = now();
  -- 3) STOP TASKS
  FOR r IN SELECT id, status FROM workforce_plans WHERE status IN ('approved','in_progress') FOR UPDATE LOOP
    UPDATE workforce_plans SET status='cancelled', updated_at=now() WHERE id = r.id;
    INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (r.id, 'aegis_full_stop', auth.uid(), jsonb_build_object('from', r.status, 'reason', left(_reason,500)));
    stopped := stopped + 1;
  END LOOP;
  -- 4) PRESERVE AUDIT
  INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
  VALUES (auth.uid(), 'aegis', 'full_stop', '*', jsonb_build_object('reason', left(_reason,500), 'plans_stopped', stopped));
  RETURN jsonb_build_object('agents', 'killed', 'execution', 'paused', 'plans_stopped', stopped);
END $$;
REVOKE ALL ON FUNCTION public.aegis_full_stop(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aegis_full_stop(text) TO authenticated;