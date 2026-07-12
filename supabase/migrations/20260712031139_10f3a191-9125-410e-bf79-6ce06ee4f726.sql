
CREATE OR REPLACE FUNCTION public.finalize_drop_reservation_for_order(p_order_id uuid)
RETURNS TABLE(finalized_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_finalized int := 0;
BEGIN
  SELECT user_id INTO v_user FROM public.orders WHERE id = p_order_id;
  IF v_user IS NULL THEN
    RETURN QUERY SELECT 0; RETURN;
  END IF;

  WITH updated AS (
    UPDATE public.drop_reservations r
       SET status = 'purchased', order_id = p_order_id
     WHERE r.user_id = v_user
       AND r.status = 'active'
       AND (r.order_id IS NULL OR r.order_id = p_order_id)
       AND r.expires_at > now() - interval '1 hour'
    RETURNING r.id, r.drop_id, r.quantity
  ), bumped AS (
    UPDATE public.product_drops d
       SET sold_count = d.sold_count + u.qty,
           reserved_count = GREATEST(0, d.reserved_count - u.qty)
      FROM (SELECT drop_id, SUM(quantity)::int AS qty FROM updated GROUP BY drop_id) u
     WHERE d.id = u.drop_id
    RETURNING d.id
  )
  SELECT count(*)::int INTO v_finalized FROM updated;

  INSERT INTO public.drop_events (drop_id, event_type, user_id, payload)
  SELECT r.drop_id, 'reservation_purchased', v_user,
         jsonb_build_object('order_id', p_order_id, 'reservation_id', r.id, 'quantity', r.quantity)
    FROM public.drop_reservations r
   WHERE r.order_id = p_order_id AND r.status = 'purchased';

  RETURN QUERY SELECT v_finalized;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_finalize_drop_on_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('paid','completed'))
     OR (TG_OP = 'UPDATE' AND NEW.status IN ('paid','completed')
         AND (OLD.status IS DISTINCT FROM NEW.status))
  THEN
    PERFORM public.finalize_drop_reservation_for_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finalize_drop_on_order_paid ON public.orders;
CREATE TRIGGER finalize_drop_on_order_paid
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_finalize_drop_on_order_paid();

CREATE OR REPLACE VIEW public.drop_performance_stats
WITH (security_invoker = true)
AS
SELECT
  d.id AS drop_id, d.name, d.slug,
  d.drop_type::text AS drop_type,
  d.status::text AS status,
  d.starts_at, d.total_units, d.sold_count, d.reserved_count,
  COALESCE(v.views, 0)        AS view_count,
  COALESCE(e.entries, 0)      AS entry_count,
  COALESCE(r.reservations, 0) AS reservation_count,
  COALESCE(p.purchases, 0)    AS purchase_count,
  COALESCE(b.bot_blocks, 0)   AS bot_blocks,
  CASE WHEN COALESCE(v.views,0) > 0
       THEN ROUND((COALESCE(e.entries,0)::numeric + COALESCE(r.reservations,0)) / v.views::numeric * 100, 2)
       ELSE 0 END AS view_to_intent_pct,
  CASE WHEN COALESCE(r.reservations,0) + COALESCE(e.entries,0) > 0
       THEN ROUND(COALESCE(p.purchases,0)::numeric
             / (COALESCE(r.reservations,0) + COALESCE(e.entries,0))::numeric * 100, 2)
       ELSE 0 END AS intent_to_purchase_pct,
  s.first_sold_at, s.sellout_at,
  CASE WHEN s.sellout_at IS NOT NULL
       THEN EXTRACT(EPOCH FROM (s.sellout_at - d.starts_at))::int
       ELSE NULL END AS sellout_seconds
FROM public.product_drops d
LEFT JOIN (SELECT drop_id, count(*) AS views FROM public.drop_events
           WHERE event_type = 'view' GROUP BY drop_id) v ON v.drop_id = d.id
LEFT JOIN (SELECT drop_id, count(*) AS entries FROM public.drop_raffle_entries GROUP BY drop_id) e ON e.drop_id = d.id
LEFT JOIN (SELECT drop_id, count(*) AS reservations FROM public.drop_reservations
           WHERE status IN ('active','purchased') GROUP BY drop_id) r ON r.drop_id = d.id
LEFT JOIN (SELECT drop_id, count(*) AS purchases FROM public.drop_reservations
           WHERE status = 'purchased' GROUP BY drop_id) p ON p.drop_id = d.id
LEFT JOIN (SELECT drop_id, count(*) AS bot_blocks FROM public.drop_events
           WHERE event_type IN ('bot_blocked','captcha_failed') GROUP BY drop_id) b ON b.drop_id = d.id
LEFT JOIN (SELECT drop_id,
                  min(reserved_at) FILTER (WHERE status = 'purchased') AS first_sold_at,
                  max(reserved_at) FILTER (WHERE status = 'purchased') AS sellout_at
           FROM public.drop_reservations GROUP BY drop_id) s ON s.drop_id = d.id;

GRANT SELECT ON public.drop_performance_stats TO authenticated;
GRANT SELECT ON public.drop_performance_stats TO service_role;
