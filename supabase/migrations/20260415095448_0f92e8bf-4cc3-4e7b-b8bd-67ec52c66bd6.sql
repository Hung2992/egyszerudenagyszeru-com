
-- 1. Create a SECURITY DEFINER helper to get the authenticated user's email from JWT
-- This avoids querying auth.users directly in RLS policies (which can fail)
CREATE OR REPLACE FUNCTION public.authenticated_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(btrim(COALESCE(
    auth.jwt() -> 'email' ->> '$',
    auth.jwt() ->> 'email'
  )))
$$;

-- 2. Fix orders SELECT policy: replace auth.users subquery with JWT-based email check
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;

CREATE POLICY "Users can read own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = user_id
    OR lower(btrim(customer_email)) = public.authenticated_email()
  )
);

-- 3. Fix return_requests INSERT policy: replace auth.users subquery with JWT email
DROP POLICY IF EXISTS "Users can create return requests for own orders" ON public.return_requests;

CREATE POLICY "Users can create return requests for own orders"
ON public.return_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = return_requests.order_id
    AND (
      o.user_id = auth.uid()
      OR lower(btrim(o.customer_email)) = public.authenticated_email()
    )
  )
);
