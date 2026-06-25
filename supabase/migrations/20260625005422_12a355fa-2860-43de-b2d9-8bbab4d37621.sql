
CREATE POLICY "Partners manage own domain proofs"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'partner-domain-proofs'
    AND EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
  )
  WITH CHECK (
    bucket_id = 'partner-domain-proofs'
    AND EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
  );

CREATE POLICY "Admins access all domain proofs"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'partner-domain-proofs' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'partner-domain-proofs' AND public.has_role(auth.uid(), 'admin'));
