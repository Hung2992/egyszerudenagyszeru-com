
-- Refunds table for customer refunds
CREATE TABLE public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'HUF',
  reason TEXT,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'pending',
  bank_details JSONB,
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view refunds"
  ON public.refunds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert refunds"
  ON public.refunds FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update refunds"
  ON public.refunds FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete refunds"
  ON public.refunds FOR DELETE TO authenticated USING (true);

-- Supplier payments table
CREATE TABLE public.supplier_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'HUF',
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'pending',
  bank_details JSONB,
  invoice_ref TEXT,
  notes TEXT,
  processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view supplier_payments"
  ON public.supplier_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert supplier_payments"
  ON public.supplier_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update supplier_payments"
  ON public.supplier_payments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete supplier_payments"
  ON public.supplier_payments FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_payments_updated_at
  BEFORE UPDATE ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
