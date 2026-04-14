
-- Allow anonymous/guest orders
CREATE POLICY "Anyone can place orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);
