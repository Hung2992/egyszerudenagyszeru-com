
CREATE TABLE public.giveaway_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  is_winner boolean NOT NULL DEFAULT false,
  prize_claimed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT giveaway_entries_email_key UNIQUE (email)
);

ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can enter giveaway"
  ON public.giveaway_entries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND email <> '');

CREATE POLICY "Admins can manage giveaway entries"
  ON public.giveaway_entries
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Winners can check own status"
  ON public.giveaway_entries
  FOR SELECT
  TO anon, authenticated
  USING (true);
