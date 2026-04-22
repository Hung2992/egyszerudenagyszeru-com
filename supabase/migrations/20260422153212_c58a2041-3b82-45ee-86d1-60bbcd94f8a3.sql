CREATE TABLE IF NOT EXISTS public.giveaway_settings (
  id integer PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT true,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT giveaway_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.giveaway_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read giveaway settings"
ON public.giveaway_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage giveaway settings"
ON public.giveaway_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.giveaway_settings (id, is_enabled, end_date)
VALUES (1, true, '2026-06-04T23:59:59+00:00')
ON CONFLICT (id) DO NOTHING;