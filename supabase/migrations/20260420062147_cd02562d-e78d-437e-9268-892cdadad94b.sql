-- Privát számla bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Adminok teljes hozzáférés
CREATE POLICY "Admins manage invoice files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'invoices' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'invoices' AND has_role(auth.uid(), 'admin'::app_role));

-- Vásárlók a saját számláikat letölthetik (e-mail alapján a path-ban: invoices/<email>/<file>)
CREATE POLICY "Users read own invoices"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoices'
  AND lower(btrim((storage.foldername(name))[1])) = authenticated_email()
);

-- Service role mindent tud
CREATE POLICY "Service role manages invoices"
ON storage.objects FOR ALL TO public
USING (bucket_id = 'invoices' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'service_role');