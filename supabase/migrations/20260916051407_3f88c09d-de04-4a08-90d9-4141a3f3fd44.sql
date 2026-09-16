SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.partner_storefront_settings
    ADD COLUMN IF NOT EXISTS bank_account_holder text,
    ADD COLUMN IF NOT EXISTS bank_name text,
    ADD COLUMN IF NOT EXISTS bank_account_number text,
    ADD COLUMN IF NOT EXISTS bank_iban text,
    ADD COLUMN IF NOT EXISTS payment_instructions text;

ALTER TABLE public.partner_orders
    ADD COLUMN IF NOT EXISTS transfer_access_token uuid;

ALTER TABLE public.partner_orders
    ALTER COLUMN transfer_access_token SET DEFAULT gen_random_uuid();

UPDATE public.partner_orders
SET transfer_access_token = gen_random_uuid()
WHERE transfer_access_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partner_orders_transfer_access_token_uidx
ON public.partner_orders (transfer_access_token);

CREATE UNIQUE INDEX IF NOT EXISTS partner_storefront_settings_partner_id_uidx
ON public.partner_storefront_settings (partner_id);

CREATE INDEX IF NOT EXISTS partner_orders_order_number_idx
ON public.partner_orders (order_number);

INSERT INTO public.partner_storefront_settings (
    partner_id, bank_account_holder, bank_name, bank_account_number, bank_iban, payment_instructions
)
SELECT s.partner_id,
       NULLIF(trim(s.bank_account_holder), ''),
       NULLIF(trim(s.bank_name), ''),
       NULLIF(trim(s.bank_account_number), ''),
       NULLIF(upper(regexp_replace(trim(s.bank_iban), '\s+', '', 'g')), ''),
       NULLIF(trim(s.payment_instructions), '')
FROM public.partner_storefronts s
WHERE s.partner_id IS NOT NULL
  AND (
      NULLIF(trim(s.bank_account_holder), '') IS NOT NULL
      OR NULLIF(trim(s.bank_name), '') IS NOT NULL
      OR NULLIF(trim(s.bank_account_number), '') IS NOT NULL
      OR NULLIF(trim(s.bank_iban), '') IS NOT NULL
      OR NULLIF(trim(s.payment_instructions), '') IS NOT NULL
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.partner_storefront_settings t WHERE t.partner_id = s.partner_id
  );

UPDATE public.partner_storefront_settings t
SET bank_account_holder = COALESCE(NULLIF(trim(t.bank_account_holder), ''), NULLIF(trim(s.bank_account_holder), '')),
    bank_name = COALESCE(NULLIF(trim(t.bank_name), ''), NULLIF(trim(s.bank_name), '')),
    bank_account_number = COALESCE(NULLIF(trim(t.bank_account_number), ''), NULLIF(trim(s.bank_account_number), '')),
    bank_iban = COALESCE(
        NULLIF(upper(regexp_replace(trim(t.bank_iban), '\s+', '', 'g')), ''),
        NULLIF(upper(regexp_replace(trim(s.bank_iban), '\s+', '', 'g')), '')
    ),
    payment_instructions = COALESCE(NULLIF(trim(t.payment_instructions), ''), NULLIF(trim(s.payment_instructions), ''))
FROM public.partner_storefronts s
WHERE t.partner_id = s.partner_id;

CREATE OR REPLACE FUNCTION public.get_storefront_transfer_details(_transfer_access_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'bank_account_holder', st.bank_account_holder,
        'bank_name', st.bank_name,
        'bank_account_number', st.bank_account_number,
        'bank_iban', st.bank_iban,
        'payment_instructions', st.payment_instructions
    )
    FROM public.partner_orders o
    INNER JOIN public.partner_storefront_settings st ON st.partner_id = o.partner_id
    WHERE _transfer_access_token IS NOT NULL
      AND o.transfer_access_token = _transfer_access_token
      AND lower(trim(o.payment_method)) = 'transfer'
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_storefront_transfer_details(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_storefront_transfer_details(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_storefront_transfer_details(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_storefront_transfer_details(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_storefront_transfer_details(uuid) TO authenticated;