
INSERT INTO public.product_type_catalog (product_type, label, category, sort_order, is_active) VALUES
  ('shoes', 'Cipő', 'type', 15, true),
  ('phone_case', 'Telefon tok', 'type', 25, true),
  ('screen_protector', 'Kijelzővédő', 'type', 26, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.product_type_catalog (product_type, label, category, sort_order, is_active)
SELECT 'shoes', s::text, 'size', 100 + (s - 35), true
FROM generate_series(35, 48) s
WHERE NOT EXISTS (SELECT 1 FROM public.product_type_catalog WHERE product_type='shoes' AND category='size' AND label = s::text);
