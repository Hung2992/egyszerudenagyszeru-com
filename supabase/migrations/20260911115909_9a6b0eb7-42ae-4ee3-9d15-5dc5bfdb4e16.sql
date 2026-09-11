
DROP POLICY IF EXISTS "Anyone can insert AR events" ON public.ar_events;
CREATE POLICY "Anyone can insert AR events" ON public.ar_events
FOR INSERT TO anon, authenticated
WITH CHECK (
  event_type IS NOT NULL AND length(event_type) <= 64
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "anyone insert tryon events" ON public.tryon_events;
CREATE POLICY "anyone insert tryon events" ON public.tryon_events
FOR INSERT TO anon, authenticated
WITH CHECK (
  event_type IS NOT NULL AND length(event_type) <= 64
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can log ab events" ON public.partner_ab_events;
CREATE POLICY "Anyone can log ab events" ON public.partner_ab_events
FOR INSERT TO anon, authenticated
WITH CHECK (
  test_id IS NOT NULL
  AND event_type IS NOT NULL AND length(event_type) <= 64
);

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.drop_notifications;
CREATE POLICY "Anyone can subscribe" ON public.drop_notifications
FOR INSERT TO anon, authenticated
WITH CHECK (
  (
    (email IS NOT NULL AND email <> '' AND length(email) <= 320 AND position('@' in email) > 1)
    OR (phone IS NOT NULL AND phone <> '' AND length(phone) <= 32)
  )
  AND (user_id IS NULL OR user_id = auth.uid())
);
