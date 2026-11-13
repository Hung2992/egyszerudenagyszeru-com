-- AEGIS: költség-anomália észlelése (BLACK CROWN 23.: cost anomaly detection) + új incidensfajták
ALTER TABLE public.aegis_incidents DROP CONSTRAINT IF EXISTS aegis_incidents_kind_check;
ALTER TABLE public.aegis_incidents ADD CONSTRAINT aegis_incidents_kind_check
  CHECK (kind IN ('leak_isolate','attack_wave','stop_storm','cost_anomaly','prompt_leak_wave'));

CREATE TABLE public.ai_usage_hourly (
  function_name text NOT NULL,
  usage_hour timestamptz NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  tokens bigint NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (function_name, usage_hour)
);
GRANT SELECT ON public.ai_usage_hourly TO authenticated;
GRANT ALL ON public.ai_usage_hourly TO service_role;
ALTER TABLE public.ai_usage_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ai usage hourly" ON public.ai_usage_hourly FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.ai_record_usage(_fn text, _tokens integer, _cost numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
DECLARE s jsonb; m date := date_trunc('month', now())::date; f text := left(coalesce(_fn,'unknown'),80);
  h timestamptz := date_trunc('hour', now()); cur_calls int; cur_cost numeric; base_calls numeric; base_cost numeric; ev jsonb;
BEGIN
  INSERT INTO ai_usage_daily (function_name, usage_date, calls, tokens, cost)
  VALUES (f, current_date, 1, greatest(coalesce(_tokens,0),0), greatest(coalesce(_cost,0),0))
  ON CONFLICT (function_name, usage_date) DO UPDATE SET calls = ai_usage_daily.calls + 1,
    tokens = ai_usage_daily.tokens + EXCLUDED.tokens, cost = ai_usage_daily.cost + EXCLUDED.cost, updated_at = now();

  INSERT INTO ai_usage_hourly (function_name, usage_hour, calls, tokens, cost)
  VALUES (f, h, 1, greatest(coalesce(_tokens,0),0), greatest(coalesce(_cost,0),0))
  ON CONFLICT (function_name, usage_hour) DO UPDATE SET calls = ai_usage_hourly.calls + 1,
    tokens = ai_usage_hourly.tokens + EXCLUDED.tokens, cost = ai_usage_hourly.cost + EXCLUDED.cost
  RETURNING calls, cost INTO cur_calls, cur_cost;

  -- Költség-anomália: az órás hívásszám legalább 40 és az elmúlt 7 nap órás átlagának 5-szöröse.
  -- Csak riaszt, nem állít le: különben egy támadó tömeges kérdésekkel megbéníthatná a vásárlói segédet.
  IF cur_calls >= 40 THEN
    SELECT coalesce(sum(calls),0) / 168.0, coalesce(sum(cost),0) / 168.0 INTO base_calls, base_cost
      FROM ai_usage_hourly WHERE function_name = f AND usage_hour >= h - interval '7 days' AND usage_hour < h;
    IF cur_calls >= greatest(40, base_calls * 5)
       AND NOT EXISTS (SELECT 1 FROM aegis_incidents WHERE agent = f AND kind = 'cost_anomaly' AND status = 'open' AND opened_at > now() - interval '6 hours') THEN
      SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.usage_hour DESC), '[]') INTO ev
        FROM (SELECT usage_hour, calls, tokens, cost FROM ai_usage_hourly WHERE function_name = f ORDER BY usage_hour DESC LIMIT 24) x;
      INSERT INTO aegis_incidents(agent, kind, severity, action_taken, event_count, findings, preserved_events)
      VALUES (f, 'cost_anomaly', 'high', 'alert_only', cur_calls,
              ARRAY['calls_per_hour:' || cur_calls, 'baseline:' || round(base_calls,1), 'cost_hour:' || round(cur_cost,4)], ev);
      INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
      VALUES (NULL, 'aegis', 'cost_anomaly', f, jsonb_build_object('calls_hour', cur_calls, 'baseline', round(base_calls,2), 'cost_hour', round(cur_cost,4), 'baseline_cost', round(base_cost,4)));
      INSERT INTO admin_notifications(type, title, message, data)
      VALUES ('aegis_incident', 'AEGIS: szokatlan AI-költség', f || ': ebben az órában ' || cur_calls || ' hívás (szokásos: ~' || round(base_calls,1) || '/óra). Nézd meg, nem automatizált visszaélés-e.', jsonb_build_object('agent', f, 'kind', 'cost_anomaly'));
    END IF;
  END IF;

  s := public.ai_budget_state();
  IF s->>'state' <> 'ok' THEN
    UPDATE ai_budget SET last_warned_month = m WHERE id AND (last_warned_month IS DISTINCT FROM m);
    IF FOUND THEN
      INSERT INTO admin_notifications (type, title, message, data)
      VALUES ('warning', 'AI-keret figyelmeztetés', format('A havi AI-keret %s%%-a elfogyott (%s / %s kredit).', s->>'pct', s->>'used', s->>'limit'), s);
    END IF;
  END IF;
  RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.ai_record_usage(text, integer, numeric) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_record_usage(text, integer, numeric) TO service_role;

-- Rejtett-utasítás szivárgási hullám: 10 percen belül 3+ kanári-találat egy segédnél -> riasztás (nem leállítás).
CREATE OR REPLACE FUNCTION public.aegis_detect_prompt_leak()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; ev jsonb;
BEGIN
  IF NEW.stage <> 'output' OR NEW.action <> 'flagged' OR NOT ('prompt_leak' = ANY(NEW.findings)) THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM aegis_events WHERE source = NEW.source AND stage = 'output' AND action = 'flagged'
     AND 'prompt_leak' = ANY(findings) AND created_at > now() - interval '10 minutes';
  IF n >= 3 AND NOT EXISTS (SELECT 1 FROM aegis_incidents WHERE agent = NEW.source AND kind = 'prompt_leak_wave' AND status = 'open' AND opened_at > now() - interval '1 hour') THEN
    SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC), '[]') INTO ev FROM (
      SELECT id, source, stage, action, findings, created_at FROM aegis_events WHERE source = NEW.source AND created_at > now() - interval '1 hour' ORDER BY created_at DESC LIMIT 50) e;
    INSERT INTO aegis_incidents(agent, kind, severity, action_taken, event_count, findings, preserved_events)
    VALUES (NEW.source, 'prompt_leak_wave', 'high', 'alert_only', n, ARRAY['prompt_leak'], ev);
    INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
    VALUES (NULL, 'aegis', 'prompt_leak_wave', NEW.source, jsonb_build_object('events', n));
    INSERT INTO admin_notifications(type, title, message, data)
    VALUES ('aegis_incident', 'AEGIS: rejtett utasítások kicsalása', NEW.source || ': 10 percen belül ' || n || '-szor próbálták kicsalni a rejtett utasításait. Az AEGIS minden esetben visszatartotta a választ.', jsonb_build_object('agent', NEW.source, 'kind', 'prompt_leak_wave'));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER aegis_detect_prompt_leak AFTER INSERT ON public.aegis_events FOR EACH ROW EXECUTE FUNCTION public.aegis_detect_prompt_leak();
REVOKE ALL ON FUNCTION public.aegis_detect_prompt_leak() FROM PUBLIC, anon, authenticated;