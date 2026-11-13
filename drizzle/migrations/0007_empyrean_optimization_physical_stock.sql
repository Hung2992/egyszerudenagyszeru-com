CREATE OR REPLACE FUNCTION public.empyrean_optimization_snapshot(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
DECLARE d integer := greatest(1, least(coalesce(_days,30), 365)); since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(_days,30), 365)));
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'generated_at', now(), 'days', d,
    'ai_cost_by_function', (SELECT coalesce(jsonb_agg(x ORDER BY x.cost DESC),'[]') FROM (
       SELECT function_name AS fn, sum(request_count)::bigint AS requests, sum(token_count)::bigint AS tokens, round(sum(estimated_cost_credits),4) AS cost
       FROM ai_usage_quota WHERE usage_date >= (now()-make_interval(days=>d))::date GROUP BY function_name ORDER BY 4 DESC NULLS LAST LIMIT 15) x),
    'ai_cost_daily', (SELECT coalesce(jsonb_agg(x ORDER BY x.day),'[]') FROM (
       SELECT usage_date AS day, round(sum(estimated_cost_credits),4) AS cost FROM ai_usage_quota
       WHERE usage_date >= (now()-make_interval(days=>d))::date GROUP BY usage_date) x),
    'cache', (SELECT jsonb_build_object('entries', count(*), 'hits', coalesce(sum(hit_count),0), 'live', count(*) FILTER (WHERE expires_at > now())) FROM ai_response_cache WHERE created_at >= since),
    'agents', (SELECT coalesce(jsonb_agg(x ORDER BY x.runs DESC),'[]') FROM (
       SELECT agent_slug AS slug, count(*) AS runs, count(*) FILTER (WHERE status IN ('completed','success','done')) AS ok,
              count(*) FILTER (WHERE status IN ('failed','error')) AS failed, coalesce(round(avg(duration_ms)),0) AS avg_ms,
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
REVOKE ALL ON FUNCTION public.empyrean_optimization_snapshot(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_optimization_snapshot(integer) TO authenticated;