
-- 1. Lock PARTNER-* coupon codes
CREATE OR REPLACE FUNCTION public.lock_partner_coupon_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.code IS NOT NULL
     AND upper(OLD.code) LIKE 'PARTNER-%'
     AND NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'partner_coupon_code_is_locked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coupons_lock_partner_code ON public.coupons;
CREATE TRIGGER coupons_lock_partner_code
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.lock_partner_coupon_code();

-- 2. Anti-fraud: rewrite track_partner_referral to skip self-orders
CREATE OR REPLACE FUNCTION public.track_partner_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_partner RECORD;
  v_commission numeric;
  v_status text;
  v_is_self boolean := false;
BEGIN
  IF NEW.coupon_code IS NULL THEN RETURN NEW; END IF;

  SELECT p.* INTO v_partner
  FROM public.coupons c
  JOIN public.partners p ON p.id = c.partner_id
  WHERE upper(c.code) = upper(NEW.coupon_code)
  LIMIT 1;

  IF NOT FOUND OR v_partner.id IS NULL THEN RETURN NEW; END IF;

  -- Anti-fraud: same email / phone / address / user => self order, skip commission
  IF v_partner.email IS NOT NULL AND lower(btrim(v_partner.email)) = lower(btrim(COALESCE(NEW.customer_email, ''))) THEN
    v_is_self := true;
  ELSIF v_partner.phone IS NOT NULL AND regexp_replace(v_partner.phone, '\D', '', 'g') = regexp_replace(COALESCE(NEW.shipping_phone, ''), '\D', '', 'g')
        AND regexp_replace(v_partner.phone, '\D', '', 'g') <> '' THEN
    v_is_self := true;
  ELSIF v_partner.address IS NOT NULL AND lower(btrim(v_partner.address)) = lower(btrim(COALESCE(NEW.shipping_address, '')))
        AND lower(btrim(v_partner.address)) <> '' THEN
    v_is_self := true;
  ELSIF v_partner.user_id IS NOT NULL AND v_partner.user_id = NEW.user_id THEN
    v_is_self := true;
  END IF;

  v_commission := COALESCE(v_partner.commission_per_order_amount, 0);

  IF NEW.status IN ('paid', 'fulfilled', 'delivered', 'completed') THEN
    v_status := 'confirmed';
  ELSIF NEW.status IN ('cancelled', 'refunded') THEN
    v_status := 'cancelled';
  ELSE
    v_status := 'pending';
  END IF;

  IF v_is_self THEN
    v_status := 'cancelled';
    v_commission := 0;
  END IF;

  INSERT INTO public.partner_referrals (
    partner_id, order_id, coupon_code, order_total, commission_amount, status, confirmed_at
  ) VALUES (
    v_partner.id, NEW.id, NEW.coupon_code, COALESCE(NEW.total_amount,0), v_commission, v_status,
    CASE WHEN v_status = 'confirmed' THEN now() ELSE NULL END
  )
  ON CONFLICT (order_id, partner_id) DO UPDATE
    SET status = EXCLUDED.status,
        commission_amount = EXCLUDED.commission_amount,
        confirmed_at = CASE WHEN EXCLUDED.status = 'confirmed' AND public.partner_referrals.confirmed_at IS NULL
                            THEN now() ELSE public.partner_referrals.confirmed_at END,
        order_total = EXCLUDED.order_total,
        updated_at = now();

  RETURN NEW;
END;
$$;

-- 3. Min payout 10 000 Ft
CREATE OR REPLACE FUNCTION public.request_partner_payout(_partner_id uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_amount numeric;
  v_payout_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.partners p WHERE p.id = _partner_id AND p.user_id = v_uid AND p.status = 'active') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(SUM(commission_amount),0) INTO v_amount
  FROM public.partner_referrals
  WHERE partner_id = _partner_id AND status = 'confirmed' AND payout_id IS NULL;

  IF v_amount < 10000 THEN
    RAISE EXCEPTION 'min_payout_amount_not_reached';
  END IF;

  INSERT INTO public.partner_payouts (partner_id, amount, status, partner_notes)
  VALUES (_partner_id, v_amount, 'requested', _notes)
  RETURNING id INTO v_payout_id;

  UPDATE public.partner_referrals
  SET payout_id = v_payout_id, updated_at = now()
  WHERE partner_id = _partner_id AND status = 'confirmed' AND payout_id IS NULL;

  RETURN v_payout_id;
END;
$$;

-- 4. Top partners RPC
CREATE OR REPLACE FUNCTION public.get_top_partners(_limit integer DEFAULT 10, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE (
  partner_id uuid,
  partner_name text,
  coupon_code text,
  orders_count bigint,
  total_revenue numeric,
  total_commission numeric,
  pending_commission numeric,
  paid_commission numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    COALESCE(p.company_name, p.full_name),
    c.code,
    COUNT(r.id)::bigint,
    COALESCE(SUM(r.order_total) FILTER (WHERE r.status <> 'cancelled'), 0),
    COALESCE(SUM(r.commission_amount) FILTER (WHERE r.status = 'confirmed'), 0),
    COALESCE(SUM(r.commission_amount) FILTER (WHERE r.status = 'confirmed' AND r.payout_id IS NULL), 0),
    COALESCE(SUM(po.amount) FILTER (WHERE po.status = 'paid'), 0)
  FROM public.partners p
  LEFT JOIN public.coupons c ON c.id = p.coupon_id
  LEFT JOIN public.partner_referrals r ON r.partner_id = p.id
    AND (_from IS NULL OR r.created_at >= _from)
    AND (_to IS NULL OR r.created_at <= _to)
  LEFT JOIN public.partner_payouts po ON po.partner_id = p.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY p.id, p.company_name, p.full_name, c.code
  ORDER BY COALESCE(SUM(r.commission_amount) FILTER (WHERE r.status = 'confirmed'), 0) DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_partners(integer, timestamptz, timestamptz) TO authenticated;
