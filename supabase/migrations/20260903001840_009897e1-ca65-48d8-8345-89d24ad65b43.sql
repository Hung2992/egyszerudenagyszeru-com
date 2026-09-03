CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  bucket_key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL
);

GRANT ALL ON public.edge_rate_limits TO service_role;
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read rate limits" ON public.edge_rate_limits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.hit_rate_limit(_key text, _limit integer, _window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c integer;
BEGIN
  INSERT INTO public.edge_rate_limits AS r (bucket_key, count, reset_at)
  VALUES (_key, 1, now() + make_interval(secs => _window_seconds))
  ON CONFLICT (bucket_key) DO UPDATE
    SET count = CASE WHEN r.reset_at < now() THEN 1 ELSE r.count + 1 END,
        reset_at = CASE WHEN r.reset_at < now() THEN now() + make_interval(secs => _window_seconds) ELSE r.reset_at END
  RETURNING count INTO c;
  RETURN c <= _limit;
END;
$$;