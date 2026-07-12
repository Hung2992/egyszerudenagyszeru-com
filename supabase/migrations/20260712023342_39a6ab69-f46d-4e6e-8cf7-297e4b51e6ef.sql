
CREATE OR REPLACE FUNCTION public.validate_ai_price_offer(
  _code text,
  _user_id uuid,
  _order_total numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offer record;
  discount_amount numeric;
BEGIN
  IF _code IS NULL OR _code !~* '^AI-' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_ai_code');
  END IF;

  SELECT * INTO offer
  FROM public.ai_price_offers
  WHERE upper(coupon_code) = upper(_code)
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_found');
  END IF;

  IF offer.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;

  IF offer.accepted THEN
    RETURN jsonb_build_object('valid', false, 'error', 'already_used');
  END IF;

  IF offer.user_id IS NOT NULL AND offer.user_id <> _user_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'wrong_user');
  END IF;

  -- AI kedvezmény = offered_price alatti különbség; alkalmazzuk az órakor kosárértékre
  discount_amount := GREATEST(0, offer.original_price - offer.offered_price);
  -- soha nem több mint a rendelés
  discount_amount := LEAST(discount_amount, _order_total);

  RETURN jsonb_build_object(
    'valid', true,
    'code', offer.coupon_code,
    'offer_id', offer.id,
    'discount_amount', discount_amount,
    'discount_percent', offer.discount_percent,
    'product_id', offer.product_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_ai_price_offer(text, uuid, numeric) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.mark_ai_offer_accepted(
  _offer_id uuid,
  _order_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offer record;
BEGIN
  SELECT * INTO offer FROM public.ai_price_offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF offer.accepted THEN RETURN false; END IF;
  IF offer.expires_at < now() THEN RETURN false; END IF;

  UPDATE public.ai_price_offers
     SET accepted = true, accepted_at = now(), order_id = _order_id
   WHERE id = _offer_id;

  INSERT INTO public.ai_pricing_events(user_id, session_id, product_id, rule_id, offer_id, granted, requested_discount_percent, reason, context)
  VALUES(offer.user_id, offer.session_id, offer.product_id, offer.rule_id, offer.id, true, offer.discount_percent, 'Ajánlat beváltva rendeléssel', jsonb_build_object('order_id', _order_id, 'accepted_at', now()));

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_ai_offer_accepted(uuid, uuid) TO authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_ai_pricing_events_user_time ON public.ai_pricing_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_events_session_time ON public.ai_pricing_events(session_id, created_at DESC);
