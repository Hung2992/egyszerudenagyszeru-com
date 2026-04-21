-- Allow users to delete their own waitlist/preorder entries
CREATE POLICY "Users delete own waitlist"
ON public.product_waitlist
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR lower(btrim(email)) = authenticated_email()
);

CREATE POLICY "Users delete own preorders"
ON public.product_preorders
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR lower(btrim(customer_email)) = authenticated_email()
);

-- Allow users to update their own preorders (e.g., cancel)
CREATE POLICY "Users update own preorders"
ON public.product_preorders
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR lower(btrim(customer_email)) = authenticated_email()
);