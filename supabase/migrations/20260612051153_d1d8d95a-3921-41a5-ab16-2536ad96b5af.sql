
-- Frissített eligibility: lejárat + max_uses
CREATE OR REPLACE FUNCTION public.welcome20_eligible(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  c RECORD;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  SELECT id, is_active, valid_until, max_uses, used_count
    INTO c FROM public.coupons WHERE upper(code) = 'WELCOME20' LIMIT 1;
  IF c.id IS NULL OR NOT COALESCE(c.is_active, false) THEN RETURN false; END IF;
  IF c.valid_until IS NOT NULL AND c.valid_until < now() THEN RETURN false; END IF;
  IF c.max_uses IS NOT NULL AND COALESCE(c.used_count,0) >= c.max_uses THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.orders WHERE user_id = _user_id AND status NOT IN ('cancelled','refunded')) THEN
    RETURN false;
  END IF;
  IF EXISTS(SELECT 1 FROM public.coupon_redemptions WHERE user_id = _user_id AND coupon_id = c.id) THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

-- Új: státusz + indoklás
CREATE OR REPLACE FUNCTION public.welcome20_status(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  c RECORD;
  user_email text;
  sent_exists boolean;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('status','no_user','eligible',false,'reason','Nincs bejelentkezett felhasználó');
  END IF;
  SELECT id, is_active, valid_until, max_uses, used_count, discount_percent
    INTO c FROM public.coupons WHERE upper(code) = 'WELCOME20' LIMIT 1;
  IF c.id IS NULL OR NOT COALESCE(c.is_active, false) THEN
    RETURN jsonb_build_object('status','no_coupon','eligible',false,'reason','A WELCOME20 kupon jelenleg nem aktív');
  END IF;
  IF c.valid_until IS NOT NULL AND c.valid_until < now() THEN
    RETURN jsonb_build_object('status','expired','eligible',false,'reason','A WELCOME20 kupon lejárt');
  END IF;
  IF c.max_uses IS NOT NULL AND COALESCE(c.used_count,0) >= c.max_uses THEN
    RETURN jsonb_build_object('status','exhausted','eligible',false,'reason','A WELCOME20 kupon elérte a maximális beváltások számát');
  END IF;
  IF EXISTS(SELECT 1 FROM public.coupon_redemptions WHERE user_id = _user_id AND coupon_id = c.id) THEN
    RETURN jsonb_build_object('status','already_redeemed','eligible',false,'reason','Már beváltottad a WELCOME20 kupont');
  END IF;
  IF EXISTS(SELECT 1 FROM public.orders WHERE user_id = _user_id AND status NOT IN ('cancelled','refunded')) THEN
    RETURN jsonb_build_object('status','has_order','eligible',false,'reason','A WELCOME20 csak az első vásárlóknak jár');
  END IF;
  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
  SELECT EXISTS(
    SELECT 1 FROM public.welcome20_send_log
    WHERE lower(email) = lower(user_email) AND status = 'sent' AND coupon_code = 'WELCOME20'
  ) INTO sent_exists;
  RETURN jsonb_build_object(
    'status','eligible','eligible',true,
    'reason','Jogosult vagy a 20% kedvezményre — a checkouton automatikusan alkalmazzuk',
    'discount_percent', c.discount_percent,
    'already_emailed', COALESCE(sent_exists, false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.welcome20_status(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.welcome20_status(uuid) TO authenticated, service_role;
