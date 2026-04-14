
-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;

-- Create a new insert policy that allows both guest and authenticated orders
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  -- Either guest order (no user_id) or authenticated user creating their own order
  user_id IS NULL OR auth.uid() = user_id
);
