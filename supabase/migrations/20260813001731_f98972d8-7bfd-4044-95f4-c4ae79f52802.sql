CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text,
  status text NOT NULL DEFAULT 'processing',
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_provider_event_unique UNIQUE (provider, event_id)
);

GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events admin read"
ON public.webhook_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_webhook_events_updated_at ON public.webhook_events;
CREATE TRIGGER update_webhook_events_updated_at
BEFORE UPDATE ON public.webhook_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic claim: returns true only for the caller that may run business logic
CREATE OR REPLACE FUNCTION public.claim_webhook_event(_provider text, _event_id text, _event_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _claimed boolean := false;
BEGIN
  INSERT INTO public.webhook_events (provider, event_id, event_type, status)
  VALUES (_provider, _event_id, _event_type, 'processing')
  ON CONFLICT (provider, event_id) DO UPDATE
    SET attempts = public.webhook_events.attempts + 1,
        status = 'processing',
        updated_at = now()
    WHERE public.webhook_events.status = 'failed'
  RETURNING true INTO _claimed;

  RETURN COALESCE(_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_webhook_event(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_webhook_event(_provider text, _event_id text, _ok boolean, _error text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.webhook_events
     SET status = CASE WHEN _ok THEN 'done' ELSE 'failed' END,
         last_error = _error,
         processed_at = CASE WHEN _ok THEN now() ELSE processed_at END,
         updated_at = now()
   WHERE provider = _provider AND event_id = _event_id;
$$;

REVOKE ALL ON FUNCTION public.complete_webhook_event(text, text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_webhook_event(text, text, boolean, text) TO service_role;