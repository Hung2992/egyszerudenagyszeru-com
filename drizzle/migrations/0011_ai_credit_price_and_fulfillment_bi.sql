ALTER TABLE public.ai_budget ADD COLUMN IF NOT EXISTS credit_price numeric, ADD COLUMN IF NOT EXISTS credit_currency text NOT NULL DEFAULT 'USD';

CREATE OR REPLACE FUNCTION public.ai_budget_state()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH b AS (SELECT * FROM ai_budget WHERE id),
  u AS (SELECT coalesce(sum(c),0) AS used, coalesce(sum(n),0) AS calls, coalesce(sum(t),0) AS tokens FROM (
          SELECT estimated_cost_credits c, request_count n, token_count t FROM ai_usage_quota WHERE usage_date >= date_trunc('month', now())::date
          UNION ALL SELECT cost, calls, tokens FROM ai_usage_daily WHERE usage_date >= date_trunc('month', now())::date) x)
  SELECT jsonb_build_object('used', round(u.used,4), 'calls', u.calls, 'tokens', u.tokens,
    'limit', b.monthly_limit_credits, 'warn_pct', b.warn_pct, 'block_at_limit', b.block_at_limit,
    'credit_price', b.credit_price, 'credit_currency', b.credit_currency,
    'monthly_cost', CASE WHEN b.credit_price IS NOT NULL THEN round(u.used * b.credit_price, 2) END,
    'pct', CASE WHEN b.monthly_limit_credits > 0 THEN round(u.used / b.monthly_limit_credits * 100, 1) END,
    'state', CASE WHEN b.monthly_limit_credits > 0 AND u.used >= b.monthly_limit_credits THEN (CASE WHEN b.block_at_limit THEN 'blocked' ELSE 'over' END)
                  WHEN b.monthly_limit_credits > 0 AND u.used >= b.monthly_limit_credits * b.warn_pct / 100.0 THEN 'warn' ELSE 'ok' END)
  FROM b, u
$function$;

CREATE OR REPLACE FUNCTION public.empyrean_set_ai_credit_price(_price numeric, _currency text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE old jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF (_price IS NOT NULL AND (_price < 0 OR _price > 100000)) OR coalesce(_currency,'') NOT IN ('USD','EUR','HUF') THEN RAISE EXCEPTION 'invalid price' USING ERRCODE='22023'; END IF;
  SELECT jsonb_build_object('price',credit_price,'currency',credit_currency) INTO old FROM ai_budget WHERE id;
  UPDATE ai_budget SET credit_price=_price, credit_currency=_currency, updated_at=now(), updated_by=auth.uid() WHERE id;
  INSERT INTO empyrean_audit_log (actor_id, action, target, detail)
  VALUES (auth.uid(), 'ai_budget.credit_price', 'ai_budget', jsonb_build_object('before', old, 'after', jsonb_build_object('price',_price,'currency',_currency)));
  RETURN public.ai_budget_state();
END $function$;
REVOKE ALL ON FUNCTION public.empyrean_set_ai_credit_price(numeric,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_set_ai_credit_price(numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.empyrean_business_snapshot(_days integer DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  d integer := greatest(1, least(coalesce(_days,30), 365));
  cur_start timestamptz := now() - make_interval(days => d);
  prev_start timestamptz := now() - make_interval(days => 2*d);
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  WITH po AS (
    SELECT *, (paid_at IS NOT NULL OR payment_status = 'paid') AS is_paid,
           (status IN ('cancelled','canceled','refunded')) AS is_void
    FROM public.partner_orders WHERE created_at >= prev_start
  ), per AS (
    SELECT (created_at >= cur_start) AS cur,
      count(*) FILTER (WHERE NOT is_void) AS orders,
      coalesce(sum(total_huf) FILTER (WHERE NOT is_void),0) AS booked,
      coalesce(sum(total_huf) FILTER (WHERE is_paid AND NOT is_void),0) AS paid,
      count(*) FILTER (WHERE is_paid AND NOT is_void) AS paid_orders,
      coalesce(sum(platform_fee_huf) FILTER (WHERE is_paid AND NOT is_void),0) AS fee,
      coalesce(sum(shipping_huf) FILTER (WHERE NOT is_void),0) AS shipping,
      coalesce(sum(shipping_huf) FILTER (WHERE is_paid AND NOT is_void),0) AS shipping_paid,
      count(*) FILTER (WHERE NOT is_void AND status NOT IN ('shipped','delivered','returned','return_requested') AND shipped_at IS NULL) AS to_ship,
      count(*) FILTER (WHERE shipped_at IS NOT NULL AND delivered_at IS NULL AND status NOT IN ('returned','return_requested')) AS in_transit,
      count(*) FILTER (WHERE delivered_at IS NOT NULL OR status = 'delivered') AS delivered,
      count(*) FILTER (WHERE status IN ('returned','return_requested')) AS returns,
      round(avg(extract(epoch FROM delivered_at - shipped_at)/86400) FILTER (WHERE delivered_at IS NOT NULL AND shipped_at IS NOT NULL)::numeric, 1) AS avg_delivery_days,
      count(*) FILTER (WHERE NOT is_paid AND NOT is_void AND payment_method = 'bank_transfer') AS awaiting_transfer
    FROM po GROUP BY 1
  ), top AS (
    SELECT p.partner_id, coalesce(pa.company_name, pa.full_name, 'Ismeretlen') AS name, count(*) AS orders, sum(p.total_huf) AS booked
    FROM po p LEFT JOIN public.partners pa ON pa.id = p.partner_id
    WHERE p.created_at >= cur_start AND NOT p.is_void GROUP BY 1,2 ORDER BY booked DESC NULLS LAST LIMIT 5
  )
  SELECT jsonb_build_object(
    'window_days', d, 'generated_at', now(),
    'current', coalesce((SELECT to_jsonb(per) - 'cur' FROM per WHERE cur), '{}'::jsonb),
    'previous', coalesce((SELECT to_jsonb(per) - 'cur' FROM per WHERE NOT cur), '{}'::jsonb),
    'top_partners', coalesce((SELECT jsonb_agg(to_jsonb(top)) FROM top), '[]'::jsonb),
    'active_partners', (SELECT count(*) FROM public.partners WHERE is_active),
    'published_storefronts', (SELECT count(*) FROM public.partner_storefronts WHERE is_published),
    'active_products', (SELECT count(*) FROM public.partner_products WHERE status = 'active'),
    'low_stock_products', (SELECT count(*) FROM public.partner_products WHERE status = 'active' AND coalesce(stock_qty,0) <= 3),
    'pending_review_products', (SELECT count(*) FROM public.partner_products WHERE status = 'pending_review')
  ) INTO result;
  RETURN result;
END $function$;