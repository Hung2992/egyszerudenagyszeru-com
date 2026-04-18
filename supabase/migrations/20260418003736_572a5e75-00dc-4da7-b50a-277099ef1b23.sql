-- Add new columns to store_settings for auto procurement
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS auto_procurement_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_procurement_threshold integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_procurement_use_velocity boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_procurement_velocity_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS auto_procurement_min_qty integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_procurement_max_qty integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS auto_procurement_default_supplier text DEFAULT 'AliExpress',
  ADD COLUMN IF NOT EXISTS auto_procurement_default_supplier_url text,
  ADD COLUMN IF NOT EXISTS auto_procurement_notify_email text,
  ADD COLUMN IF NOT EXISTS auto_procurement_notify_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS procurement_address_country text DEFAULT 'Magyarország',
  ADD COLUMN IF NOT EXISTS procurement_address_zip text DEFAULT '8125',
  ADD COLUMN IF NOT EXISTS procurement_address_city text DEFAULT 'Sárkeresztúr',
  ADD COLUMN IF NOT EXISTS procurement_address_street text DEFAULT 'Fő út 35',
  ADD COLUMN IF NOT EXISTS procurement_address_name text,
  ADD COLUMN IF NOT EXISTS procurement_address_phone text;

-- Create log table for auto procurement events
CREATE TABLE IF NOT EXISTS public.auto_procurement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.shop_products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  trigger_stock integer NOT NULL,
  threshold integer NOT NULL,
  ordered_quantity integer NOT NULL,
  velocity_per_day numeric,
  procurement_order_id uuid REFERENCES public.admin_procurement_orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'created',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_procurement_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage auto procurement log" ON public.auto_procurement_log;
CREATE POLICY "Admins can manage auto procurement log"
  ON public.auto_procurement_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_auto_proc_log_product ON public.auto_procurement_log(product_id);
CREATE INDEX IF NOT EXISTS idx_auto_proc_log_created ON public.auto_procurement_log(created_at DESC);

-- Function: calculate velocity-based reorder qty for a product
CREATE OR REPLACE FUNCTION public.calc_reorder_quantity(_product_id uuid, _product_name text)
RETURNS TABLE(qty integer, velocity numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  total_sold integer := 0;
  days_window integer;
  v numeric := 0;
  computed integer;
BEGIN
  SELECT auto_procurement_velocity_days, auto_procurement_min_qty, auto_procurement_max_qty,
         auto_procurement_use_velocity
  INTO s FROM public.store_settings LIMIT 1;

  days_window := COALESCE(s.auto_procurement_velocity_days, 30);

  -- Sum quantities from orders.items jsonb where product matches (by id or name)
  SELECT COALESCE(SUM((item->>'quantity')::int), 0)
  INTO total_sold
  FROM public.orders o,
       jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) item
  WHERE o.created_at >= now() - (days_window || ' days')::interval
    AND o.status NOT IN ('cancelled', 'refunded')
    AND (
      (item->>'productId') = _product_id::text
      OR (item->>'product_id') = _product_id::text
      OR (item->>'name') = _product_name
    );

  v := total_sold::numeric / GREATEST(days_window, 1);

  IF COALESCE(s.auto_procurement_use_velocity, true) THEN
    -- Order ~ 14 days of stock based on velocity, min 1
    computed := GREATEST(CEIL(v * 14)::int, COALESCE(s.auto_procurement_min_qty, 1));
  ELSE
    computed := COALESCE(s.auto_procurement_min_qty, 1);
  END IF;

  computed := LEAST(computed, COALESCE(s.auto_procurement_max_qty, 100));

  qty := computed;
  velocity := v;
  RETURN NEXT;
END;
$$;

-- Trigger function: auto create procurement order when stock drops to/below threshold
CREATE OR REPLACE FUNCTION public.auto_procurement_on_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  reorder RECORD;
  existing_count integer;
  new_proc_id uuid;
BEGIN
  -- Only react when stock decreases or is at/below threshold
  IF NEW.stock = OLD.stock THEN
    RETURN NEW;
  END IF;

  SELECT * INTO s FROM public.store_settings LIMIT 1;

  IF NOT COALESCE(s.auto_procurement_enabled, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.stock > COALESCE(s.auto_procurement_threshold, 1) THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates: skip if there is already a pending/draft procurement order for this product
  SELECT COUNT(*) INTO existing_count
  FROM public.admin_procurement_orders
  WHERE linked_product_id = NEW.id
    AND order_status IN ('draft', 'pending', 'ordered', 'shipped');

  IF existing_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Compute reorder qty
  SELECT * INTO reorder FROM public.calc_reorder_quantity(NEW.id, NEW.name);

  -- Create procurement order
  INSERT INTO public.admin_procurement_orders (
    product_name, product_sku, supplier_name, supplier_url, quantity,
    unit_cost, selling_price, currency, payment_method, order_status,
    payment_status, priority, category, linked_product_id, notes
  ) VALUES (
    NEW.name,
    NULL,
    COALESCE(s.auto_procurement_default_supplier, 'AliExpress'),
    s.auto_procurement_default_supplier_url,
    GREATEST(reorder.qty, 1),
    0,
    NEW.price,
    COALESCE(s.currency, 'HUF'),
    'bank_card',
    'draft',
    'pending',
    'high',
    NEW.category,
    NEW.id,
    format('AUTO: készlet=%s, küszöb=%s, eladási sebesség=%s/nap, szállítási cím: %s %s, %s, %s',
      NEW.stock,
      COALESCE(s.auto_procurement_threshold, 1),
      ROUND(reorder.velocity, 2),
      COALESCE(s.procurement_address_zip, ''),
      COALESCE(s.procurement_address_city, ''),
      COALESCE(s.procurement_address_street, ''),
      COALESCE(s.procurement_address_country, ''))
  ) RETURNING id INTO new_proc_id;

  -- Log event
  INSERT INTO public.auto_procurement_log (
    product_id, product_name, trigger_stock, threshold,
    ordered_quantity, velocity_per_day, procurement_order_id, status
  ) VALUES (
    NEW.id, NEW.name, NEW.stock,
    COALESCE(s.auto_procurement_threshold, 1),
    GREATEST(reorder.qty, 1), reorder.velocity, new_proc_id, 'created'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_procurement_on_stock_change ON public.shop_products;
CREATE TRIGGER trg_auto_procurement_on_stock_change
AFTER UPDATE OF stock ON public.shop_products
FOR EACH ROW
EXECUTE FUNCTION public.auto_procurement_on_stock_change();

-- Also fire on insert if a product is added with stock at/below threshold
CREATE OR REPLACE FUNCTION public.auto_procurement_on_product_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  reorder RECORD;
  new_proc_id uuid;
BEGIN
  SELECT * INTO s FROM public.store_settings LIMIT 1;

  IF NOT COALESCE(s.auto_procurement_enabled, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.stock > COALESCE(s.auto_procurement_threshold, 1) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO reorder FROM public.calc_reorder_quantity(NEW.id, NEW.name);

  INSERT INTO public.admin_procurement_orders (
    product_name, supplier_name, supplier_url, quantity,
    unit_cost, selling_price, currency, payment_method, order_status,
    payment_status, priority, category, linked_product_id, notes
  ) VALUES (
    NEW.name,
    COALESCE(s.auto_procurement_default_supplier, 'AliExpress'),
    s.auto_procurement_default_supplier_url,
    GREATEST(reorder.qty, 1),
    0, NEW.price,
    COALESCE(s.currency, 'HUF'),
    'bank_card', 'draft', 'pending', 'high',
    NEW.category, NEW.id,
    format('AUTO (új termék): kezdő készlet=%s, szállítási cím: %s %s, %s, %s',
      NEW.stock,
      COALESCE(s.procurement_address_zip, ''),
      COALESCE(s.procurement_address_city, ''),
      COALESCE(s.procurement_address_street, ''),
      COALESCE(s.procurement_address_country, ''))
  ) RETURNING id INTO new_proc_id;

  INSERT INTO public.auto_procurement_log (
    product_id, product_name, trigger_stock, threshold,
    ordered_quantity, velocity_per_day, procurement_order_id, status
  ) VALUES (
    NEW.id, NEW.name, NEW.stock,
    COALESCE(s.auto_procurement_threshold, 1),
    GREATEST(reorder.qty, 1), reorder.velocity, new_proc_id, 'created'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_procurement_on_product_insert ON public.shop_products;
CREATE TRIGGER trg_auto_procurement_on_product_insert
AFTER INSERT ON public.shop_products
FOR EACH ROW
EXECUTE FUNCTION public.auto_procurement_on_product_insert();

-- Set defaults on existing settings row
UPDATE public.store_settings
SET
  procurement_address_country = COALESCE(procurement_address_country, 'Magyarország'),
  procurement_address_zip = COALESCE(procurement_address_zip, '8125'),
  procurement_address_city = COALESCE(procurement_address_city, 'Sárkeresztúr'),
  procurement_address_street = COALESCE(procurement_address_street, 'Fő út 35'),
  auto_procurement_threshold = COALESCE(auto_procurement_threshold, 1),
  auto_procurement_min_qty = COALESCE(auto_procurement_min_qty, 1),
  auto_procurement_max_qty = COALESCE(auto_procurement_max_qty, 100),
  auto_procurement_velocity_days = COALESCE(auto_procurement_velocity_days, 30),
  auto_procurement_use_velocity = COALESCE(auto_procurement_use_velocity, true),
  auto_procurement_default_supplier = COALESCE(auto_procurement_default_supplier, 'AliExpress'),
  auto_procurement_notify_enabled = COALESCE(auto_procurement_notify_enabled, true);