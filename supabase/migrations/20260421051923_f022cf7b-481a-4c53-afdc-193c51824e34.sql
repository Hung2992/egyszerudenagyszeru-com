-- launch_subscribers bővítés
ALTER TABLE public.launch_subscribers
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'launch_page',
  ADD COLUMN IF NOT EXISTS interested_product_id uuid,
  ADD COLUMN IF NOT EXISTS share_code text UNIQUE DEFAULT substring(md5(random()::text || clock_timestamp()::text), 1, 10),
  ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_launch_subscribers_email ON public.launch_subscribers(lower(btrim(email)));

-- product_waitlist share boost
ALTER TABLE public.product_waitlist
  ADD COLUMN IF NOT EXISTS share_code text UNIQUE DEFAULT substring(md5(random()::text || clock_timestamp()::text), 1, 10),
  ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_position integer DEFAULT 0;

-- shop_products bővítés
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS early_access_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_access_hours integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS early_access_top_n integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS early_access_discount_percent integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS auto_launch_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS launched_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_launch boolean DEFAULT false;

-- launch_events napló
CREATE TABLE IF NOT EXISTS public.launch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  triggered_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.launch_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage launch events" ON public.launch_events;
CREATE POLICY "Admins manage launch events" ON public.launch_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role insert launch events" ON public.launch_events;
CREATE POLICY "Service role insert launch events" ON public.launch_events
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

-- early access kódok tábla
CREATE TABLE IF NOT EXISTS public.early_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  email text NOT NULL,
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 10,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  used_at timestamptz,
  used_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.early_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage early access codes" ON public.early_access_codes;
CREATE POLICY "Admins manage early access codes" ON public.early_access_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role manage early access codes" ON public.early_access_codes;
CREATE POLICY "Service role manage early access codes" ON public.early_access_codes
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users see own early access codes" ON public.early_access_codes;
CREATE POLICY "Users see own early access codes" ON public.early_access_codes
  FOR SELECT TO authenticated
  USING (lower(btrim(email)) = authenticated_email());

CREATE INDEX IF NOT EXISTS idx_early_access_email ON public.early_access_codes(lower(btrim(email)));
CREATE INDEX IF NOT EXISTS idx_early_access_product ON public.early_access_codes(product_id);

-- share boost — pozíció újraszámolás megosztás után (csökkenti a position értéket)
CREATE OR REPLACE FUNCTION public.recalc_waitlist_share_boost(_waitlist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w RECORD;
  boost integer;
BEGIN
  SELECT * INTO w FROM product_waitlist WHERE id = _waitlist_id;
  IF NOT FOUND THEN RETURN; END IF;
  -- minden 3 megosztás = 1 hely előrébb
  boost := FLOOR(COALESCE(w.shares_count, 0) / 3);
  UPDATE product_waitlist SET boost_position = boost WHERE id = _waitlist_id;
END;
$$;

-- share regisztráció (publikus)
CREATE OR REPLACE FUNCTION public.register_waitlist_share(_share_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w RECORD;
BEGIN
  UPDATE product_waitlist
    SET shares_count = COALESCE(shares_count, 0) + 1
    WHERE share_code = _share_code
    RETURNING * INTO w;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_code'); END IF;
  PERFORM recalc_waitlist_share_boost(w.id);
  UPDATE shop_products SET share_count = COALESCE(share_count, 0) + 1 WHERE id = w.product_id;
  RETURN jsonb_build_object('ok', true, 'shares', w.shares_count + 1, 'boost', FLOOR((COALESCE(w.shares_count, 0) + 1) / 3));
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_waitlist_share(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_waitlist_share_boost(uuid) TO authenticated;