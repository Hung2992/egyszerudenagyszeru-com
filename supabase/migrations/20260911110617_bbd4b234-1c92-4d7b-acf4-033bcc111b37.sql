
-- ===== APEX Communication Platform =====

CREATE TABLE public.comm_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['messages:send','messages:read'],
  rate_limit_per_min integer NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_api_keys TO authenticated;
GRANT ALL ON public.comm_api_keys TO service_role;
ALTER TABLE public.comm_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin api keys" ON public.comm_api_keys FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
WITH CHECK (public.has_role(auth.uid(),'admin') OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
CREATE INDEX idx_comm_api_keys_partner ON public.comm_api_keys(partner_id);

CREATE TABLE public.comm_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  provider text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  unit_cost numeric(10,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_providers TO authenticated;
GRANT ALL ON public.comm_providers TO service_role;
ALTER TABLE public.comm_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages providers" ON public.comm_providers FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.comm_providers (channel, provider, priority, unit_cost) VALUES
  ('sms','twilio_own',10,12),
  ('sms','twilio_gateway',20,15),
  ('whatsapp','twilio_own',10,8),
  ('whatsapp','twilio_gateway',20,10),
  ('voice','twilio_own',10,30),
  ('email','internal',10,0);

CREATE TABLE public.comm_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['message.sent','message.delivered','message.failed'],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_webhooks TO authenticated;
GRANT ALL ON public.comm_webhooks TO service_role;
ALTER TABLE public.comm_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin webhooks" ON public.comm_webhooks FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
WITH CHECK (public.has_role(auth.uid(),'admin') OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE TABLE public.comm_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.comm_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  response_code integer,
  error text,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comm_webhook_deliveries TO authenticated;
GRANT ALL ON public.comm_webhook_deliveries TO service_role;
ALTER TABLE public.comm_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin webhook deliveries" ON public.comm_webhook_deliveries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR webhook_id IN (
  SELECT w.id FROM public.comm_webhooks w JOIN public.partners p ON p.id = w.partner_id WHERE p.user_id = auth.uid()));
CREATE INDEX idx_comm_wh_deliveries_pending ON public.comm_webhook_deliveries(status, next_retry_at);

CREATE TABLE public.comm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messaging_outbox(id) ON DELETE CASCADE,
  partner_id uuid,
  event text NOT NULL,
  channel text,
  provider text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comm_events TO authenticated;
GRANT ALL ON public.comm_events TO service_role;
ALTER TABLE public.comm_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin comm events" ON public.comm_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
CREATE INDEX idx_comm_events_message ON public.comm_events(message_id);
CREATE INDEX idx_comm_events_partner_time ON public.comm_events(partner_id, created_at DESC);

CREATE TABLE public.comm_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  channel text NOT NULL,
  provider text,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  cost_total numeric(12,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, day, channel, provider)
);
GRANT SELECT ON public.comm_usage TO authenticated;
GRANT ALL ON public.comm_usage TO service_role;
ALTER TABLE public.comm_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin comm usage" ON public.comm_usage FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

ALTER TABLE public.messaging_outbox
  ADD COLUMN IF NOT EXISTS api_key_id uuid REFERENCES public.comm_api_keys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messaging_outbox_idem
  ON public.messaging_outbox(partner_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER trg_comm_api_keys_updated BEFORE UPDATE ON public.comm_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_comm_providers_updated BEFORE UPDATE ON public.comm_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_comm_webhooks_updated BEFORE UPDATE ON public.comm_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_comm_wh_deliveries_updated BEFORE UPDATE ON public.comm_webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_comm_usage_updated BEFORE UPDATE ON public.comm_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
