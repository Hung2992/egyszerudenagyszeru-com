
CREATE TABLE public.admin_procurement_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  supplier_url TEXT,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  currency TEXT NOT NULL DEFAULT 'HUF',
  payment_method TEXT NOT NULL DEFAULT 'bank_card',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'draft',
  tracking_number TEXT,
  expected_arrival DATE,
  actual_arrival DATE,
  notes TEXT,
  linked_product_id UUID,
  ordered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_procurement_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view procurement orders"
ON public.admin_procurement_orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create procurement orders"
ON public.admin_procurement_orders FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update procurement orders"
ON public.admin_procurement_orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete procurement orders"
ON public.admin_procurement_orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_admin_procurement_orders_updated_at
BEFORE UPDATE ON public.admin_procurement_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
