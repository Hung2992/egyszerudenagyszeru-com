
-- Fix orders: users can also see orders by their email
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
CREATE POLICY "Users can read own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Fix return_requests insert: allow matching by email too
DROP POLICY IF EXISTS "Users can create return requests for own orders" ON public.return_requests;
CREATE POLICY "Users can create return requests for own orders"
ON public.return_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = return_requests.order_id
    AND (
      o.user_id = auth.uid()
      OR o.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

-- Fix return_requests select: users see own requests
DROP POLICY IF EXISTS "Users can view own return requests" ON public.return_requests;
CREATE POLICY "Users can view own return requests"
ON public.return_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
