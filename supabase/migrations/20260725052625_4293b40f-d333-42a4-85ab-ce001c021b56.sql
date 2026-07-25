
-- 1) Retention config (singleton)
CREATE TABLE IF NOT EXISTS public.ai_agent_bus_retention (
  id boolean PRIMARY KEY DEFAULT true,
  events_retention_days integer NOT NULL DEFAULT 7,
  context_default_ttl_seconds integer NOT NULL DEFAULT 3600,
  auto_cleanup_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT single_row CHECK (id = true)
);
INSERT INTO public.ai_agent_bus_retention (id) VALUES (true) ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.ai_agent_bus_retention TO authenticated;
GRANT ALL ON public.ai_agent_bus_retention TO service_role;

ALTER TABLE public.ai_agent_bus_retention ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage bus retention" ON public.ai_agent_bus_retention;
CREATE POLICY "admins manage bus retention" ON public.ai_agent_bus_retention
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Subscriptions: webhook URL for direct dispatch
ALTER TABLE public.ai_agent_bus_subscriptions
  ADD COLUMN IF NOT EXISTS webhook_url text,
  ADD COLUMN IF NOT EXISTS last_dispatch_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_dispatch_status text;

-- 3) Realtime for bus tables (safe if already present)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_bus_events;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_bus_context;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_bus_subscriptions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 4) Full-replica so realtime UPDATE payloads carry all cols (nice for debug)
ALTER TABLE public.ai_agent_bus_events REPLICA IDENTITY FULL;
ALTER TABLE public.ai_agent_bus_context REPLICA IDENTITY FULL;
