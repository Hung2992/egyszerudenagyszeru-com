
-- Explicit admin-only baseline SELECT policy on realtime.messages so the scanner
-- can see channel access is scoped, in addition to RLS being enabled.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages'
      AND policyname='Admins can read realtime messages'
  ) THEN
    EXECUTE $p$CREATE POLICY "Admins can read realtime messages" ON realtime.messages
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))$p$;
  END IF;
END $$;
