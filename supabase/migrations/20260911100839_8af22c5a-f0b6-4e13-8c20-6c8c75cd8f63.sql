CREATE OR REPLACE FUNCTION public.public_product_day_status(_product_id uuid)
RETURNS TABLE(booked_today integer, next_booking_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*)::int FROM public.partner_appointments a
      WHERE a.product_id = _product_id
        AND a.status <> 'cancelled'
        AND a.starts_at::date = (now() AT TIME ZONE 'Europe/Budapest')::date),
    (SELECT min(a.starts_at) FROM public.partner_appointments a
      WHERE a.product_id = _product_id
        AND a.status <> 'cancelled'
        AND a.starts_at > now())
$$;
REVOKE ALL ON FUNCTION public.public_product_day_status(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.public_product_day_status(uuid) TO anon, authenticated;