ALTER TABLE public.partner_products DROP CONSTRAINT IF EXISTS partner_products_fulfillment_type_chk;
ALTER TABLE public.partner_products
  ADD CONSTRAINT partner_products_fulfillment_type_chk
  CHECK (fulfillment_type IN ('physical','digital','service','course'));

INSERT INTO public.product_type_catalog (product_type, label, category, is_active, sort_order)
VALUES
  ('course_online', 'Online kurzus', NULL, true, 300),
  ('course_live', 'Élő képzés', NULL, true, 301),
  ('course_workshop', 'Workshop', NULL, true, 302),
  ('course_coaching', 'Coaching program', NULL, true, 303)
ON CONFLICT DO NOTHING;

UPDATE public.partner_products
  SET fulfillment_type = 'course'
  WHERE product_type = 'digital_course';