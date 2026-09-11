DROP POLICY IF EXISTS "users read own ai media files" ON storage.objects;
CREATE POLICY "users read own ai media files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ai-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "users delete own ai media files" ON storage.objects;
CREATE POLICY "users delete own ai media files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ai-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));