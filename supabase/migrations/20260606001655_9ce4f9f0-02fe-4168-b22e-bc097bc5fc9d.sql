-- 1. Új oszlopok a store_settings táblába
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS legal_owner_name text,
  ADD COLUMN IF NOT EXISTS legal_registry_number text,
  ADD COLUMN IF NOT EXISTS legal_vat_status text,
  ADD COLUMN IF NOT EXISTS legal_eu_vat_number text,
  ADD COLUMN IF NOT EXISTS legal_invoice_email text,
  ADD COLUMN IF NOT EXISTS legal_privacy_email text,
  ADD COLUMN IF NOT EXISTS legal_phone text,
  ADD COLUMN IF NOT EXISTS legal_customer_hours text,
  ADD COLUMN IF NOT EXISTS legal_mailing_address text,
  ADD COLUMN IF NOT EXISTS legal_bank_name text;

-- 2. Publikus RPC az impresszum/jogi oldalakhoz (jogszabály alapján publikus adatok)
CREATE OR REPLACE FUNCTION public.get_public_legal_info()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'ownerName',         s.legal_owner_name,
    'companyName',       s.invoice_company_name,
    'taxId',             s.invoice_tax_number,
    'euVatNumber',       s.legal_eu_vat_number,
    'registryNumber',    s.legal_registry_number,
    'vatStatus',         s.legal_vat_status,
    'registeredOffice',  s.invoice_address,
    'mailingAddress',    s.legal_mailing_address,
    'email',             s.contact_email,
    'legalEmail',        s.legal_invoice_email,
    'privacyEmail',      s.legal_privacy_email,
    'phone',             COALESCE(s.legal_phone, s.contact_phone),
    'customerHours',     s.legal_customer_hours,
    'bankName',          COALESCE(s.legal_bank_name, s.payment_transfer_bank_name),
    'bankAccount',       s.invoice_bank_account
  )
  FROM public.store_settings s
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_legal_info() TO anon, authenticated;