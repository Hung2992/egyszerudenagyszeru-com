-- Fix 1: Remove overly permissive giveaway SELECT policy that exposes all emails
DROP POLICY IF EXISTS "Winners can check own status" ON public.giveaway_entries;

-- Fix 2: Restrict coupon reading to authenticated users only
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;

CREATE POLICY "Authenticated users can read active coupons"
  ON public.coupons
  FOR SELECT
  TO authenticated
  USING (is_active = true);