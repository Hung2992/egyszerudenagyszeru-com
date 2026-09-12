CREATE TABLE public.partner_shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  method_type text NOT NULL DEFAULT 'home_delivery',
  description text,
  fee_huf integer NOT NULL DEFAULT 0,
  free_over_huf integer,
  requires_address boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_shipping_methods_type_chk CHECK (method_type IN ('home_delivery','pickup_point','personal_pickup')),
  CONSTRAINT partner_shipping_methods_fee_chk CHECK (fee_huf >= 0)
);

GRANT SELECT ON public.partner_shipping_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_shipping_methods TO authenticated;
GRANT ALL ON public.partner_shipping_methods TO service_role;

ALTER TABLE public.partner_shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shipping methods"
ON public.partner_shipping_methods FOR SELECT
USING (is_active = true);

CREATE POLICY "Partners manage own shipping methods"
ON public.partner_shipping_methods FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins manage all shipping methods"
ON public.partner_shipping_methods FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_partner_shipping_methods_partner ON public.partner_shipping_methods(partner_id, sort_order);

CREATE TRIGGER trg_partner_shipping_methods_updated
BEFORE UPDATE ON public.partner_shipping_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();