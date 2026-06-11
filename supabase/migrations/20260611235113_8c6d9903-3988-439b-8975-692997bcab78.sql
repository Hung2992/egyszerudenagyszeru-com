
-- Helper
CREATE OR REPLACE FUNCTION public.is_admin_or_accountant(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','accountant')
  )
$$;

-- RLS read-only policies for financial tables
DROP POLICY IF EXISTS "Accountant can view all invoices" ON public.invoices;
CREATE POLICY "Accountant can view all invoices" ON public.invoices FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view all orders" ON public.orders;
CREATE POLICY "Accountant can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view refund history" ON public.refund_history;
CREATE POLICY "Accountant can view refund history" ON public.refund_history FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view refunds" ON public.refunds;
CREATE POLICY "Accountant can view refunds" ON public.refunds FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view payment attempts" ON public.payment_attempts;
CREATE POLICY "Accountant can view payment attempts" ON public.payment_attempts FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view transactions" ON public.admin_transactions;
CREATE POLICY "Accountant can view transactions" ON public.admin_transactions FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view payouts" ON public.payouts;
CREATE POLICY "Accountant can view payouts" ON public.payouts FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view supplier payments" ON public.supplier_payments;
CREATE POLICY "Accountant can view supplier payments" ON public.supplier_payments FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view procurement" ON public.admin_procurement_orders;
CREATE POLICY "Accountant can view procurement" ON public.admin_procurement_orders FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view tax rates" ON public.tax_rates;
CREATE POLICY "Accountant can view tax rates" ON public.tax_rates FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant can view coupons" ON public.coupons;
CREATE POLICY "Accountant can view coupons" ON public.coupons FOR SELECT TO authenticated USING (public.is_admin_or_accountant(auth.uid()));

-- Legal info for accountant (full)
CREATE OR REPLACE FUNCTION public.get_accountant_legal_info()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin_or_accountant(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'ownerName', s.legal_owner_name,
    'taxId', s.invoice_tax_number,
    'euVatNumber', s.legal_eu_vat_number,
    'registryNumber', s.legal_registry_number,
    'vatStatus', s.legal_vat_status,
    'registeredOffice', s.legal_registered_office,
    'mailingAddress', s.legal_mailing_address,
    'bankName', s.legal_bank_name,
    'bankAccount', s.legal_bank_account,
    'invoicePrefix', s.invoice_number_prefix,
    'invoiceYear', s.invoice_number_year,
    'invoiceCounter', s.invoice_number_counter
  ) INTO result FROM public.store_settings s LIMIT 1;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_accountant_legal_info() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_accountant_legal_info() TO authenticated;

-- Pending invites
CREATE TABLE IF NOT EXISTS public.pending_accountant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_accountant_invites TO authenticated;
GRANT ALL ON public.pending_accountant_invites TO service_role;
ALTER TABLE public.pending_accountant_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage accountant invites" ON public.pending_accountant_invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Audit
CREATE TABLE IF NOT EXISTS public.accountant_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.accountant_access_log TO authenticated;
GRANT ALL ON public.accountant_access_log TO service_role;
ALTER TABLE public.accountant_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Self insert audit" ON public.accountant_access_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "Admin reads audit" ON public.accountant_access_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());
CREATE INDEX IF NOT EXISTS accountant_access_log_user_idx ON public.accountant_access_log(user_id, created_at DESC);

-- Trigger: on auth.users insert, grant accountant if invited
CREATE OR REPLACE FUNCTION public.handle_accountant_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv RECORD;
BEGIN
  SELECT * INTO inv FROM public.pending_accountant_invites
    WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'accountant')
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.pending_accountant_invites
      SET accepted_at = now(), accepted_user_id = NEW.id WHERE id = inv.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_accountant ON auth.users;
CREATE TRIGGER on_auth_user_created_accountant
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_accountant_signup();

-- Admin helpers
CREATE OR REPLACE FUNCTION public.list_accountants()
RETURNS TABLE(user_id uuid, email text, granted_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT ur.user_id, u.email::text, u.created_at
    FROM public.user_roles ur JOIN auth.users u ON u.id = ur.user_id
    WHERE ur.role = 'accountant';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.list_accountants() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_accountants() TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_accountant(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'accountant';
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_accountant(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.revoke_accountant(uuid) TO authenticated;
