CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS maintenance_password_hash text;

CREATE OR REPLACE FUNCTION public.set_maintenance_password(_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _password IS NULL OR _password = '' THEN
    UPDATE public.store_settings
       SET maintenance_password_hash = NULL,
           maintenance_password = NULL;
  ELSE
    UPDATE public.store_settings
       SET maintenance_password_hash = crypt(_password, gen_salt('bf', 10)),
           maintenance_password = NULL;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_maintenance_password(_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
BEGIN
  SELECT id, maintenance_password, maintenance_password_hash
    INTO s FROM public.store_settings LIMIT 1;

  IF _password IS NULL OR _password = '' THEN
    RETURN false;
  END IF;

  IF s.maintenance_password_hash IS NOT NULL AND s.maintenance_password_hash <> '' THEN
    RETURN s.maintenance_password_hash = crypt(_password, s.maintenance_password_hash);
  END IF;

  IF s.maintenance_password IS NOT NULL AND s.maintenance_password = _password THEN
    UPDATE public.store_settings
       SET maintenance_password_hash = crypt(_password, gen_salt('bf', 10)),
           maintenance_password = NULL
     WHERE id = s.id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE VIEW public.product_polls_anonymous AS
SELECT
  product_id,
  COUNT(*)::int AS vote_count,
  COALESCE(SUM(vote_weight), 0)::int AS total_weight
FROM public.product_polls
GROUP BY product_id;

GRANT SELECT ON public.product_polls_anonymous TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_audit_coupon(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(_code) LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'code', c.code,
    'description', c.description,
    'discount_percent', c.discount_percent,
    'discount_amount', c.discount_amount,
    'is_active', c.is_active,
    'valid_from', c.valid_from,
    'valid_until', c.valid_until,
    'max_uses', c.max_uses,
    'used_count', c.used_count,
    'expired', (c.valid_until IS NOT NULL AND c.valid_until < now()),
    'exhausted', (c.max_uses IS NOT NULL AND c.used_count >= c.max_uses)
  );
END;
$$;

DROP POLICY IF EXISTS "Public can list product-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can list product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;

DROP POLICY IF EXISTS "Admins manage product-images" ON storage.objects;
CREATE POLICY "Admins manage product-images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));