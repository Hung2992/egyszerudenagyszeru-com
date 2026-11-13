CREATE TABLE public.workforce_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal text NOT NULL CHECK (char_length(goal) BETWEEN 1 AND 1000),
  risk text NOT NULL CHECK (risk IN ('green','yellow','red')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','in_progress','done','cancelled')),
  owner text NOT NULL,
  due_date date,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  approved_by uuid, approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.workforce_plan_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workforce_plans(id) ON DELETE CASCADE,
  idx int NOT NULL,
  phase text NOT NULL, owner text NOT NULL, reviewer text NOT NULL, task text NOT NULL, evidence text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','failed')),
  result text, executed_by uuid, executed_at timestamptz,
  UNIQUE (plan_id, idx)
);
CREATE TABLE public.workforce_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workforce_plans(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.workforce_plan_steps(id) ON DELETE SET NULL,
  action text NOT NULL, actor uuid, detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workforce_plans, public.workforce_plan_steps, public.workforce_audit TO authenticated;
GRANT ALL ON public.workforce_plans, public.workforce_plan_steps, public.workforce_audit TO service_role;
ALTER TABLE public.workforce_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_plan_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read plans" ON public.workforce_plans FOR SELECT TO authenticated USING (public.empyrean_is_admin());
CREATE POLICY "admin read steps" ON public.workforce_plan_steps FOR SELECT TO authenticated USING (public.empyrean_is_admin());
CREATE POLICY "admin read audit" ON public.workforce_audit FOR SELECT TO authenticated USING (public.empyrean_is_admin());

CREATE OR REPLACE FUNCTION public.workforce_save_plan(_goal text, _risk text, _owner text, _due date, _plan jsonb, _steps jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid; s jsonb; i int := 0;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF jsonb_array_length(coalesce(_steps,'[]')) = 0 THEN RAISE EXCEPTION 'blokkolt vagy üres terv nem menthető'; END IF;
  INSERT INTO workforce_plans(goal, risk, owner, due_date, plan) VALUES (_goal, _risk, _owner, _due, coalesce(_plan,'{}')) RETURNING id INTO pid;
  FOR s IN SELECT * FROM jsonb_array_elements(_steps) LOOP
    INSERT INTO workforce_plan_steps(plan_id, idx, phase, owner, reviewer, task, evidence, due_date)
    VALUES (pid, i, s->>'phase', s->>'owner', s->>'reviewer', s->>'task', s->>'evidence', nullif(s->>'due_date','')::date);
    i := i + 1;
  END LOOP;
  INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (pid, 'created', auth.uid(), jsonb_build_object('risk', _risk, 'steps', i));
  RETURN pid;
END $$;

CREATE OR REPLACE FUNCTION public.workforce_set_status(_plan uuid, _status text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur text;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT status INTO cur FROM workforce_plans WHERE id = _plan FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'nincs ilyen terv'; END IF;
  IF NOT ((cur = 'draft' AND _status IN ('approved','cancelled')) OR (cur IN ('approved','in_progress') AND _status = 'cancelled')) THEN
    RAISE EXCEPTION 'tiltott állapotváltás: % → %', cur, _status; END IF;
  UPDATE workforce_plans SET status = _status, updated_at = now(),
    approved_by = CASE WHEN _status='approved' THEN auth.uid() ELSE approved_by END,
    approved_at = CASE WHEN _status='approved' THEN now() ELSE approved_at END WHERE id = _plan;
  INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (_plan, _status, auth.uid(), jsonb_build_object('from', cur, 'note', _note));
END $$;

CREATE OR REPLACE FUNCTION public.workforce_execute_step(_step uuid, _confirmed boolean, _ok boolean, _result text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st workforce_plan_steps; pst text; blockers int; remaining int;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _confirmed IS NOT TRUE THEN RAISE EXCEPTION 'megerősítés nélkül nem hajtható végre'; END IF;
  IF char_length(coalesce(trim(_result),'')) < 3 THEN RAISE EXCEPTION 'eredmény/bizonyíték kötelező'; END IF;
  SELECT * INTO st FROM workforce_plan_steps WHERE id = _step FOR UPDATE;
  IF st.id IS NULL THEN RAISE EXCEPTION 'nincs ilyen lépés'; END IF;
  SELECT status INTO pst FROM workforce_plans WHERE id = st.plan_id FOR UPDATE;
  IF pst NOT IN ('approved','in_progress') THEN RAISE EXCEPTION 'a terv nincs jóváhagyva (%)', pst; END IF;
  IF st.status = 'done' THEN RAISE EXCEPTION 'a lépés már kész'; END IF;
  SELECT count(*) INTO blockers FROM workforce_plan_steps WHERE plan_id = st.plan_id AND idx < st.idx AND status <> 'done';
  IF blockers > 0 THEN RAISE EXCEPTION 'előbb az előző lépéseket kell befejezni'; END IF;
  UPDATE workforce_plan_steps SET status = CASE WHEN _ok THEN 'done' ELSE 'failed' END, result = left(_result, 2000), executed_by = auth.uid(), executed_at = now() WHERE id = _step;
  SELECT count(*) INTO remaining FROM workforce_plan_steps WHERE plan_id = st.plan_id AND status <> 'done';
  UPDATE workforce_plans SET status = CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END, updated_at = now() WHERE id = st.plan_id;
  INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail) VALUES (st.plan_id, _step, CASE WHEN _ok THEN 'step_done' ELSE 'step_failed' END, auth.uid(), jsonb_build_object('phase', st.phase, 'result', left(_result, 500)));
  IF remaining = 0 THEN INSERT INTO workforce_audit(plan_id, action, actor) VALUES (st.plan_id, 'done', auth.uid()); END IF;
  RETURN CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END;
END $$;
REVOKE ALL ON FUNCTION public.workforce_save_plan(text,text,text,date,jsonb,jsonb), public.workforce_set_status(uuid,text,text), public.workforce_execute_step(uuid,boolean,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workforce_save_plan(text,text,text,date,jsonb,jsonb), public.workforce_set_status(uuid,text,text), public.workforce_execute_step(uuid,boolean,boolean,text) TO authenticated;