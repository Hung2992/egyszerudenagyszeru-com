CREATE TABLE public.partner_order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.partner_orders(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 1000),
  amount_huf numeric NOT NULL CHECK (amount_huf >= 0),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','refunded')),
  decision_note text,
  requested_by uuid,
  decided_by uuid, decided_at timestamptz,
  refunded_by uuid, refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.partner_order_returns(order_id);
GRANT SELECT, INSERT ON public.partner_order_returns TO authenticated;
GRANT ALL ON public.partner_order_returns TO service_role;
ALTER TABLE public.partner_order_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read returns" ON public.partner_order_returns FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Partners read own returns" ON public.partner_order_returns FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
CREATE POLICY "Partners request own returns" ON public.partner_order_returns FOR INSERT TO authenticated
  WITH CHECK (status = 'requested' AND decided_by IS NULL AND refunded_at IS NULL
    AND partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.partner_orders o WHERE o.id = order_id AND o.partner_id = partner_order_returns.partner_id AND amount_huf <= o.total_huf));

CREATE OR REPLACE FUNCTION public.empyrean_request_return(_order_id uuid, _reason text, _amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o record; rid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO o FROM partner_orders WHERE id=_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _amount IS NULL OR _amount < 0 OR _amount > o.total_huf THEN RAISE EXCEPTION 'invalid amount' USING ERRCODE='22023'; END IF;
  IF EXISTS (SELECT 1 FROM partner_order_returns WHERE order_id=_order_id AND status IN ('requested','approved')) THEN RAISE EXCEPTION 'open return exists'; END IF;
  INSERT INTO partner_order_returns(order_id, partner_id, reason, amount_huf, requested_by)
  VALUES (_order_id, o.partner_id, _reason, _amount, auth.uid()) RETURNING id INTO rid;
  UPDATE partner_orders SET status='return_requested', updated_at=now() WHERE id=_order_id;
  INSERT INTO empyrean_audit_log(actor_id, action, target, detail) VALUES (auth.uid(),'return.request','partner_order_returns', jsonb_build_object('return_id',rid,'order_id',_order_id,'amount',_amount));
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.empyrean_decide_return(_return_id uuid, _action text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM partner_order_returns WHERE id=_return_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  IF _action IN ('approve','reject') THEN
    IF r.status <> 'requested' THEN RAISE EXCEPTION 'already decided' USING ERRCODE='22023'; END IF;
    UPDATE partner_order_returns SET status = CASE WHEN _action='approve' THEN 'approved' ELSE 'rejected' END,
      decision_note=_note, decided_by=auth.uid(), decided_at=now() WHERE id=_return_id;
    IF _action='reject' THEN
      UPDATE partner_orders SET status = CASE WHEN delivered_at IS NOT NULL THEN 'delivered' ELSE 'pending' END, updated_at=now() WHERE id=r.order_id;
    END IF;
  ELSIF _action='refund' THEN
    IF r.status <> 'approved' THEN RAISE EXCEPTION 'must be approved first' USING ERRCODE='22023'; END IF;
    UPDATE partner_order_returns SET status='refunded', refunded_by=auth.uid(), refunded_at=now() WHERE id=_return_id;
    UPDATE partner_orders SET status='returned', updated_at=now() WHERE id=r.order_id;
  ELSE RAISE EXCEPTION 'invalid action' USING ERRCODE='22023'; END IF;
  INSERT INTO empyrean_audit_log(actor_id, action, target, detail) VALUES (auth.uid(),'return.'||_action,'partner_order_returns', jsonb_build_object('return_id',_return_id,'order_id',r.order_id,'amount',r.amount_huf,'note',_note));
  RETURN (SELECT to_jsonb(x) FROM partner_order_returns x WHERE id=_return_id);
END $$;
REVOKE ALL ON FUNCTION public.empyrean_request_return(uuid,text,numeric) FROM public, anon;
REVOKE ALL ON FUNCTION public.empyrean_decide_return(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_request_return(uuid,text,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.empyrean_decide_return(uuid,text,text) TO authenticated;

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
  ), rf AS (
    SELECT (refunded_at >= cur_start) AS cur, coalesce(sum(amount_huf),0) AS refunded, count(*) AS refund_count
    FROM public.partner_order_returns WHERE status='refunded' AND refunded_at >= prev_start GROUP BY 1
  ), top AS (
    SELECT p.partner_id, coalesce(pa.company_name, pa.full_name, 'Ismeretlen') AS name, count(*) AS orders, sum(p.total_huf) AS booked
    FROM po p LEFT JOIN public.partners pa ON pa.id = p.partner_id
    WHERE p.created_at >= cur_start AND NOT p.is_void GROUP BY 1,2 ORDER BY booked DESC NULLS LAST LIMIT 5
  )
  SELECT jsonb_build_object(
    'window_days', d, 'generated_at', now(),
    'current', coalesce((SELECT to_jsonb(per) - 'cur' FROM per WHERE cur), '{}'::jsonb)
       || jsonb_build_object('refunded', coalesce((SELECT refunded FROM rf WHERE cur),0), 'refund_count', coalesce((SELECT refund_count FROM rf WHERE cur),0)),
    'previous', coalesce((SELECT to_jsonb(per) - 'cur' FROM per WHERE NOT cur), '{}'::jsonb)
       || jsonb_build_object('refunded', coalesce((SELECT refunded FROM rf WHERE NOT cur),0), 'refund_count', coalesce((SELECT refund_count FROM rf WHERE NOT cur),0)),
    'open_returns', (SELECT count(*) FROM public.partner_order_returns WHERE status IN ('requested','approved')),
    'top_partners', coalesce((SELECT jsonb_agg(to_jsonb(top)) FROM top), '[]'::jsonb),
    'active_partners', (SELECT count(*) FROM public.partners WHERE is_active),
    'published_storefronts', (SELECT count(*) FROM public.partner_storefronts WHERE is_published),
    'active_products', (SELECT count(*) FROM public.partner_products WHERE status = 'active'),
    'low_stock_products', (SELECT count(*) FROM public.partner_products WHERE status = 'active' AND coalesce(stock_qty,0) <= 3),
    'pending_review_products', (SELECT count(*) FROM public.partner_products WHERE status = 'pending_review')
  ) INTO result;
  RETURN result;
END $function$;