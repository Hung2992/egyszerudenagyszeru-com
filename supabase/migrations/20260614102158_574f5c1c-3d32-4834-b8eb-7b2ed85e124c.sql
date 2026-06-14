
CREATE TABLE public.tenant_kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  birth_name text,
  birth_place text NOT NULL,
  birth_date date NOT NULL,
  mother_name text NOT NULL,
  nationality text NOT NULL DEFAULT 'magyar',
  id_card_number text NOT NULL,
  address_card_number text NOT NULL,
  tax_id text,
  address_country text NOT NULL DEFAULT 'Magyarország',
  address_zip text NOT NULL,
  address_city text NOT NULL,
  address_street text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  bank_name text NOT NULL,
  bank_account_holder text NOT NULL,
  bank_account_number text NOT NULL,
  company_name text,
  company_tax_number text,
  company_reg_number text,
  id_card_front_url text,
  id_card_back_url text,
  address_card_url text,
  selfie_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.tenant_kyc_submissions TO authenticated;
GRANT ALL ON public.tenant_kyc_submissions TO service_role;

ALTER TABLE public.tenant_kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own kyc" ON public.tenant_kyc_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own kyc" ON public.tenant_kyc_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending kyc" ON public.tenant_kyc_submissions
  FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id AND status = 'pending') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK ((auth.uid() = user_id AND status = 'pending') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tenant_kyc_updated_at
  BEFORE UPDATE ON public.tenant_kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tenant_kyc_user ON public.tenant_kyc_submissions(user_id);
CREATE INDEX idx_tenant_kyc_status ON public.tenant_kyc_submissions(status);
