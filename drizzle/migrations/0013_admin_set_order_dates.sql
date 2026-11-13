CREATE OR REPLACE FUNCTION public.empyrean_set_order_dates(_order_id uuid, _shipped date, _delivered date, _paid date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO o FROM partner_orders WHERE id=_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF (_delivered IS NOT NULL AND (_shipped IS NULL OR _delivered < _shipped))
     OR (_shipped IS NOT NULL AND _shipped < o.created_at::date)
     OR greatest(_shipped,_delivered,_paid) > current_date THEN
    RAISE EXCEPTION 'invalid dates' USING ERRCODE='22023'; END IF;
  UPDATE partner_orders SET
    shipped_at = _shipped::timestamptz, delivered_at = _delivered::timestamptz, paid_at = _paid::timestamptz,
    payment_status = CASE WHEN _paid IS NOT NULL THEN 'paid' WHEN payment_status='paid' THEN 'pending' ELSE payment_status END,
    status = CASE WHEN status IN ('returned','return_requested','cancelled','canceled','refunded') THEN status
                  WHEN _delivered IS NOT NULL THEN 'delivered' WHEN _shipped IS NOT NULL THEN 'shipped' ELSE 'pending' END,
    updated_at = now()
  WHERE id=_order_id;
  INSERT INTO empyrean_audit_log(actor_id, action, target, detail) VALUES (auth.uid(),'order.dates','partner_orders',
    jsonb_build_object('order_id',_order_id,'before',jsonb_build_object('shipped',o.shipped_at,'delivered',o.delivered_at,'paid',o.paid_at),
      'after',jsonb_build_object('shipped',_shipped,'delivered',_delivered,'paid',_paid)));
END $$;
REVOKE ALL ON FUNCTION public.empyrean_set_order_dates(uuid,date,date,date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_set_order_dates(uuid,date,date,date) TO authenticated;