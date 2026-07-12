
CREATE POLICY "tryon users read own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tryon-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "tryon users insert own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tryon-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "tryon users delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tryon-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
