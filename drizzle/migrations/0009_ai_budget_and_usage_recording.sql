CREATE TABLE public.ai_budget (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  monthly_limit_credits numeric NOT NULL DEFAULT 5 CHECK (monthly_limit_credits >= 0),
  warn_pct integer NOT NULL DEFAULT 80 CHECK (warn_pct BETWEEN 1 AND 100),
  block_at_limit boolean NOT NULL DEFAULT true,
  last_warned_month date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.ai_budget TO authenticated;
GRANT ALL ON public.ai_budget TO service_role;
ALTER TABLE public.ai_budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ai budget" ON public.ai_budget FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.ai_budget (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.ai_budget_state()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
  WITH b AS (SELECT * FROM ai_budget WHERE id),
  u AS (SELECT coalesce(sum(estimated_cost_credits),0) AS used, coalesce(sum(request_count),0) AS calls, coalesce(sum(token_count),0) AS tokens
        FROM ai_usage_quota WHERE usage_date >= date_trunc('month', now())::date)
  SELECT jsonb_build_object('used', round(u.used,4), 'calls', u.calls, 'tokens', u.tokens,
    'limit', b.monthly_limit_credits, 'warn_pct', b.warn_pct, 'block_at_limit', b.block_at_limit,
    'pct', CASE WHEN b.monthly_limit_credits > 0 THEN round(u.used / b.monthly_limit_credits * 100, 1) END,
    'state', CASE WHEN b.monthly_limit_credits > 0 AND u.used >= b.monthly_limit_credits THEN (CASE WHEN b.block_at_limit THEN 'blocked' ELSE 'over' END)
                  WHEN b.monthly_limit_credits > 0 AND u.used >= b.monthly_limit_credits * b.warn_pct / 100.0 THEN 'warn' ELSE 'ok' END)
  FROM b, u
$$;
REVOKE ALL ON FUNCTION public.ai_budget_state() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_budget_state() TO service_role;

CREATE OR REPLACE FUNCTION public.ai_record_usage(_fn text, _tokens integer, _cost numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
DECLARE s jsonb; m date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO ai_usage_quota (user_id, function_name, usage_date, request_count, token_count, estimated_cost_credits, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', left(coalesce(_fn,'unknown'),80), current_date, 1, greatest(coalesce(_tokens,0),0), greatest(coalesce(_cost,0),0), now())
  ON CONFLICT (user_id, function_name, usage_date) DO UPDATE SET
    request_count = ai_usage_quota.request_count + 1,
    token_count = ai_usage_quota.token_count + EXCLUDED.token_count,
    estimated_cost_credits = coalesce(ai_usage_quota.estimated_cost_credits,0) + EXCLUDED.estimated_cost_credits,
    updated_at = now();
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

CREATE OR REPLACE FUNCTION public.empyrean_ai_budget()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  RETURN public.ai_budget_state() || jsonb_build_object('by_function', (SELECT coalesce(jsonb_agg(x ORDER BY x.cost DESC),'[]') FROM (
    SELECT function_name AS fn, sum(request_count)::bigint AS calls, sum(token_count)::bigint AS tokens, round(sum(estimated_cost_credits),4) AS cost
    FROM ai_usage_quota WHERE usage_date >= date_trunc('month', now())::date GROUP BY 1) x));
END $$;
REVOKE ALL ON FUNCTION public.empyrean_ai_budget() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_ai_budget() TO authenticated;

CREATE OR REPLACE FUNCTION public.empyrean_set_ai_budget(_limit numeric, _warn_pct integer, _block boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
DECLARE old jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF _limit IS NULL OR _limit < 0 OR _limit > 100000 OR _warn_pct NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid budget' USING ERRCODE='22023'; END IF;
  SELECT to_jsonb(b) INTO old FROM ai_budget b WHERE id;
  UPDATE ai_budget SET monthly_limit_credits=_limit, warn_pct=_warn_pct, block_at_limit=coalesce(_block,true), last_warned_month=NULL, updated_at=now(), updated_by=auth.uid() WHERE id;
  INSERT INTO empyrean_audit_log (actor_id, action, target, detail)
  VALUES (auth.uid(), 'ai_budget.update', 'ai_budget', jsonb_build_object('before', old, 'after', jsonb_build_object('limit',_limit,'warn_pct',_warn_pct,'block',_block)));
  RETURN public.ai_budget_state();
END $$;
REVOKE ALL ON FUNCTION public.empyrean_set_ai_budget(numeric, integer, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_set_ai_budget(numeric, integer, boolean) TO authenticated;