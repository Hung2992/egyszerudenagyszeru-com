ALTER TABLE public.partner_products
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'physical';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_products_fulfillment_type_chk') THEN
    ALTER TABLE public.partner_products
      ADD CONSTRAINT partner_products_fulfillment_type_chk
      CHECK (fulfillment_type IN ('physical','digital','service'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_products_fulfillment ON public.partner_products (fulfillment_type);

INSERT INTO public.product_type_catalog (product_type, label, category, sort_order, is_active) VALUES
  ('digital_download','Digitális letöltés (e-book, PDF, zene)','type',200,true),
  ('digital_license','Szoftver / licenckulcs','type',201,true),
  ('digital_course','Online kurzus / videó tananyag','type',202,true),
  ('digital_template','Sablon / grafika / preset','type',203,true),
  ('digital_subscription','Előfizetés / tagság','type',204,true),
  ('service_consulting','Szolgáltatás – tanácsadás','type',210,true),
  ('service_appointment','Szolgáltatás – időpontfoglalás','type',211,true),
  ('service_repair','Szolgáltatás – javítás / szerviz','type',212,true),
  ('service_custom','Szolgáltatás – egyedi munka','type',213,true)
ON CONFLICT DO NOTHING;