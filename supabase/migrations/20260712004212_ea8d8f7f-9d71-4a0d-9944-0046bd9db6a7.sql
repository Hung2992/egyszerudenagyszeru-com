
-- 1. shipping_carriers
CREATE TABLE public.shipping_carriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  test_mode BOOLEAN NOT NULL DEFAULT true,
  api_endpoint TEXT,
  api_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  supports_pickup_points BOOLEAN NOT NULL DEFAULT false,
  supports_home_delivery BOOLEAN NOT NULL DEFAULT true,
  supports_cod BOOLEAN NOT NULL DEFAULT false,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_weight_kg NUMERIC(6,2),
  max_weight_kg NUMERIC(6,2),
  delivery_days_min INT DEFAULT 1,
  delivery_days_max INT DEFAULT 3,
  tracking_url_template TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_carriers TO anon, authenticated;
GRANT ALL ON public.shipping_carriers TO service_role;
ALTER TABLE public.shipping_carriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view active carriers" ON public.shipping_carriers
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage carriers" ON public.shipping_carriers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. shipments
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  carrier_id UUID REFERENCES public.shipping_carriers(id),
  carrier_code TEXT NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  label_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  service_type TEXT DEFAULT 'home',
  pickup_point_code TEXT,
  pickup_point_name TEXT,
  weight_kg NUMERIC(6,2),
  dimensions JSONB,
  price NUMERIC(10,2),
  cod_amount NUMERIC(10,2),
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  recipient_address JSONB,
  external_id TEXT,
  raw_response JSONB,
  last_status_check TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shipments_order ON public.shipments(order_id);
CREATE INDEX idx_shipments_tracking ON public.shipments(tracking_number);
CREATE INDEX idx_shipments_status ON public.shipments(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all shipments" ON public.shipments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own shipments" ON public.shipments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = shipments.order_id AND o.user_id = auth.uid())
  );

-- 3. shipment_events
CREATE TABLE public.shipment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  location TEXT,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shipment_events_shipment ON public.shipment_events(shipment_id, event_time DESC);
GRANT SELECT, INSERT ON public.shipment_events TO authenticated;
GRANT ALL ON public.shipment_events TO service_role;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all events" ON public.shipment_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view events for own shipments" ON public.shipment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      JOIN public.orders o ON o.id = s.order_id
      WHERE s.id = shipment_events.shipment_id AND o.user_id = auth.uid()
    )
  );

-- 4. pickup_points cache
CREATE TABLE public.pickup_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier_code TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  zip TEXT,
  country TEXT DEFAULT 'HU',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  opening_hours JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  raw JSONB,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (carrier_code, code)
);
CREATE INDEX idx_pickup_carrier ON public.pickup_points(carrier_code) WHERE active = true;
CREATE INDEX idx_pickup_city ON public.pickup_points(city);
GRANT SELECT ON public.pickup_points TO anon, authenticated;
GRANT ALL ON public.pickup_points TO service_role;
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone views active pickup points" ON public.pickup_points
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage pickup points" ON public.pickup_points
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. updated_at triggerek
CREATE TRIGGER trg_shipping_carriers_updated BEFORE UPDATE ON public.shipping_carriers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shipments_updated BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pickup_points_updated BEFORE UPDATE ON public.pickup_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Alap futárok magyar piachoz
INSERT INTO public.shipping_carriers (code, name, active, test_mode, supports_pickup_points, supports_home_delivery, supports_cod, base_price, delivery_days_min, delivery_days_max, tracking_url_template, sort_order)
VALUES
  ('gls', 'GLS', true, true, true, true, true, 1490, 1, 2, 'https://gls-group.com/HU/hu/csomagkovetes?match={tracking}', 10),
  ('foxpost', 'Foxpost', true, true, true, false, true, 990, 1, 3, 'https://www.foxpost.hu/csomagkovetes?tracking={tracking}', 20),
  ('mpl', 'MPL (Magyar Posta)', true, true, true, true, true, 1290, 2, 4, 'https://www.posta.hu/nyomkovetes?searchtext={tracking}', 30),
  ('packeta', 'Packeta', true, true, true, false, true, 890, 1, 3, 'https://tracking.packeta.com/hu/?id={tracking}', 40),
  ('dpd', 'DPD', true, true, false, true, true, 1590, 1, 2, 'https://tracking.dpd.de/status/hu_HU/parcel/{tracking}', 50)
ON CONFLICT (code) DO NOTHING;
