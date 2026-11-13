ALTER TABLE public.partner_shipping_methods ADD COLUMN IF NOT EXISTS promised_days integer CHECK (promised_days IS NULL OR promised_days BETWEEN 0 AND 60);
ALTER TABLE public.partner_orders ADD COLUMN IF NOT EXISTS shipping_method_id uuid, ADD COLUMN IF NOT EXISTS promised_days integer CHECK (promised_days IS NULL OR promised_days BETWEEN 0 AND 60);

CREATE OR REPLACE FUNCTION public.empyrean_set_promised_days(_method_id uuid, _days integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF _days IS NOT NULL AND (_days < 0 OR _days > 60) THEN RAISE EXCEPTION 'invalid days' USING ERRCODE='22023'; END IF;
  UPDATE partner_shipping_methods SET promised_days=_days WHERE id=_method_id;
  UPDATE partner_orders SET promised_days=_days WHERE shipping_method_id=_method_id AND delivered_at IS NULL;
  INSERT INTO empyrean_audit_log(actor_id, action, target, detail) VALUES (auth.uid(),'shipping.promised_days','partner_shipping_methods', jsonb_build_object('method_id',_method_id,'days',_days));
END $$;
REVOKE ALL ON FUNCTION public.empyrean_set_promised_days(uuid,integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_set_promised_days(uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.empyrean_delivery_delays()
RETURNS TABLE(order_number text, shipped_at timestamptz, delivered_at timestamptz, promised_days integer, actual_days numeric, extra_days numeric, ratio numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT o.order_number, o.shipped_at, o.delivered_at, o.promised_days,
    round((extract(epoch FROM coalesce(o.delivered_at, now()) - o.shipped_at)/86400)::numeric,1),
    round((extract(epoch FROM coalesce(o.delivered_at, now()) - o.shipped_at)/86400 - o.promised_days)::numeric,1),
    CASE WHEN o.promised_days > 0 THEN round((extract(epoch FROM coalesce(o.delivered_at, now()) - o.shipped_at)/86400 / o.promised_days)::numeric,2) END
  FROM partner_orders o WHERE o.shipped_at IS NOT NULL AND o.promised_days IS NOT NULL
  ORDER BY 6 DESC NULLS LAST LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.empyrean_delivery_delays() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_delivery_delays() TO authenticated;