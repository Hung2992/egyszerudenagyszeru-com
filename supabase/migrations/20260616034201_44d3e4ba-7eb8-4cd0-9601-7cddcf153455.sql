
CREATE POLICY "partner reads own contract pdf"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'partner-contracts' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin'::app_role)));

CREATE POLICY "admin manages contract pdfs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'partner-contracts' AND has_role(auth.uid(),'admin'::app_role))
WITH CHECK (bucket_id = 'partner-contracts' AND has_role(auth.uid(),'admin'::app_role));
