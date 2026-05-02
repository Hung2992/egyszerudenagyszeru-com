
-- Admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert notifications"
  ON public.admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add failure tracking columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Enable realtime for admin notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
