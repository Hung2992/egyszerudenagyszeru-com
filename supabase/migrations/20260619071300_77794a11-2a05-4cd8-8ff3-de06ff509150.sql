
-- Termék típusok és tulajdonság sablonok
ALTER TABLE public.partner_products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'clothing',
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compatible_devices jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_partner_products_type ON public.partner_products(product_type);
CREATE INDEX IF NOT EXISTS idx_partner_products_brand ON public.partner_products(brand);

-- Termék típus katalógus (klasszikus szótár: típus, márkák, modellek)
CREATE TABLE IF NOT EXISTS public.product_type_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL,
  label text NOT NULL,
  brand text,
  model text,
  category text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_type_catalog TO anon, authenticated;
GRANT ALL ON public.product_type_catalog TO service_role;

ALTER TABLE public.product_type_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog read for all"
  ON public.product_type_catalog FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin manages catalog"
  ON public.product_type_catalog FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ptc_type ON public.product_type_catalog(product_type);
CREATE INDEX IF NOT EXISTS idx_ptc_brand ON public.product_type_catalog(brand);

-- Seed: termék típusok
INSERT INTO public.product_type_catalog (product_type, label, category, sort_order) VALUES
  ('clothing','Ruházat','type',1),
  ('shoes','Cipő','type',2),
  ('accessory','Kiegészítő','type',3),
  ('phone','Telefon','type',4),
  ('phone_case','Telefon tok','type',5),
  ('screen_protector','Kijelzővédő','type',6),
  ('headphones','Fejhallgató','type',7),
  ('electronics','Egyéb elektronika','type',8),
  ('home','Lakberendezés','type',9),
  ('beauty','Szépségápolás','type',10),
  ('other','Egyéb','type',99)
ON CONFLICT DO NOTHING;

-- Seed: ruha méretek (referencia)
INSERT INTO public.product_type_catalog (product_type, label, category, sort_order) VALUES
  ('clothing','XS','size',1),('clothing','S','size',2),('clothing','M','size',3),
  ('clothing','L','size',4),('clothing','XL','size',5),('clothing','XXL','size',6),
  ('clothing','XXXL','size',7)
ON CONFLICT DO NOTHING;

-- Seed: cipő méretek
INSERT INTO public.product_type_catalog (product_type, label, category, sort_order)
SELECT 'shoes', s::text, 'size', s FROM generate_series(35,48) s
ON CONFLICT DO NOTHING;

-- Seed: telefon márkák + népszerű modellek
INSERT INTO public.product_type_catalog (product_type, label, brand, model, category, sort_order) VALUES
  ('phone_case','iPhone 15 Pro Max','Apple','iPhone 15 Pro Max','device',1),
  ('phone_case','iPhone 15 Pro','Apple','iPhone 15 Pro','device',2),
  ('phone_case','iPhone 15 Plus','Apple','iPhone 15 Plus','device',3),
  ('phone_case','iPhone 15','Apple','iPhone 15','device',4),
  ('phone_case','iPhone 14 Pro Max','Apple','iPhone 14 Pro Max','device',5),
  ('phone_case','iPhone 14 Pro','Apple','iPhone 14 Pro','device',6),
  ('phone_case','iPhone 14','Apple','iPhone 14','device',7),
  ('phone_case','iPhone 13 Pro Max','Apple','iPhone 13 Pro Max','device',8),
  ('phone_case','iPhone 13','Apple','iPhone 13','device',9),
  ('phone_case','iPhone 12','Apple','iPhone 12','device',10),
  ('phone_case','iPhone 11','Apple','iPhone 11','device',11),
  ('phone_case','iPhone SE (2022)','Apple','iPhone SE 2022','device',12),
  ('phone_case','Samsung Galaxy S24 Ultra','Samsung','Galaxy S24 Ultra','device',20),
  ('phone_case','Samsung Galaxy S24+','Samsung','Galaxy S24+','device',21),
  ('phone_case','Samsung Galaxy S24','Samsung','Galaxy S24','device',22),
  ('phone_case','Samsung Galaxy S23 Ultra','Samsung','Galaxy S23 Ultra','device',23),
  ('phone_case','Samsung Galaxy S23','Samsung','Galaxy S23','device',24),
  ('phone_case','Samsung Galaxy S22','Samsung','Galaxy S22','device',25),
  ('phone_case','Samsung Galaxy A55','Samsung','Galaxy A55','device',26),
  ('phone_case','Samsung Galaxy A54','Samsung','Galaxy A54','device',27),
  ('phone_case','Samsung Galaxy A34','Samsung','Galaxy A34','device',28),
  ('phone_case','Xiaomi 14 Ultra','Xiaomi','Xiaomi 14 Ultra','device',30),
  ('phone_case','Xiaomi 14','Xiaomi','Xiaomi 14','device',31),
  ('phone_case','Xiaomi 13','Xiaomi','Xiaomi 13','device',32),
  ('phone_case','Xiaomi Redmi Note 13 Pro','Xiaomi','Redmi Note 13 Pro','device',33),
  ('phone_case','Xiaomi Redmi Note 12','Xiaomi','Redmi Note 12','device',34),
  ('phone_case','Google Pixel 8 Pro','Google','Pixel 8 Pro','device',40),
  ('phone_case','Google Pixel 8','Google','Pixel 8','device',41),
  ('phone_case','Google Pixel 7','Google','Pixel 7','device',42),
  ('phone_case','Huawei P60 Pro','Huawei','P60 Pro','device',50),
  ('phone_case','OnePlus 12','OnePlus','OnePlus 12','device',60),
  ('phone_case','OnePlus 11','OnePlus','OnePlus 11','device',61),
  ('phone_case','Nothing Phone 2','Nothing','Phone 2','device',70)
ON CONFLICT DO NOTHING;

-- Telefon márkák (új telefon eladáshoz)
INSERT INTO public.product_type_catalog (product_type, label, brand, category, sort_order) VALUES
  ('phone','Apple','Apple','brand',1),
  ('phone','Samsung','Samsung','brand',2),
  ('phone','Xiaomi','Xiaomi','brand',3),
  ('phone','Google','Google','brand',4),
  ('phone','Huawei','Huawei','brand',5),
  ('phone','OnePlus','OnePlus','brand',6),
  ('phone','Nothing','Nothing','brand',7),
  ('phone','Motorola','Motorola','brand',8)
ON CONFLICT DO NOTHING;
