-- WELCOME20 kiküldési napló
CREATE TABLE IF NOT EXISTS public.welcome20_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  reason text,
  error text,
  coupon_code text NOT NULL DEFAULT 'WELCOME20',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS welcome20_send_log_email_sent_uniq
  ON public.welcome20_send_log (lower(email), coupon_code)
  WHERE status = 'sent';

CREATE INDEX IF NOT EXISTS welcome20_send_log_user_idx ON public.welcome20_send_log(user_id);
CREATE INDEX IF NOT EXISTS welcome20_send_log_created_idx ON public.welcome20_send_log(created_at DESC);

GRANT SELECT ON public.welcome20_send_log TO authenticated;
GRANT ALL ON public.welcome20_send_log TO service_role;

ALTER TABLE public.welcome20_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage welcome20 send log"
  ON public.welcome20_send_log FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Jogosultsági ellenőrzés: első vásárló-e + nem váltotta még be
CREATE OR REPLACE FUNCTION public.welcome20_eligible(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_order boolean;
  has_redeemed boolean;
  coupon_active boolean;
  v_coupon_id uuid;
  user_email text;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  SELECT id, is_active INTO v_coupon_id, coupon_active
  FROM public.coupons WHERE upper(code) = 'WELCOME20' LIMIT 1;

  IF v_coupon_id IS NULL OR NOT COALESCE(coupon_active, false) THEN
    RETURN false;
  END IF;

  -- Volt-e már rendelése (első vásárlókra szól)
  SELECT EXISTS(
    SELECT 1 FROM public.orders
    WHERE user_id = _user_id
      AND status NOT IN ('cancelled','refunded')
  ) INTO has_order;
  IF has_order THEN RETURN false; END IF;

  -- Beváltotta már (single_use)
  SELECT EXISTS(
    SELECT 1 FROM public.coupon_redemptions
    WHERE user_id = _user_id AND coupon_id = v_coupon_id
  ) INTO has_redeemed;
  IF has_redeemed THEN RETURN false; END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.welcome20_eligible(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.welcome20_eligible(uuid) TO authenticated, service_role;