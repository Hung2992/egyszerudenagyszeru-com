CREATE TABLE public.ai_usage_daily (
  function_name text NOT NULL,
  usage_date date NOT NULL DEFAULT current_date,
  calls integer NOT NULL DEFAULT 0,
  tokens bigint NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (function_name, usage_date)
);
GRANT SELECT ON public.ai_usage_daily TO authenticated;
GRANT ALL ON public.ai_usage_daily TO service_role;
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ai usage" ON public.ai_usage_daily FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.ai_budget_state()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
  WITH b AS (SELECT * FROM ai_budget WHERE id),
  u AS (SELECT coalesce(sum(c),0) AS used, coalesce(sum(n),0) AS calls, coalesce(sum(t),0) AS tokens FROM (
          SELECT estimated_cost_credits c, request_count n, token_count t FROM ai_usage_quota WHERE usage_date >= date_trunc('month', now())::date
          UNION ALL SELECT cost, calls, tokens FROM ai_usage_daily WHERE usage_date >= date_trunc('month', now())::date) x)
  SELECT jsonb_build_object('used', round(u.used,4), 'calls', u.calls, 'tokens', u.tokens,
    'limit', b.monthly_limit_credits, 'warn_pct', b.warn_pct, 'block_at_limit', b.block_at_limit,
    'pct', CASE WHEN b.monthly_limit_credits > 0 THEN round(u.used / b.monthly_limit_credits * 100, 1) END,
    'state', CASE WHEN b.monthly_limit_credits > 0 AND u.used >= b.monthly_limit_credits THEN (CASE WHEN b.block_at_limit THEN 'blocked' ELSE 'over' END)
                  WHEN b.monthly_limit_credits > 0 AND u.used >= b.monthly_limit_credits * b.warn_pct / 100.0 THEN 'warn' ELSE 'ok' END)
  FROM b, u
$$;

CREATE OR REPLACE FUNCTION public.ai_record_usage(_fn text, _tokens integer, _cost numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
DECLARE s jsonb; m date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO ai_usage_daily (function_name, usage_date, calls, tokens, cost)
  VALUES (left(coalesce(_fn,'unknown'),80), current_date, 1, greatest(coalesce(_tokens,0),0), greatest(coalesce(_cost,0),0))
  ON CONFLICT (function_name, usage_date) DO UPDATE SET calls = ai_usage_daily.calls + 1,
    tokens = ai_usage_daily.tokens + EXCLUDED.tokens, cost = ai_usage_daily.cost + EXCLUDED.cost, updated_at = now();
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

CREATE OR REPLACE FUNCTION public.empyrean_ai_budget()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  RETURN public.ai_budget_state() || jsonb_build_object('by_function', (SELECT coalesce(jsonb_agg(x ORDER BY x.cost DESC),'[]') FROM (
    SELECT fn, sum(n)::bigint AS calls, sum(t)::bigint AS tokens, round(sum(c),4) AS cost FROM (
      SELECT function_name fn, request_count n, token_count t, estimated_cost_credits c FROM ai_usage_quota WHERE usage_date >= date_trunc('month', now())::date
      UNION ALL SELECT function_name, calls, tokens, cost FROM ai_usage_daily WHERE usage_date >= date_trunc('month', now())::date) y GROUP BY 1) x));
END $$;

CREATE OR REPLACE FUNCTION public.empyrean_optimization_snapshot(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
DECLARE d integer := greatest(1, least(coalesce(_days,30), 365)); since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(_days,30), 365)));
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'generated_at', now(), 'days', d,
    'ai_cost_by_function', (SELECT coalesce(jsonb_agg(x ORDER BY x.cost DESC),'[]') FROM (
       SELECT function_name AS fn, sum(request_count)::bigint AS requests, sum(token_count)::bigint AS tokens, round(sum(estimated_cost_credits),4) AS cost
       FROM (SELECT function_name, usage_date, request_count, token_count, estimated_cost_credits FROM ai_usage_quota UNION ALL SELECT function_name, usage_date, calls, tokens, cost FROM ai_usage_daily) q WHERE usage_date >= (now()-make_interval(days=>d))::date GROUP BY function_name ORDER BY 4 DESC NULLS LAST LIMIT 15) x),
    'ai_cost_daily', (SELECT coalesce(jsonb_agg(x ORDER BY x.day),'[]') FROM (
       SELECT usage_date AS day, round(sum(estimated_cost_credits),4) AS cost FROM (SELECT function_name, usage_date, request_count, token_count, estimated_cost_credits FROM ai_usage_quota UNION ALL SELECT function_name, usage_date, calls, tokens, cost FROM ai_usage_daily) q
       WHERE usage_date >= (now()-make_interval(days=>d))::date GROUP BY usage_date) x),
    'cache', (SELECT jsonb_build_object('entries', count(*), 'hits', coalesce(sum(hit_count),0), 'live', count(*) FILTER (WHERE expires_at > now())) FROM ai_response_cache WHERE created_at >= since),
    'agents', (SELECT coalesce(jsonb_agg(x ORDER BY x.runs DESC),'[]') FROM (
       SELECT agent_slug AS slug, count(*) AS runs, count(*) FILTER (WHERE status IN ('completed','success','done')) AS ok,
              count(*) FILTER (WHERE status IN ('failed','error') AND NOT coalesce(error_message ~* '(AI 40[23]|credit|payment_required|ai_budget_exhausted)', false)) AS failed, count(*) FILTER (WHERE status IN ('failed','error') AND coalesce(error_message ~* '(AI 40[23]|credit|payment_required|ai_budget_exhausted)', false)) AS credit_blocked, coalesce(round(avg(duration_ms)),0) AS avg_ms,
              coalesce(round(sum(cost_credits),4),0) AS cost, coalesce(sum(tasks_completed),0) AS tasks_done
       FROM ai_agent_runs WHERE created_at >= since GROUP BY agent_slug LIMIT 25) x),
    'feedback', (SELECT jsonb_build_object('count', count(*), 'avg_rating', round(avg(rating)::numeric,2), 'negative', count(*) FILTER (WHERE rating <= 2)) FROM ai_response_feedback WHERE created_at >= since),
    'email', (SELECT coalesce(jsonb_object_agg(status, n),'{}') FROM (SELECT status, count(*) n FROM email_send_log WHERE created_at >= since GROUP BY status) x),
    'messaging', (SELECT coalesce(jsonb_object_agg(channel||':'||status, n),'{}') FROM (SELECT channel, status, count(*) n FROM messaging_outbox WHERE created_at >= since GROUP BY 1,2) x),
    'payments', (SELECT jsonb_build_object('total', count(*), 'failed', count(*) FILTER (WHERE status IN ('failed','error','declined')),
       'top_errors', (SELECT coalesce(jsonb_agg(e),'[]') FROM (SELECT coalesce(error_code,'ismeretlen') AS code, count(*) n FROM payment_attempts
          WHERE created_at >= since AND status IN ('failed','error','declined') GROUP BY 1 ORDER BY 2 DESC LIMIT 5) e))
       FROM payment_attempts WHERE created_at >= since),
    'fraud', (SELECT jsonb_build_object('open', count(*) FILTER (WHERE NOT reviewed), 'high_open', count(*) FILTER (WHERE NOT reviewed AND risk_level IN ('high','critical'))) FROM fraud_signals),
    'stock', (SELECT jsonb_build_object('active', count(*), 'out', count(*) FILTER (WHERE coalesce(stock_qty,0) <= 0 AND coalesce(fulfillment_type,'physical') = 'physical'),
       'low', count(*) FILTER (WHERE stock_qty BETWEEN 1 AND 3 AND coalesce(fulfillment_type,'physical')='physical'), 'never_sold', count(*) FILTER (WHERE coalesce(sales_count,0)=0 AND created_at < now()-interval '30 days'),
       'low_items', (SELECT coalesce(jsonb_agg(s),'[]') FROM (SELECT id, title, stock_qty, sales_count FROM partner_products WHERE status='active' AND stock_qty BETWEEN 0 AND 3 AND coalesce(fulfillment_type,'physical')='physical' ORDER BY sales_count DESC NULLS LAST LIMIT 8) s))
       FROM partner_products WHERE status='active')
  );
END $$;