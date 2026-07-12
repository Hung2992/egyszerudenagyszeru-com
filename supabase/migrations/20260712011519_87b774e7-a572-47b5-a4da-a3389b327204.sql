
-- 1) Tighten storefront audit log inserts (remove permissive true policy)
DROP POLICY IF EXISTS "Service role writes audit" ON public.partner_storefront_audit_log;

-- 2) Storage bucket ownership checks for partner uploads
DROP POLICY IF EXISTS "Authenticated upload to partner-product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to partner-storefront-media" ON storage.objects;

CREATE POLICY "Owners upload to partner-product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partner-product-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
  )
);

CREATE POLICY "Owners upload to partner-storefront-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partner-storefront-media'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
  )
);
