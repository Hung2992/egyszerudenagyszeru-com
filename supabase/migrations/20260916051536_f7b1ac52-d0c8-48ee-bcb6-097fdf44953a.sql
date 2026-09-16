SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

UPDATE public.partner_orders
SET transfer_access_token = gen_random_uuid()
WHERE transfer_access_token IS NULL
  AND lower(trim(payment_method)) = 'transfer';

UPDATE public.partner_orders
SET transfer_access_token = NULL
WHERE payment_method IS NULL
   OR lower(trim(payment_method)) <> 'transfer';

DO $$
DECLARE
    missing_count integer;
BEGIN
    SELECT COUNT(*) INTO missing_count
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
    IF missing_count > 0 THEN
        RAISE EXCEPTION 'MIGRÁCIÓ MEGSZAKÍTVA: % banki rekord nem került át.', missing_count;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS partner_orders_transfer_token_lookup_idx
ON public.partner_orders (transfer_access_token, payment_method);

ALTER TABLE public.partner_storefronts
    DROP COLUMN IF EXISTS bank_account_holder,
    DROP COLUMN IF EXISTS bank_name,
    DROP COLUMN IF EXISTS bank_account_number,
    DROP COLUMN IF EXISTS bank_iban,
    DROP COLUMN IF EXISTS payment_instructions;

ALTER FUNCTION public.get_storefront_transfer_details(uuid) SET search_path = pg_catalog, public;

DO $$
DECLARE
    old_column_count integer;
BEGIN
    SELECT COUNT(*) INTO old_column_count FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_storefronts'
      AND column_name IN ('bank_account_holder','bank_name','bank_account_number','bank_iban','payment_instructions');
    IF old_column_count <> 0 THEN
        RAISE EXCEPTION 'VÉGSŐ ELLENŐRZÉS SIKERTELEN: % régi banki mező maradt.', old_column_count;
    END IF;
END
$$;