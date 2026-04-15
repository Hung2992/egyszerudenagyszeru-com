
CREATE TABLE public.return_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  preferred_method text DEFAULT 'courier',
  default_reason text,
  auto_label boolean DEFAULT false,
  pickup_address text,
  preferred_refund_method text DEFAULT 'bank_card',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.return_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own return preferences"
ON public.return_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own return preferences"
ON public.return_preferences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own return preferences"
ON public.return_preferences FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own return preferences"
ON public.return_preferences FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage return preferences"
ON public.return_preferences FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
