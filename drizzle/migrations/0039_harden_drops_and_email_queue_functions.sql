-- Role lookup only for yourself (or trusted server / admin)
CREATE OR REPLACE FUNCTION public.can_manage_drops(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    _user_id = auth.uid()
    OR auth.role() = 'service_role'
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  ) AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'drops_manager'::public.app_role)
  );
$function$;

-- Raffle draw only by trusted server or drop managers
CREATE OR REPLACE FUNCTION public.draw_raffle_winners(p_drop_id uuid)
 RETURNS TABLE(winner_count integer, error text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_drop public.product_drops%ROWTYPE;
  v_deadline TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.can_manage_drops(auth.uid()) THEN
    RETURN QUERY SELECT 0, 'forbidden'; RETURN;
  END IF;

  SELECT * INTO v_drop FROM public.product_drops WHERE id = p_drop_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 0, 'drop_not_found'; RETURN; END IF;
  IF v_drop.drop_type <> 'raffle' THEN RETURN QUERY SELECT 0, 'not_raffle'; RETURN; END IF;
  IF v_drop.status = 'drawn' THEN RETURN QUERY SELECT 0, 'already_drawn'; RETURN; END IF;

  v_deadline := now() + (v_drop.winner_checkout_minutes || ' minutes')::INTERVAL;

  WITH pool AS (
    SELECT id FROM public.drop_raffle_entries
     WHERE drop_id = p_drop_id
       AND captcha_verified = TRUE
       AND is_winner = FALSE
     ORDER BY random()
     LIMIT v_drop.total_units
  ),
  upd AS (
    UPDATE public.drop_raffle_entries e
      SET is_winner = TRUE,
          won_at = now(),
          checkout_deadline = v_deadline,
          winner_position = sub.pos
      FROM (SELECT id, row_number() OVER () AS pos FROM pool) sub
     WHERE e.id = sub.id
     RETURNING e.id
  )
  SELECT COUNT(*) INTO v_count FROM upd;

  UPDATE public.product_drops
    SET status = 'drawn',
        reserved_count = v_count
    WHERE id = p_drop_id;

  INSERT INTO public.drop_events(drop_id, event_type, payload)
  VALUES (p_drop_id, 'raffle_drawn', jsonb_build_object('winner_count', v_count));

  RETURN QUERY SELECT v_count, NULL::TEXT;
END $function$;

-- Pin search_path on the email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;