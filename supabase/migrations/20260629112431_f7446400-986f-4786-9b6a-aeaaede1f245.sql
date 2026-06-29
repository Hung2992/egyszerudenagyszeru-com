
CREATE TABLE public.password_recovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  rate_limited BOOLEAN NOT NULL DEFAULT false,
  error_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prr_email_hash_time ON public.password_recovery_requests(email_hash, created_at DESC);
CREATE INDEX idx_prr_ip_time ON public.password_recovery_requests(ip, created_at DESC);

GRANT SELECT ON public.password_recovery_requests TO authenticated;
GRANT ALL ON public.password_recovery_requests TO service_role;
ALTER TABLE public.password_recovery_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view recovery requests"
  ON public.password_recovery_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.password_recovery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  email_hash TEXT,
  session_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pre_type_time ON public.password_recovery_events(event_type, created_at DESC);
CREATE INDEX idx_pre_session ON public.password_recovery_events(session_id);

GRANT SELECT ON public.password_recovery_events TO authenticated;
GRANT INSERT ON public.password_recovery_events TO anon, authenticated;
GRANT ALL ON public.password_recovery_events TO service_role;
ALTER TABLE public.password_recovery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log recovery events"
  ON public.password_recovery_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type = ANY (ARRAY['link_opened','page_view','save_success','save_error','token_invalid','token_expired','new_link_requested','request_submitted','request_rate_limited'])
  );

CREATE POLICY "Admins view recovery events"
  ON public.password_recovery_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
