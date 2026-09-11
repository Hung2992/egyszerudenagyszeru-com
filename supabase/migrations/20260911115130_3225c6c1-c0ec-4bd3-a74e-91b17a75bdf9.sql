GRANT SELECT ON public.partner_newsletter_deliveries TO authenticated;
CREATE POLICY "recipient reads own newsletter delivery"
ON public.partner_newsletter_deliveries
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));