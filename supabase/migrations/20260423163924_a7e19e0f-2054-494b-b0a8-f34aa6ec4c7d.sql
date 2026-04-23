
-- 1. COUPONS: Csak adminok olvashatják közvetlenül + szerver-oldali validátor függvény
DROP POLICY IF EXISTS "Authenticated users can read active coupons" ON public.coupons;

-- Szerver-oldali kupon-validátor: visszaadja a kedvezményt anélkül, hogy a kódlistát kiadná
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _order_total numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  discount numeric := 0;
BEGIN
  SELECT * INTO c FROM public.coupons
   WHERE upper(code) = upper(_code)
     AND is_active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_code');
  END IF;

  IF c.valid_until IS NOT NULL AND c.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;

  IF c.valid_from IS NOT NULL AND c.valid_from > now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_yet_valid');
  END IF;

  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'exhausted');
  END IF;

  IF c.discount_percent IS NOT NULL THEN
    discount := round(_order_total * (c.discount_percent / 100));
  ELSIF c.discount_amount IS NOT NULL THEN
    discount := c.discount_amount;
  END IF;

  discount := LEAST(discount, _order_total);

  RETURN jsonb_build_object(
    'valid', true,
    'code', c.code,
    'discount_amount', discount,
    'discount_percent', c.discount_percent,
    'description', c.description
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;

-- 2. PRODUCT_POLLS: voter_email rejtése a publikus szelektből
-- Az AdminLaunchCenterTab admin policy-n keresztül továbbra is lát mindent.
DROP POLICY IF EXISTS "Anyone can read poll counts" ON public.product_polls;

-- Publikus nézet anonim szavazatszámokkal
CREATE OR REPLACE VIEW public.product_polls_public AS
SELECT
  product_id,
  COUNT(*)::int                     AS total_votes,
  SUM(COALESCE(vote_weight, 1))::int AS total_weight,
  MAX(created_at)                    AS last_vote_at
FROM public.product_polls
GROUP BY product_id;

GRANT SELECT ON public.product_polls_public TO anon, authenticated;

-- Saját szavazat olvasása megengedett (e-mail vagy user_id alapján), így a felhasználó látja, szavazott-e már
CREATE POLICY "Users can read their own poll vote"
ON public.product_polls
FOR SELECT
TO authenticated
USING (
  voter_id = auth.uid()
  OR lower(btrim(voter_email)) = public.authenticated_email()
);

-- 3. INVOICES: user_id alapú jogosultság-ellenőrzés (eddig csak email)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS user_id uuid;

-- Töltsük fel a meglévő számláknál a user_id-t a kapcsolódó orders alapján
UPDATE public.invoices i
SET user_id = o.user_id
FROM public.orders o
WHERE i.order_id = o.id
  AND i.user_id IS NULL
  AND o.user_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can read own invoices" ON public.invoices;

CREATE POLICY "Users can read own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR lower(btrim(customer_email)) = public.authenticated_email()
);

-- 4. PRODUCT-IMAGES STORAGE: listázás letiltása, közvetlen URL-lel továbbra is elérhető
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;

-- Konkrét fájl olvasás engedélyezett, de listázás nem
CREATE POLICY "Read individual product images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'product-images'
  AND name IS NOT NULL
);

-- 5. STORE_SETTINGS: maintenance_password elrejtése
-- A maintenance_password mostantól csak adminok számára olvasható közvetlenül.
-- A publikus get_public_store_settings már egy view-ból olvas, ami nem tartalmazza az érzékeny mezőket.
-- Biztonsági ellenőrző függvény a karbantartási jelszó validálásához (sosem adja ki a jelszót)
CREATE OR REPLACE FUNCTION public.verify_maintenance_password(_password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_password text;
BEGIN
  SELECT maintenance_password INTO stored_password
  FROM public.store_settings
  LIMIT 1;

  IF stored_password IS NULL OR stored_password = '' THEN
    RETURN false;
  END IF;

  RETURN stored_password = _password;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_maintenance_password(text) TO anon, authenticated;
