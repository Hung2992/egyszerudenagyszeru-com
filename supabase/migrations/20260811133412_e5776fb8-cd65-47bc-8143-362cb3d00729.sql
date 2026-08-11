CREATE TABLE public.partner_license_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  order_id uuid,
  product_id uuid,
  customer_email text,
  customer_user_id uuid,
  license_key text NOT NULL UNIQUE,
  license_type text NOT NULL DEFAULT 'single',
  seats integer NOT NULL DEFAULT 1,
  activations integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_license_keys TO authenticated;
GRANT ALL ON public.partner_license_keys TO service_role;
ALTER TABLE public.partner_license_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner manages own license keys" ON public.partner_license_keys FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customer views own license keys" ON public.partner_license_keys FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

CREATE TABLE public.partner_download_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  order_id uuid,
  product_id uuid,
  customer_email text,
  customer_user_id uuid,
  token text NOT NULL UNIQUE,
  file_path text,
  file_name text,
  download_limit integer,
  downloads_used integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_download_access TO authenticated;
GRANT ALL ON public.partner_download_access TO service_role;
ALTER TABLE public.partner_download_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner manages own downloads" ON public.partner_download_access FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customer views own downloads" ON public.partner_download_access FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

CREATE TABLE public.partner_course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  order_id uuid,
  product_id uuid,
  customer_email text,
  customer_user_id uuid,
  progress_percent integer NOT NULL DEFAULT 0,
  completed_lessons jsonb NOT NULL DEFAULT '[]'::jsonb,
  access_until timestamptz,
  certificate_issued boolean NOT NULL DEFAULT false,
  certificate_url text,
  status text NOT NULL DEFAULT 'enrolled',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_course_enrollments TO authenticated;
GRANT ALL ON public.partner_course_enrollments TO service_role;
ALTER TABLE public.partner_course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner manages own enrollments" ON public.partner_course_enrollments FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customer views own enrollments" ON public.partner_course_enrollments FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

CREATE TABLE public.partner_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  order_id uuid,
  product_id uuid,
  customer_email text,
  customer_user_id uuid,
  customer_name text,
  starts_at timestamptz,
  duration_min integer,
  location text,
  status text NOT NULL DEFAULT 'requested',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_appointments TO authenticated;
GRANT ALL ON public.partner_appointments TO service_role;
ALTER TABLE public.partner_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner manages own appointments" ON public.partner_appointments FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customer views own appointments" ON public.partner_appointments FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

CREATE INDEX idx_plk_partner ON public.partner_license_keys(partner_id, created_at DESC);
CREATE INDEX idx_pda_partner ON public.partner_download_access(partner_id, created_at DESC);
CREATE INDEX idx_pce_partner ON public.partner_course_enrollments(partner_id, created_at DESC);
CREATE INDEX idx_pap_partner ON public.partner_appointments(partner_id, starts_at DESC);

CREATE TRIGGER trg_plk_updated BEFORE UPDATE ON public.partner_license_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pda_updated BEFORE UPDATE ON public.partner_download_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pce_updated BEFORE UPDATE ON public.partner_course_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pap_updated BEFORE UPDATE ON public.partner_appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();