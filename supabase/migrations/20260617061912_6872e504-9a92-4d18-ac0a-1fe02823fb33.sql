
-- PUBLIC READ on partner-storefront-media and partner-product-images (via signed URLs not needed)
CREATE POLICY "Public read partner-storefront-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-storefront-media');

CREATE POLICY "Public read partner-product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-product-images');

-- Authenticated users can upload (partner check happens in app code; bucket isolation via folder prefix)
CREATE POLICY "Authenticated upload to partner-storefront-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-storefront-media');

CREATE POLICY "Authenticated upload to partner-product-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-product-images');

-- Owners (uploader) can update/delete their own files
CREATE POLICY "Owners update own partner-storefront-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'partner-storefront-media' AND owner = auth.uid());

CREATE POLICY "Owners delete own partner-storefront-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'partner-storefront-media' AND owner = auth.uid());

CREATE POLICY "Owners update own partner-product-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'partner-product-images' AND owner = auth.uid());

CREATE POLICY "Owners delete own partner-product-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'partner-product-images' AND owner = auth.uid());

-- Admins manage all
CREATE POLICY "Admins manage partner-storefront-media"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'partner-storefront-media' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'partner-storefront-media' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage partner-product-images"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'partner-product-images' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'partner-product-images' AND public.has_role(auth.uid(), 'admin'::app_role));
