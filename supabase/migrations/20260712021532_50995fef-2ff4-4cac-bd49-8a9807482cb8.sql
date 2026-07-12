
CREATE POLICY "visual_search_uploads user upload"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'visual-search-uploads');

CREATE POLICY "visual_search_uploads own read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'visual-search-uploads' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "visual_search_uploads service read"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'visual-search-uploads');
