-- Remove the direct client INSERT policies that allow bypassing edge function validation
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can place orders" ON public.orders;

-- Add a service-role-only insert policy so edge functions can still create orders
CREATE POLICY "Service role can insert orders"
  ON public.orders
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');