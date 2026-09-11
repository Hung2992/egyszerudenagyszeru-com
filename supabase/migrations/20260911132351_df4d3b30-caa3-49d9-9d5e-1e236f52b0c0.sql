CREATE TABLE IF NOT EXISTS public.ai_local_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text NOT NULL,
  api_style text NOT NULL DEFAULT 'openai' CHECK (api_style IN ('openai', 'ollama')),
  model text NOT NULL,
  api_key text,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  timeout_ms integer NOT NULL DEFAULT 120000,
  supports_json boolean NOT NULL DEFAULT true,
  last_status text,
  last_checked_at timestamptz,
  last_error text,
  success_count bigint NOT NULL DEFAULT 0,
  failure_count bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_local_endpoints TO authenticated;
GRANT ALL ON public.ai_local_endpoints TO service_role;

ALTER TABLE public.ai_local_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage local ai endpoints" ON public.ai_local_endpoints;
CREATE POLICY "admins manage local ai endpoints"
ON public.ai_local_endpoints
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS ai_local_endpoints_enabled_priority_idx
  ON public.ai_local_endpoints (enabled, priority);

CREATE TABLE IF NOT EXISTS public.ai_routing_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  prefer_local boolean NOT NULL DEFAULT true,
  allow_cloud_fallback boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ai_routing_settings TO authenticated;
GRANT ALL ON public.ai_routing_settings TO service_role;

ALTER TABLE public.ai_routing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage ai routing" ON public.ai_routing_settings;
CREATE POLICY "admins manage ai routing"
ON public.ai_routing_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ai_routing_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;