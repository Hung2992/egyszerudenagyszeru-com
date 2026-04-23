-- Cseréljük a SECURITY DEFINER nézetet sima nézetre, security_invoker móddal
DROP VIEW IF EXISTS public.product_polls_anonymous;

CREATE VIEW public.product_polls_anonymous
WITH (security_invoker = true) AS
SELECT
  product_id,
  COUNT(*)::int AS vote_count,
  COALESCE(SUM(vote_weight), 0)::int AS total_weight
FROM public.product_polls
GROUP BY product_id;

-- Mivel a product_polls SELECT-jét csak saját szavazatra engedi az RLS, az aggregáció üres lenne.
-- Készítünk inkább egy SECURITY DEFINER függvényt, ami CSAK az aggregátumokat adja vissza.
DROP VIEW IF EXISTS public.product_polls_anonymous;

CREATE OR REPLACE FUNCTION public.get_product_poll_counts(_product_id uuid)
RETURNS TABLE(vote_count int, total_weight int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::int,
    COALESCE(SUM(vote_weight), 0)::int
  FROM public.product_polls
  WHERE product_id = _product_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_poll_counts(uuid) TO anon, authenticated;

-- product-images bucket: minden generic public SELECT policy eltávolítása
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- A bucket-et privátra állítjuk, a publikus elérést signed URL-en keresztül adjuk
UPDATE storage.buckets SET public = false WHERE id = 'product-images';