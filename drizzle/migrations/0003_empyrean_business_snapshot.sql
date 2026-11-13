CREATE OR REPLACE FUNCTION public.empyrean_business_snapshot(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d integer := greatest(1, least(coalesce(_days,30), 365));
  cur_start timestamptz := now() - make_interval(days => d);
  prev_start timestamptz := now() - make_interval(days => 2*d);
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

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
      count(*) FILTER (WHERE NOT is_paid AND NOT is_void AND payment_method = 'bank_transfer') AS awaiting_transfer
    FROM po GROUP BY 1
  ), top AS (
    SELECT p.partner_id, coalesce(pa.company_name, pa.full_name, 'Ismeretlen') AS name,
      count(*) AS orders, sum(p.total_huf) AS booked
    FROM po p LEFT JOIN public.partners pa ON pa.id = p.partner_id
    WHERE p.created_at >= cur_start AND NOT p.is_void
    GROUP BY 1,2 ORDER BY booked DESC NULLS LAST LIMIT 5
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
END $$;
REVOKE ALL ON FUNCTION public.empyrean_business_snapshot(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_business_snapshot(integer) TO authenticated;