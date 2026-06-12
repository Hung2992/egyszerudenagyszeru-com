
DO $$ BEGIN
  CREATE POLICY "Partners read partner-assets" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'partner-assets' AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (SELECT 1 FROM public.partners p WHERE p.user_id = auth.uid() AND p.status = 'active')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins write partner-assets" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'partner-assets' AND public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (bucket_id = 'partner-assets' AND public.has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
