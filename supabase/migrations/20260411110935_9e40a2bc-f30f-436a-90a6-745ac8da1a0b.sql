CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_code_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1 WHERE code = coupon_code_input;
END;
$$;