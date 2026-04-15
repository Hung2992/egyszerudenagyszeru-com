
-- Payouts table
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  fee numeric DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'HUF',
  status text DEFAULT 'pending',
  payment_method text DEFAULT 'bank_transfer',
  payment_details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  failed_reason text
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payouts" ON public.payouts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Refunds table
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  customer_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'HUF',
  reason text,
  method text DEFAULT 'bank_transfer',
  status text DEFAULT 'pending',
  bank_details jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage refunds" ON public.refunds FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Supplier payments table
CREATE TABLE public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'HUF',
  method text DEFAULT 'bank_transfer',
  status text DEFAULT 'pending',
  bank_details jsonb,
  invoice_ref text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage supplier payments" ON public.supplier_payments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin bank cards table
CREATE TABLE public.admin_bank_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_name text NOT NULL DEFAULT '',
  card_last4 text NOT NULL DEFAULT '',
  card_type text DEFAULT 'visa',
  expiry_month integer,
  expiry_year integer,
  holder_name text,
  bank_name text,
  iban text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_bank_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bank cards" ON public.admin_bank_cards FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin transactions (deposits & withdrawals)
CREATE TABLE public.admin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'deposit',
  amount numeric NOT NULL DEFAULT 0,
  fee numeric DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'HUF',
  status text DEFAULT 'pending',
  card_id uuid REFERENCES public.admin_bank_cards(id),
  method text DEFAULT 'bank_transfer',
  description text,
  reference_id text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.admin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage transactions" ON public.admin_transactions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
