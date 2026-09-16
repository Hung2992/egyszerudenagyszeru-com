DROP POLICY IF EXISTS "Public can view storefront settings of published stores" ON public.partner_storefront_settings;
REVOKE SELECT ON public.partner_storefront_settings FROM anon;