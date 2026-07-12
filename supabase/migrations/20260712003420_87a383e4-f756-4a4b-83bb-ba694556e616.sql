
-- ============= FÁZIS 1 LEZÁRÁS: ANALITIKA + CACHE + MONITORING =============

-- 1. AI események analitikára (widget nyitás, üzenet, konverzió)
CREATE TABLE public.ai_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL, -- assistant_open, assistant_message, assistant_recommend, cart_suggestion_shown, cart_suggestion_click, cart_suggestion_added, cart_suggestion_purchased, marketing_campaign_generated, marketing_segment_generated
  source TEXT, -- shopping-assistant, smart-cart, ai-marketing
  product_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_events TO anon, authenticated;
GRANT ALL ON public.ai_events TO service_role;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_insert_events" ON public.ai_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins_view_events" ON public.ai_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ai_events_type_created ON public.ai_events(event_type, created_at DESC);
CREATE INDEX idx_ai_events_user ON public.ai_events(user_id, created_at DESC);
CREATE INDEX idx_ai_events_source ON public.ai_events(source, created_at DESC);

-- 2. AI válasz cache (ismétlődő kérdések 1 óráig)
CREATE TABLE public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL, -- hash(function + normalized_prompt)
  function_name TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  response_data JSONB NOT NULL,
  hit_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_response_cache TO authenticated;
GRANT ALL ON public.ai_response_cache TO service_role;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manages_cache" ON public.ai_response_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admins_view_cache" ON public.ai_response_cache FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_ai_cache_key ON public.ai_response_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_response_cache(expires_at);

-- 3. AI usage limitek (napi user limit)
CREATE TABLE public.ai_usage_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INT NOT NULL DEFAULT 0,
  token_count INT NOT NULL DEFAULT 0,
  estimated_cost_credits NUMERIC(10,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, function_name, usage_date)
);
GRANT SELECT ON public.ai_usage_quota TO authenticated;
GRANT ALL ON public.ai_usage_quota TO service_role;
ALTER TABLE public.ai_usage_quota ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_quota" ON public.ai_usage_quota FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_ai_quota_user_date ON public.ai_usage_quota(user_id, usage_date DESC);

-- 4. AI monitoring (hibák, riasztások)
CREATE TABLE public.ai_monitoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  severity TEXT NOT NULL, -- info, warning, error, critical
  event_type TEXT NOT NULL, -- provider_error, rate_limit, high_cost, function_error, anomaly
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.ai_monitoring_events TO authenticated;
GRANT ALL ON public.ai_monitoring_events TO service_role;
ALTER TABLE public.ai_monitoring_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_view_monitoring" ON public.ai_monitoring_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins_resolve_monitoring" ON public.ai_monitoring_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_ai_monitoring_severity ON public.ai_monitoring_events(severity, created_at DESC) WHERE resolved = false;
CREATE INDEX idx_ai_monitoring_function ON public.ai_monitoring_events(function_name, created_at DESC);

-- 5. Cache cleanup függvény (expired sorok törlése)
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.ai_response_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
