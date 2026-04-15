
-- Add missing columns to admin_procurement_orders
ALTER TABLE public.admin_procurement_orders
  ADD COLUMN IF NOT EXISTS supplier_url text,
  ADD COLUMN IF NOT EXISTS product_sku text,
  ADD COLUMN IF NOT EXISTS total_cost numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  ADD COLUMN IF NOT EXISTS order_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS expected_arrival date,
  ADD COLUMN IF NOT EXISTS actual_arrival date,
  ADD COLUMN IF NOT EXISTS linked_product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS margin_percent numeric,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- Add refund tracking columns to return_requests
ALTER TABLE public.return_requests
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS refund_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_transaction_id text,
  ADD COLUMN IF NOT EXISTS bank_card_last4 text,
  ADD COLUMN IF NOT EXISTS refund_notes text;

-- Create function to auto-update stock when procurement order is received
CREATE OR REPLACE FUNCTION public.procurement_auto_stock_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when order_status changes to 'received'
  IF NEW.order_status = 'received' AND (OLD.order_status IS NULL OR OLD.order_status <> 'received') THEN
    IF NEW.linked_product_id IS NOT NULL THEN
      UPDATE public.shop_products
      SET stock = stock + NEW.quantity
      WHERE id = NEW.linked_product_id;
    END IF;
    -- Set actual_arrival if not already set
    IF NEW.actual_arrival IS NULL THEN
      NEW.actual_arrival = CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto stock update
DROP TRIGGER IF EXISTS trg_procurement_auto_stock ON public.admin_procurement_orders;
CREATE TRIGGER trg_procurement_auto_stock
  BEFORE UPDATE ON public.admin_procurement_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.procurement_auto_stock_update();

-- Create function to auto-calculate margin_percent
CREATE OR REPLACE FUNCTION public.procurement_calc_margin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.selling_price > 0 AND NEW.unit_cost > 0 THEN
    NEW.margin_percent = ROUND(((NEW.selling_price - NEW.unit_cost) / NEW.selling_price) * 100, 2);
  ELSE
    NEW.margin_percent = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_procurement_calc_margin ON public.admin_procurement_orders;
CREATE TRIGGER trg_procurement_calc_margin
  BEFORE INSERT OR UPDATE ON public.admin_procurement_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.procurement_calc_margin();
