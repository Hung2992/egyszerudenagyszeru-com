CREATE TABLE public.workforce_staff (
  dept_id text PRIMARY KEY CHECK (dept_id ~ '^(0[1-9]|1[0-9]|20)$'),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 80),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 80),
  area text NOT NULL DEFAULT '' CHECK (char_length(area) <= 80),
  tools text[] NOT NULL DEFAULT '{}',
  duties text NOT NULL DEFAULT '' CHECK (char_length(duties) <= 2000),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workforce_staff TO authenticated;
GRANT ALL ON public.workforce_staff TO service_role;
ALTER TABLE public.workforce_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage workforce staff" ON public.workforce_staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.workforce_staff;