DROP POLICY IF EXISTS "anyone read tts_settings" ON public.tts_settings;
CREATE POLICY "admins read tts_settings" ON public.tts_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.tts_settings FROM anon;