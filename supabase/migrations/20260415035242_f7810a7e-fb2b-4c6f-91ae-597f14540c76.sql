UPDATE public.orders
SET customer_email = 'missing-email@invalid.local'
WHERE customer_email IS NULL OR btrim(customer_email) = '';

ALTER TABLE public.orders
ALTER COLUMN customer_email SET NOT NULL;