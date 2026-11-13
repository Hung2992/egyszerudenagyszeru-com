CREATE OR REPLACE FUNCTION public.aegis_scan(_t text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN _t ~* '(ignore|hagyd figyelmen kívül|felejtsd el).{0,40}(instruction|utasítás|szabály)|system prompt|jailbreak|szűrők nélkül|korlátok nélkül' THEN 'block:prompt_injection' END,
    CASE WHEN _t ~* '(service[_ ]?role|api[_ -]?kulcs|api[_ -]?key|jelszav|password|secret|\.env|titkos kulcs|eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_)' THEN 'block:credential' END,
    CASE WHEN _t ~* '(adj|tegyél|legyen).{0,30}(admin|szuperadmin|super admin)|rls.{0,20}(kikapcs|töröl|disable)|bypass' THEN 'block:privilege' END,
    CASE WHEN _t ~* '(\d[ -]?){13,19}|\mcvv\M|\mcvc\M' THEN 'block:card_data' END,
    CASE WHEN _t ~* '(localhost|127\.0\.0\.1|169\.254\.|metadata\.google)' THEN 'block:ssrf' END,
    CASE WHEN _t ~* '(mind(en|et)|összes).{0,30}(töröl|felülír|átír)|drop table|truncate' THEN 'warn:mass_change' END,
    CASE WHEN _t ~* '(utal|visszatérít|kifizet|refund)' THEN 'warn:money' END
  ], NULL)
$$;

CREATE OR REPLACE FUNCTION public.workforce_guard_plan()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE f text[] := public.aegis_scan(NEW.goal);
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(f) x WHERE x LIKE 'block:%') THEN
    RAISE EXCEPTION 'AEGIS blokk: %', array_to_string(f, ', '); END IF;
  -- a kockázatot a szerver nem engedi lefelé hamisítani
  IF 'warn:money' = ANY(f) AND NEW.risk = 'green' THEN NEW.risk := 'red'; END IF;
  IF 'warn:mass_change' = ANY(f) AND NEW.risk = 'green' THEN NEW.risk := 'yellow'; END IF;
  NEW.plan := NEW.plan || jsonb_build_object('aegis', to_jsonb(f));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS workforce_guard_plan ON public.workforce_plans;
CREATE TRIGGER workforce_guard_plan BEFORE INSERT ON public.workforce_plans FOR EACH ROW EXECUTE FUNCTION public.workforce_guard_plan();

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
    approved_at = CASE WHEN _status='approved' THEN now() ELSE approved_at END WHERE id = _plan;
  INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (_plan, _status, auth.uid(), jsonb_build_object('from', cur, 'note', left(_note, 500), 'risk', rk));
END $$;

CREATE OR REPLACE FUNCTION public.workforce_execute_step(_step uuid, _confirmed boolean, _ok boolean, _result text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st workforce_plan_steps; pst text; blockers int; remaining int; f text[];
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
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
  SELECT status INTO pst FROM workforce_plans WHERE id = st.plan_id FOR UPDATE;
  IF pst NOT IN ('approved','in_progress') THEN RAISE EXCEPTION 'a terv nincs jóváhagyva (%)', pst; END IF;
  IF st.status = 'done' THEN RAISE EXCEPTION 'a lépés már kész'; END IF;
  SELECT count(*) INTO blockers FROM workforce_plan_steps WHERE plan_id = st.plan_id AND idx < st.idx AND status <> 'done';
  IF blockers > 0 THEN RAISE EXCEPTION 'előbb az előző lépéseket kell befejezni'; END IF;
  UPDATE workforce_plan_steps SET status = CASE WHEN _ok THEN 'done' ELSE 'failed' END, result = left(_result, 2000), executed_by = auth.uid(), executed_at = now() WHERE id = _step;
  SELECT count(*) INTO remaining FROM workforce_plan_steps WHERE plan_id = st.plan_id AND status <> 'done';
  UPDATE workforce_plans SET status = CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END, updated_at = now() WHERE id = st.plan_id;
  INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail) VALUES (st.plan_id, _step, CASE WHEN _ok THEN 'step_done' ELSE 'step_failed' END, auth.uid(), jsonb_build_object('phase', st.phase, 'result', left(_result, 500), 'aegis', to_jsonb(f)));
  IF remaining = 0 THEN INSERT INTO workforce_audit(plan_id, action, actor) VALUES (st.plan_id, 'done', auth.uid()); END IF;
  RETURN CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END;
END $$;