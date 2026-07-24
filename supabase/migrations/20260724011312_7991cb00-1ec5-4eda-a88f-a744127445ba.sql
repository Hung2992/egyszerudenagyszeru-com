-- AI Agent Bus — közös context store + event bus minden AI ügynökhöz

CREATE TABLE IF NOT EXISTS public.ai_agent_bus_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  produced_by TEXT NOT NULL,
  ttl_seconds INTEGER,
  expires_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (namespace, key)
);

CREATE INDEX IF NOT EXISTS idx_agent_bus_context_ns ON public.ai_agent_bus_context (namespace);
CREATE INDEX IF NOT EXISTS idx_agent_bus_context_producer ON public.ai_agent_bus_context (produced_by);
CREATE INDEX IF NOT EXISTS idx_agent_bus_context_expires ON public.ai_agent_bus_context (expires_at);

GRANT SELECT ON public.ai_agent_bus_context TO authenticated;
GRANT ALL ON public.ai_agent_bus_context TO service_role;
ALTER TABLE public.ai_agent_bus_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read bus context" ON public.ai_agent_bus_context
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Event bus (append-only)
CREATE TABLE IF NOT EXISTS public.ai_agent_bus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_agent TEXT NOT NULL,
  target_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id UUID,
  consumed_by TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_bus_events_type ON public.ai_agent_bus_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_bus_events_source ON public.ai_agent_bus_events (source_agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_bus_events_target ON public.ai_agent_bus_events (target_agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_bus_events_created ON public.ai_agent_bus_events (created_at DESC);

GRANT SELECT ON public.ai_agent_bus_events TO authenticated;
GRANT ALL ON public.ai_agent_bus_events TO service_role;
ALTER TABLE public.ai_agent_bus_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read bus events" ON public.ai_agent_bus_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Feliratkozás: melyik ügynök melyik event típusokra figyel
CREATE TABLE IF NOT EXISTS public.ai_agent_bus_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  event_type_pattern TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_consumed_at TIMESTAMPTZ,
  consume_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_name, event_type_pattern)
);

GRANT SELECT ON public.ai_agent_bus_subscriptions TO authenticated;
GRANT ALL ON public.ai_agent_bus_subscriptions TO service_role;
ALTER TABLE public.ai_agent_bus_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read bus subs" ON public.ai_agent_bus_subscriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger (reuse existing function)
CREATE TRIGGER trg_agent_bus_context_updated
  BEFORE UPDATE ON public.ai_agent_bus_context
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_agent_bus_subs_updated
  BEFORE UPDATE ON public.ai_agent_bus_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- expires_at automatikus számítása ttl_seconds alapján
CREATE OR REPLACE FUNCTION public.compute_bus_context_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ttl_seconds IS NOT NULL THEN
    NEW.expires_at := now() + (NEW.ttl_seconds || ' seconds')::interval;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_agent_bus_context_expiry
  BEFORE INSERT OR UPDATE ON public.ai_agent_bus_context
  FOR EACH ROW EXECUTE FUNCTION public.compute_bus_context_expiry();

-- Publish helper — bármelyik edge function meghívhatja
CREATE OR REPLACE FUNCTION public.agent_bus_publish(
  _source_agent TEXT,
  _event_type TEXT,
  _payload JSONB DEFAULT '{}'::jsonb,
  _target_agent TEXT DEFAULT NULL,
  _severity TEXT DEFAULT 'info',
  _correlation_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  INSERT INTO public.ai_agent_bus_events (event_type, source_agent, target_agent, severity, payload, correlation_id)
  VALUES (_event_type, _source_agent, _target_agent, _severity, _payload, _correlation_id)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_bus_context;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_bus_events;

-- Alap feliratkozások
INSERT INTO public.ai_agent_bus_subscriptions (agent_name, event_type_pattern) VALUES
  ('marketing-ceo', 'social.%'),
  ('marketing-ceo', 'partner.%'),
  ('marketing-ceo', 'shop.%'),
  ('social-publisher', 'marketing.strategy.%'),
  ('partner-recruitment-agent', 'partner.lead.%'),
  ('partner-recruitment-agent', 'marketing.insight.%'),
  ('partner-acquisition-agent', 'partner.%'),
  ('shopping-assistant', 'shop.trend.%'),
  ('shopping-assistant', 'user.intent.%'),
  ('smart-cart', 'shop.%'),
  ('price-negotiate', 'shop.pricing.%'),
  ('fashion-stylist', 'shop.trend.%'),
  ('ai-marketing-auto', 'social.%'),
  ('ai-marketing-auto', 'shop.%')
ON CONFLICT (agent_name, event_type_pattern) DO NOTHING;