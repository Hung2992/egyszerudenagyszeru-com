
-- 1. search_path rögzítés
ALTER FUNCTION public.set_updated_at_now() SET search_path = 'pg_catalog', 'public';

-- 2. visual_search_queries: user_id nem hamisítható
DROP POLICY IF EXISTS "visual_search_queries insert" ON public.visual_search_queries;
CREATE POLICY "visual_search_queries insert" ON public.visual_search_queries
FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
);

-- 3. storage: csak saját mappába lehet feltölteni
DROP POLICY IF EXISTS "visual_search_uploads user upload" ON storage.objects;
CREATE POLICY "visual_search_uploads user upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'visual-search-uploads'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4. Önjóváhagyás tiltása (marketplace + plugins)
CREATE OR REPLACE FUNCTION public.prevent_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'approved' THEN
    RAISE EXCEPTION 'Csak adminisztrátor hagyhat jóvá.';
  END IF;
  IF COALESCE(NEW.is_public, false) IS DISTINCT FROM COALESCE(OLD.is_public, false)
     AND COALESCE(NEW.is_public, false) = true THEN
    RAISE EXCEPTION 'Csak adminisztrátor tehet nyilvánossá.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_approval_marketplace ON public.ai_agent_marketplace;
CREATE TRIGGER prevent_self_approval_marketplace
BEFORE UPDATE ON public.ai_agent_marketplace
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_approval();

DROP TRIGGER IF EXISTS prevent_self_approval_plugins ON public.ai_plugins;
CREATE TRIGGER prevent_self_approval_plugins
BEFORE UPDATE ON public.ai_plugins
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_approval();

-- 5. Tokenes átutalási rendelés-nézet
CREATE OR REPLACE FUNCTION public.get_transfer_order_public(_transfer_access_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
  SELECT jsonb_build_object(
    'order_number', o.order_number,
    'total_huf', o.total_huf,
    'subtotal_huf', o.subtotal_huf,
    'shipping_huf', o.shipping_huf,
    'status', o.status,
    'payment_status', o.payment_status,
    'created_at', o.created_at,
    'paid_at', o.paid_at,
    'customer_name', o.customer_name,
    'items', o.items,
    'store_name', COALESCE(sf.display_name, ''),
    'store_slug', COALESCE(sf.slug, ''),
    'bank', jsonb_build_object(
      'bank_account_holder', st.bank_account_holder,
      'bank_name', st.bank_name,
      'bank_account_number', st.bank_account_number,
      'bank_iban', st.bank_iban,
      'payment_instructions', st.payment_instructions
    )
  )
  FROM public.partner_orders o
  LEFT JOIN public.partner_storefront_settings st ON st.partner_id = o.partner_id
  LEFT JOIN public.partner_storefronts sf ON sf.partner_id = o.partner_id
  WHERE _transfer_access_token IS NOT NULL
    AND o.transfer_access_token = _transfer_access_token
    AND lower(trim(o.payment_method)) = 'transfer'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_transfer_order_public(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_transfer_order_public(uuid) TO anon, authenticated, service_role;
