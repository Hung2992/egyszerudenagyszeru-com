INSERT INTO public.partner_email_subscribers (partner_id, email, name)
VALUES ('847dd052-d5c2-4377-8016-7944e82e1926', 'pungmobilire2002@gmail.com', 'QA')
ON CONFLICT DO NOTHING;

INSERT INTO public.partner_email_blasts (partner_id, subject, body_html, slug, excerpt, published_on_site, published_at, status)
VALUES ('847dd052-d5c2-4377-8016-7944e82e1926', 'Új szolgáltatások és naptár a webshopunkban',
 '<p>Mostantól időpontot is foglalhatsz nálunk, és a termékeink napi állapotát is látod.</p>',
 'uj-szolgaltatasok-es-naptar', 'Időpontfoglalás és napi állapot a termékoldalon.', true, now(), 'draft');