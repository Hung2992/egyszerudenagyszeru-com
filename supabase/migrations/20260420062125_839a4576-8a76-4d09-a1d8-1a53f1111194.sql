-- Csomag 1: Rendelés + Fizetés + Számla infrastruktúra

-- 1. Rendelés események (audit napló minden rendelés-változáshoz)
CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'created', 'paid', 'shipped', 'cancelled', 'refunded', 'fraud_flag', 'auto_cancelled', 'reminder_sent'
  previous_status text,
  new_status text,
  triggered_by text DEFAULT 'system', -- 'user', 'admin', 'system', 'cron', 'ai'
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order ON public.order_events(order_id, created_at DESC);
CREATE INDEX idx_order_events_type ON public.order_events(event_type, created_at DESC);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order events"
ON public.order_events FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert events"
ON public.order_events FOR INSERT TO public
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can read own order events"
ON public.order_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_events.order_id
  AND (o.user_id = auth.uid() OR lower(btrim(o.customer_email)) = authenticated_email())
));

-- 2. Számlák
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_address text,
  customer_city text,
  customer_zip text,
  customer_tax_number text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  shipping_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 27,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'HUF',
  payment_method text,
  paid_at timestamptz,
  pdf_url text,
  status text NOT NULL DEFAULT 'draft', -- draft, issued, paid, void
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_order ON public.invoices(order_id);
CREATE INDEX idx_invoices_email ON public.invoices(lower(btrim(customer_email)));
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices"
ON public.invoices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage invoices"
ON public.invoices FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can read own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (lower(btrim(customer_email)) = authenticated_email());

-- 3. Fizetési kísérletek (retry tracking)
CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  payment_method text,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'HUF',
  status text NOT NULL DEFAULT 'pending', -- pending, success, failed, cancelled
  provider text, -- 'stripe', 'cod', 'transfer'
  provider_intent_id text,
  error_code text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_payment_attempts_order ON public.payment_attempts(order_id, created_at DESC);
CREATE INDEX idx_payment_attempts_status ON public.payment_attempts(status, created_at DESC);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment attempts"
ON public.payment_attempts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage payment attempts"
ON public.payment_attempts FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 4. AI csalásgyanú jelzések
CREATE TABLE public.fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  risk_score integer NOT NULL DEFAULT 0, -- 0-100
  risk_level text NOT NULL DEFAULT 'low', -- low, medium, high, critical
  signals jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{type, description, weight}]
  ai_reasoning text,
  reviewed boolean DEFAULT false,
  reviewed_by uuid,
  review_outcome text, -- 'legit', 'fraud', 'unclear'
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_order ON public.fraud_signals(order_id);
CREATE INDEX idx_fraud_risk ON public.fraud_signals(risk_level, risk_score DESC, created_at DESC);

ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud signals"
ON public.fraud_signals FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert fraud signals"
ON public.fraud_signals FOR INSERT TO public
WITH CHECK (auth.role() = 'service_role');

-- 5. Beállítás bővítés (auto-cancel óra, ÁFA, számlasor)
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS invoice_number_prefix text DEFAULT 'EDN',
  ADD COLUMN IF NOT EXISTS invoice_number_year integer DEFAULT EXTRACT(year FROM now())::integer,
  ADD COLUMN IF NOT EXISTS invoice_number_counter integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_default_tax_rate numeric DEFAULT 27,
  ADD COLUMN IF NOT EXISTS invoice_auto_generate boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_payment_retry_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_payment_retry_hours integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS order_reminder_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_reminder_after_hours integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS fraud_detection_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS fraud_auto_block_threshold integer DEFAULT 80;

-- 6. Számlaszám-generáló RPC
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  current_year integer := EXTRACT(year FROM now())::integer;
  stored_year integer;
  counter integer;
  new_number text;
BEGIN
  SELECT COALESCE(invoice_number_prefix, 'EDN'),
         COALESCE(invoice_number_year, current_year),
         COALESCE(invoice_number_counter, 0)
  INTO prefix, stored_year, counter
  FROM public.store_settings LIMIT 1;

  IF stored_year <> current_year THEN
    counter := 1;
    UPDATE public.store_settings
    SET invoice_number_year = current_year,
        invoice_number_counter = 1;
  ELSE
    counter := counter + 1;
    UPDATE public.store_settings
    SET invoice_number_counter = counter;
  END IF;

  new_number := prefix || '-' || current_year || '-' || LPAD(counter::text, 5, '0');
  RETURN new_number;
END;
$$;

-- 7. Order változás trigger -> esemény napló
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_events (order_id, event_type, new_status, triggered_by)
    VALUES (NEW.id, 'created', NEW.status, 'system');
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_events (order_id, event_type, previous_status, new_status, triggered_by)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, 'system');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_log ON public.orders;
CREATE TRIGGER trg_order_status_log
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();