
-- enum for tenant status
DO $$ BEGIN
  CREATE TYPE public.tenant_status AS ENUM ('draft','active','suspended','terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  tax_number TEXT,
  iban TEXT,
  domain TEXT,
  fork_project_url TEXT,
  contract_signed_at DATE,
  contract_reference TEXT,
  contract_expires_at DATE,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (commission_percent >= 5.00 AND commission_percent <= 100.00),
  status public.tenant_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_admin_all" ON public.tenants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- tenant_revenue_reports table
CREATE TABLE IF NOT EXISTS public.tenant_revenue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL CHECK (period_year BETWEEN 2024 AND 2100),
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  gross_revenue NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gross_revenue >= 0),
  commission_percent_snapshot NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period_year, period_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_revenue_reports TO authenticated;
GRANT ALL ON public.tenant_revenue_reports TO service_role;
ALTER TABLE public.tenant_revenue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_revenue_admin_all" ON public.tenant_revenue_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- auto-fill commission_amount + updated_at
CREATE OR REPLACE FUNCTION public.tenant_revenue_autofill()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.commission_percent_snapshot IS NULL OR NEW.commission_percent_snapshot = 0 THEN
    SELECT commission_percent INTO NEW.commission_percent_snapshot FROM public.tenants WHERE id = NEW.tenant_id;
  END IF;
  NEW.commission_amount := ROUND(NEW.gross_revenue * NEW.commission_percent_snapshot / 100.0, 2);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tenant_revenue_autofill ON public.tenant_revenue_reports;
CREATE TRIGGER trg_tenant_revenue_autofill
  BEFORE INSERT OR UPDATE ON public.tenant_revenue_reports
  FOR EACH ROW EXECUTE FUNCTION public.tenant_revenue_autofill();

CREATE OR REPLACE FUNCTION public.tenants_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_tenants_touch ON public.tenants;
CREATE TRIGGER trg_tenants_touch
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tenants_touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_tenant_revenue_tenant ON public.tenant_revenue_reports(tenant_id, period_year DESC, period_month DESC);
