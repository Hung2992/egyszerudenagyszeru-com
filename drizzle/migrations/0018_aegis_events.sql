CREATE TABLE public.aegis_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('input','output','workforce')),
  action text NOT NULL CHECK (action IN ('blocked','redacted','flagged')),
  findings text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aegis_events_created_idx ON public.aegis_events(created_at DESC);
GRANT SELECT ON public.aegis_events TO authenticated;
GRANT ALL ON public.aegis_events TO service_role;
ALTER TABLE public.aegis_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read aegis" ON public.aegis_events FOR SELECT TO authenticated USING (public.empyrean_is_admin());

CREATE OR REPLACE FUNCTION public.aegis_log_workforce()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.action = 'aegis_blocked' THEN
    INSERT INTO aegis_events(source, stage, action, findings)
    VALUES ('workforce', 'workforce', 'blocked', ARRAY(SELECT jsonb_array_elements_text(coalesce(NEW.detail->'findings','[]'))));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER aegis_log_workforce AFTER INSERT ON public.workforce_audit FOR EACH ROW EXECUTE FUNCTION public.aegis_log_workforce();
REVOKE ALL ON FUNCTION public.aegis_log_workforce() FROM PUBLIC, anon, authenticated;