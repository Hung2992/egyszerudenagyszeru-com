CREATE OR REPLACE FUNCTION public.aegis_evaluate_policies(_plan uuid, _actor uuid)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p workforce_plans; pol record; hits text[] := '{}'; h int; n int;
BEGIN
  SELECT * INTO p FROM workforce_plans WHERE id = _plan;
  FOR pol IN SELECT * FROM aegis_policies WHERE enabled OR locked LOOP
    IF pol.code = 'financial_limit' AND public.aegis_plan_max_amount(_plan) > coalesce((pol.params->>'limit_huf')::numeric, 100000) THEN
      hits := array_append(hits, 'financial_limit'::text);
    ELSIF pol.code = 'red_hours' AND p.risk = 'red' THEN
      h := extract(hour FROM now() AT TIME ZONE 'Europe/Budapest');
      IF h < coalesce((pol.params->>'from')::int, 8) OR h >= coalesce((pol.params->>'to')::int, 20) THEN hits := array_append(hits, 'red_hours'::text); END IF;
    ELSIF pol.code = 'daily_step_limit' THEN
      SELECT count(*) INTO n FROM workforce_audit WHERE actor = _actor AND action IN ('step_done','step_failed') AND created_at > now() - interval '24 hours';
      IF n >= coalesce((pol.params->>'max')::int, 100) THEN hits := array_append(hits, 'daily_step_limit'::text); END IF;
    END IF;
  END LOOP;
  RETURN hits;
END $$;
REVOKE ALL ON FUNCTION public.aegis_evaluate_policies(uuid,uuid) FROM PUBLIC, anon, authenticated;