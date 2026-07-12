
-- =====================================================================
-- SPRINT A: DROP / RAFFLE ENGINE — adatbázis
-- =====================================================================

-- Enum: drop típus
DO $$ BEGIN
  CREATE TYPE public.drop_type_enum AS ENUM ('first_come', 'raffle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum: drop státusz
DO $$ BEGIN
  CREATE TYPE public.drop_status_enum AS ENUM ('draft', 'scheduled', 'open', 'closed', 'drawn', 'sold_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum: reservation státusz
DO $$ BEGIN
  CREATE TYPE public.drop_reservation_status_enum AS ENUM ('queued', 'active', 'expired', 'purchased', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================================
-- 1) product_drops — a drop maga
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.product_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.shop_products(id) ON DELETE CASCADE,
  partner_product_id UUID REFERENCES public.partner_products(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  teaser_text TEXT,
  hero_image_url TEXT,
  drop_type public.drop_type_enum NOT NULL DEFAULT 'first_come',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  raffle_draw_at TIMESTAMPTZ,
  total_units INTEGER NOT NULL CHECK (total_units > 0),
  reserved_count INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  max_per_user INTEGER NOT NULL DEFAULT 1 CHECK (max_per_user > 0),
  hold_minutes INTEGER NOT NULL DEFAULT 10 CHECK (hold_minutes > 0),
  winner_checkout_minutes INTEGER NOT NULL DEFAULT 60,
  require_captcha BOOLEAN NOT NULL DEFAULT TRUE,
  status public.drop_status_enum NOT NULL DEFAULT 'draft',
  price_override NUMERIC(12,2),
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_drops_has_product CHECK (product_id IS NOT NULL OR partner_product_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_product_drops_starts_at ON public.product_drops(starts_at);
CREATE INDEX IF NOT EXISTS idx_product_drops_status ON public.product_drops(status);
CREATE INDEX IF NOT EXISTS idx_product_drops_partner ON public.product_drops(partner_id);
CREATE INDEX IF NOT EXISTS idx_product_drops_slug ON public.product_drops(slug);

GRANT SELECT ON public.product_drops TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_drops TO authenticated;
GRANT ALL ON public.product_drops TO service_role;

ALTER TABLE public.product_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active drops"
  ON public.product_drops FOR SELECT
  USING (status IN ('scheduled','open','closed','drawn','sold_out'));

CREATE POLICY "Admins manage all drops"
  ON public.product_drops FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners manage own drops"
  ON public.product_drops FOR ALL
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- ==========================================================
-- 2) drop_notifications — feliratkozók az indulás előtti értesítésre
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.drop_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES public.product_drops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  phone TEXT,
  channels TEXT[] NOT NULL DEFAULT ARRAY['email'],
  notified_at TIMESTAMPTZ,
  session_id TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (drop_id, email)
);
CREATE INDEX IF NOT EXISTS idx_drop_notifications_drop ON public.drop_notifications(drop_id);
CREATE INDEX IF NOT EXISTS idx_drop_notifications_user ON public.drop_notifications(user_id);

GRANT INSERT ON public.drop_notifications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.drop_notifications TO authenticated;
GRANT ALL ON public.drop_notifications TO service_role;

ALTER TABLE public.drop_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.drop_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users see own subscriptions"
  ON public.drop_notifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own subscriptions"
  ON public.drop_notifications FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ==========================================================
-- 3) drop_raffle_entries — raffle jelentkezők
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.drop_raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES public.product_drops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  captcha_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ip_hash TEXT,
  fingerprint_hash TEXT,
  user_agent TEXT,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  winner_position INTEGER,
  won_at TIMESTAMPTZ,
  checkout_deadline TIMESTAMPTZ,
  checkout_completed_at TIMESTAMPTZ,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (drop_id, email)
);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_drop ON public.drop_raffle_entries(drop_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_user ON public.drop_raffle_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_winner ON public.drop_raffle_entries(drop_id, is_winner) WHERE is_winner = TRUE;

GRANT SELECT ON public.drop_raffle_entries TO authenticated;
GRANT ALL ON public.drop_raffle_entries TO service_role;

ALTER TABLE public.drop_raffle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own raffle entries"
  ON public.drop_raffle_entries FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners see raffle entries for own drops"
  ON public.drop_raffle_entries FOR SELECT
  USING (drop_id IN (
    SELECT d.id FROM public.product_drops d
    JOIN public.partners p ON p.id = d.partner_id
    WHERE p.user_id = auth.uid()
  ));

-- ==========================================================
-- 4) drop_reservations — first-come várósor / kosárfoglalás
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.drop_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES public.product_drops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  variant_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  queue_position INTEGER,
  status public.drop_reservation_status_enum NOT NULL DEFAULT 'active',
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ip_hash TEXT,
  fingerprint_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservations_drop_status ON public.drop_reservations(drop_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON public.drop_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_expires ON public.drop_reservations(expires_at) WHERE status = 'active';

GRANT SELECT ON public.drop_reservations TO authenticated;
GRANT ALL ON public.drop_reservations TO service_role;

ALTER TABLE public.drop_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own reservations"
  ON public.drop_reservations FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners see reservations for own drops"
  ON public.drop_reservations FOR SELECT
  USING (drop_id IN (
    SELECT d.id FROM public.product_drops d
    JOIN public.partners p ON p.id = d.partner_id
    WHERE p.user_id = auth.uid()
  ));

-- ==========================================================
-- 5) drop_events — audit napló
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.drop_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES public.product_drops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_hash TEXT,
  fingerprint_hash TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drop_events_drop_time ON public.drop_events(drop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drop_events_type ON public.drop_events(event_type);

GRANT SELECT ON public.drop_events TO authenticated;
GRANT ALL ON public.drop_events TO service_role;

ALTER TABLE public.drop_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all drop events"
  ON public.drop_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners see events for own drops"
  ON public.drop_events FOR SELECT
  USING (drop_id IN (
    SELECT d.id FROM public.product_drops d
    JOIN public.partners p ON p.id = d.partner_id
    WHERE p.user_id = auth.uid()
  ));

-- ==========================================================
-- Trigger: updated_at
-- ==========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_product_drops_updated_at ON public.product_drops;
CREATE TRIGGER trg_product_drops_updated_at
  BEFORE UPDATE ON public.product_drops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- ==========================================================
-- Trigger: automatikus státusz-frissítés a reserved_count / sold_count alapján
-- ==========================================================
CREATE OR REPLACE FUNCTION public.auto_update_drop_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Ha elértük a total_units-t sold_count-tal, sold_out
  IF NEW.sold_count >= NEW.total_units AND NEW.status <> 'sold_out' THEN
    NEW.status := 'sold_out';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_product_drops_auto_status ON public.product_drops;
CREATE TRIGGER trg_product_drops_auto_status
  BEFORE UPDATE OF sold_count ON public.product_drops
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_drop_status();

-- ==========================================================
-- RPC: atomikus foglalás first-come drop-hoz
-- ==========================================================
CREATE OR REPLACE FUNCTION public.reserve_drop_slot(
  p_drop_id UUID,
  p_user_id UUID,
  p_session_id TEXT,
  p_quantity INTEGER DEFAULT 1,
  p_variant_id UUID DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL,
  p_fingerprint_hash TEXT DEFAULT NULL
)
RETURNS TABLE(reservation_id UUID, expires_at TIMESTAMPTZ, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_drop public.product_drops%ROWTYPE;
  v_existing INTEGER;
  v_res_id UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  -- Lezárás a drop soron
  SELECT * INTO v_drop FROM public.product_drops
    WHERE id = p_drop_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TIMESTAMPTZ, 'drop_not_found'; RETURN;
  END IF;
  IF v_drop.status <> 'open' THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TIMESTAMPTZ, 'drop_not_open'; RETURN;
  END IF;
  IF v_drop.drop_type <> 'first_come' THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TIMESTAMPTZ, 'wrong_drop_type'; RETURN;
  END IF;
  IF v_drop.reserved_count + p_quantity > v_drop.total_units THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TIMESTAMPTZ, 'sold_out'; RETURN;
  END IF;

  -- Per-user limit
  IF p_user_id IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity),0) INTO v_existing
    FROM public.drop_reservations
    WHERE drop_id = p_drop_id AND user_id = p_user_id
      AND status IN ('active','purchased');
    IF v_existing + p_quantity > v_drop.max_per_user THEN
      RETURN QUERY SELECT NULL::UUID, NULL::TIMESTAMPTZ, 'max_per_user_reached'; RETURN;
    END IF;
  END IF;

  v_expires := now() + (v_drop.hold_minutes || ' minutes')::INTERVAL;

  INSERT INTO public.drop_reservations(
    drop_id, user_id, session_id, quantity, variant_id, status,
    reserved_at, expires_at, ip_hash, fingerprint_hash
  ) VALUES (
    p_drop_id, p_user_id, p_session_id, p_quantity, p_variant_id, 'active',
    now(), v_expires, p_ip_hash, p_fingerprint_hash
  ) RETURNING id INTO v_res_id;

  UPDATE public.product_drops
    SET reserved_count = reserved_count + p_quantity
    WHERE id = p_drop_id;

  -- Ha telítődött, close
  IF (v_drop.reserved_count + p_quantity) >= v_drop.total_units THEN
    UPDATE public.product_drops SET status = 'closed' WHERE id = p_drop_id;
  END IF;

  INSERT INTO public.drop_events(drop_id, event_type, user_id, session_id, ip_hash, fingerprint_hash, payload)
  VALUES (p_drop_id, 'reserved', p_user_id, p_session_id, p_ip_hash, p_fingerprint_hash,
    jsonb_build_object('reservation_id', v_res_id, 'quantity', p_quantity));

  RETURN QUERY SELECT v_res_id, v_expires, NULL::TEXT;
END $$;

GRANT EXECUTE ON FUNCTION public.reserve_drop_slot(UUID,UUID,TEXT,INTEGER,UUID,TEXT,TEXT) TO authenticated, anon, service_role;

-- ==========================================================
-- RPC: raffle húzás
-- ==========================================================
CREATE OR REPLACE FUNCTION public.draw_raffle_winners(
  p_drop_id UUID
)
RETURNS TABLE(winner_count INTEGER, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_drop public.product_drops%ROWTYPE;
  v_deadline TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_drop FROM public.product_drops WHERE id = p_drop_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 0, 'drop_not_found'; RETURN; END IF;
  IF v_drop.drop_type <> 'raffle' THEN RETURN QUERY SELECT 0, 'not_raffle'; RETURN; END IF;
  IF v_drop.status = 'drawn' THEN RETURN QUERY SELECT 0, 'already_drawn'; RETURN; END IF;

  v_deadline := now() + (v_drop.winner_checkout_minutes || ' minutes')::INTERVAL;

  WITH pool AS (
    SELECT id FROM public.drop_raffle_entries
     WHERE drop_id = p_drop_id
       AND captcha_verified = TRUE
       AND is_winner = FALSE
     ORDER BY random()
     LIMIT v_drop.total_units
  ),
  upd AS (
    UPDATE public.drop_raffle_entries e
      SET is_winner = TRUE,
          won_at = now(),
          checkout_deadline = v_deadline,
          winner_position = sub.pos
      FROM (SELECT id, row_number() OVER () AS pos FROM pool) sub
     WHERE e.id = sub.id
     RETURNING e.id
  )
  SELECT COUNT(*) INTO v_count FROM upd;

  UPDATE public.product_drops
    SET status = 'drawn',
        reserved_count = v_count
    WHERE id = p_drop_id;

  INSERT INTO public.drop_events(drop_id, event_type, payload)
  VALUES (p_drop_id, 'raffle_drawn', jsonb_build_object('winner_count', v_count));

  RETURN QUERY SELECT v_count, NULL::TEXT;
END $$;

GRANT EXECUTE ON FUNCTION public.draw_raffle_winners(UUID) TO authenticated, service_role;

-- ==========================================================
-- RPC: cleanup — lejárt foglalások + lejárt nyertes-fizetések
-- ==========================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_drop_holds()
RETURNS TABLE(expired_reservations INTEGER, expired_winners INTEGER, opened_scheduled INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_res INTEGER := 0;
  v_win INTEGER := 0;
  v_opened INTEGER := 0;
BEGIN
  -- Lejárt aktív foglalások expired-re
  WITH exp AS (
    UPDATE public.drop_reservations
       SET status = 'expired'
     WHERE status = 'active' AND expires_at < now()
     RETURNING drop_id, quantity
  ),
  agg AS (
    SELECT drop_id, SUM(quantity)::INT AS q FROM exp GROUP BY drop_id
  ),
  putback AS (
    UPDATE public.product_drops d
       SET reserved_count = GREATEST(0, d.reserved_count - a.q),
           status = CASE WHEN d.status = 'closed' AND (d.reserved_count - a.q) < d.total_units THEN 'open' ELSE d.status END
      FROM agg a
     WHERE d.id = a.drop_id
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_res FROM putback;

  -- Lejárt raffle nyertesek (nem fizettek időben)
  WITH lostw AS (
    UPDATE public.drop_raffle_entries
       SET is_winner = FALSE, checkout_deadline = NULL, metadata = metadata || jsonb_build_object('missed_deadline', now())
     WHERE is_winner = TRUE AND checkout_completed_at IS NULL AND checkout_deadline < now()
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_win FROM lostw;

  -- Scheduled -> open átváltás ha eljött az idő
  WITH openup AS (
    UPDATE public.product_drops
       SET status = 'open'
     WHERE status = 'scheduled' AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_opened FROM openup;

  -- Ends_at múltba -> closed
  UPDATE public.product_drops
     SET status = 'closed'
   WHERE status IN ('open','scheduled') AND ends_at IS NOT NULL AND ends_at < now();

  RETURN QUERY SELECT v_res, v_win, v_opened;
END $$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_drop_holds() TO service_role;

-- ==========================================================
-- Realtime a queue-hoz
-- ==========================================================
ALTER TABLE public.product_drops REPLICA IDENTITY FULL;
ALTER TABLE public.drop_reservations REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.product_drops; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.drop_reservations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
