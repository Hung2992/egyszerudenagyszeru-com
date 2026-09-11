-- APEX CPaaS v2: útválasztás, DLR, sávszélesség, csalásvédelem, monitorozás

-- 1) Kimenő üzenetek bővítése kézbesítési riporttal és újrapróbálkozással
ALTER TABLE public.messaging_outbox
  ADD COLUMN IF NOT EXISTS dlr_status TEXT,
  ADD COLUMN IF NOT EXISTS dlr_code TEXT,
  ADD COLUMN IF NOT EXISTS dlr_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS provider_account_id UUID,
  ADD COLUMN IF NOT EXISTS route_id UUID;

CREATE INDEX IF NOT EXISTS idx_outbox_retry ON public.messaging_outbox (status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_outbox_provider_msg ON public.messaging_outbox (provider_message_id);

-- 2) Szolgáltatói fiókok: átbocsátás és országkorlátok
ALTER TABLE public.comm_provider_accounts
  ADD COLUMN IF NOT EXISTS max_tps INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS daily_cap INT,
  ADD COLUMN IF NOT EXISTS allowed_countries TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blocked_countries TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS health TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS consecutive_failures INT NOT NULL DEFAULT 0;

-- 3) Útválasztási szabályok (ország/csatorna -> szolgáltatói fiók)
CREATE TABLE IF NOT EXISTS public.comm_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  country_prefix TEXT NOT NULL DEFAULT '*',
  provider_account_id UUID REFERENCES public.comm_provider_accounts(id) ON DELETE CASCADE,
  priority INT NOT NULL DEFAULT 100,
  sender_override TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comm_routing_rules TO authenticated;
GRANT ALL ON public.comm_routing_rules TO service_role;
ALTER TABLE public.comm_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routing_admin_all" ON public.comm_routing_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "routing_partner_read" ON public.comm_routing_rules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

-- 4) Tiltólista (csalás/visszaélés elleni védelem)
CREATE TABLE IF NOT EXISTS public.comm_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'address',
  value TEXT NOT NULL,
  channel TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocklist_unique ON public.comm_blocklist (scope, value, COALESCE(channel,'*'));
GRANT ALL ON public.comm_blocklist TO service_role;
ALTER TABLE public.comm_blocklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocklist_admin_all" ON public.comm_blocklist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) Átbocsátás (TPS) mérése másodpercenkénti vödrökkel
CREATE TABLE IF NOT EXISTS public.comm_throughput (
  provider_account_id UUID NOT NULL,
  second_bucket BIGINT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (provider_account_id, second_bucket)
);
GRANT ALL ON public.comm_throughput TO service_role;
ALTER TABLE public.comm_throughput ENABLE ROW LEVEL SECURITY;
CREATE POLICY "throughput_admin_read" ON public.comm_throughput FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.comm_hit_throughput(_account UUID, _max_tps INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket BIGINT := floor(extract(epoch from now()));
  current_count INT;
BEGIN
  DELETE FROM public.comm_throughput WHERE second_bucket < bucket - 120;
  INSERT INTO public.comm_throughput (provider_account_id, second_bucket, count)
  VALUES (_account, bucket, 1)
  ON CONFLICT (provider_account_id, second_bucket)
  DO UPDATE SET count = public.comm_throughput.count + 1
  RETURNING count INTO current_count;
  RETURN current_count <= GREATEST(_max_tps, 1);
END;
$$;
REVOKE ALL ON FUNCTION public.comm_hit_throughput(UUID, INT) FROM PUBLIC, anon, authenticated;

-- 6) Monitorozás: átjáró állapot összegzés (csak admin)
CREATE OR REPLACE FUNCTION public.comm_gateway_health()
RETURNS TABLE (
  provider_account_id UUID,
  label TEXT,
  driver TEXT,
  health TEXT,
  consecutive_failures INT,
  last_ok_at TIMESTAMPTZ,
  last_error TEXT,
  sent_24h BIGINT,
  failed_24h BIGINT,
  delivered_24h BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.label, a.driver, a.health, a.consecutive_failures, a.last_ok_at, a.last_error,
    COUNT(*) FILTER (WHERE o.status = 'sent' AND o.created_at > now() - interval '24 hours'),
    COUNT(*) FILTER (WHERE o.status = 'failed' AND o.created_at > now() - interval '24 hours'),
    COUNT(*) FILTER (WHERE o.dlr_status = 'delivered' AND o.created_at > now() - interval '24 hours')
  FROM public.comm_provider_accounts a
  LEFT JOIN public.messaging_outbox o ON o.provider_account_id = a.id
  WHERE public.has_role(auth.uid(),'admin')
  GROUP BY a.id, a.label, a.driver, a.health, a.consecutive_failures, a.last_ok_at, a.last_error;
$$;
REVOKE ALL ON FUNCTION public.comm_gateway_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comm_gateway_health() TO authenticated;

-- 7) Beérkező üzenetek tábla RLS-szabály hiányának pótlása
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='comm_inbound_messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "inbound_admin_read" ON public.comm_inbound_messages';
    EXECUTE 'CREATE POLICY "inbound_admin_read" ON public.comm_inbound_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),''admin''))';
    EXECUTE 'GRANT SELECT ON public.comm_inbound_messages TO authenticated';
  END IF;
END $$;