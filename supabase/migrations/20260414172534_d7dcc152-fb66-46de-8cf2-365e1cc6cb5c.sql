
-- Restrict listing on product-images bucket
-- Drop overly permissive SELECT policy if exists and create a scoped one
DROP POLICY IF EXISTS "Allow public read access on product-images" ON storage.objects;
CREATE POLICY "Allow public read access on product-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] IS NOT NULL);
