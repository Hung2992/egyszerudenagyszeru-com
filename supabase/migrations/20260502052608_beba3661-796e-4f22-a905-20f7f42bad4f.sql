
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.admin_notifications;
CREATE POLICY "Anyone authenticated can insert notifications"
  ON public.admin_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);
