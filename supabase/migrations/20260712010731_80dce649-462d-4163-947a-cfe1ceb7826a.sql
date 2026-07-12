
CREATE POLICY "partner sees own preview tokens"
ON public.partner_storefront_preview_tokens
FOR SELECT
TO authenticated
USING (
  storefront_id IN (
    SELECT s.id FROM public.partner_storefronts s
    JOIN public.partners p ON p.id = s.partner_id
    WHERE p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);
