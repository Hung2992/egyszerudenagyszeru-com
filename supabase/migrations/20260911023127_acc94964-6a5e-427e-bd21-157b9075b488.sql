ALTER TABLE public.partner_products DISABLE TRIGGER USER;
UPDATE public.partner_products SET status = 'active', approved_at = now() WHERE status = 'pending_review';
ALTER TABLE public.partner_products ENABLE TRIGGER USER;

ALTER TABLE public.partner_storefronts DISABLE TRIGGER USER;
UPDATE public.partner_storefronts s SET is_published = true
WHERE EXISTS (SELECT 1 FROM public.partner_products p WHERE p.partner_id = s.partner_id AND p.status = 'active');
ALTER TABLE public.partner_storefronts ENABLE TRIGGER USER;