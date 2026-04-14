-- Add procurement tracking columns to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS procurement_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS procurement_order_id uuid REFERENCES public.admin_procurement_orders(id),
ADD COLUMN IF NOT EXISTS estimated_delivery date;

-- Add order linking and profit columns to procurement
ALTER TABLE public.admin_procurement_orders
ADD COLUMN IF NOT EXISTS linked_order_id uuid REFERENCES public.orders(id),
ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_amount numeric GENERATED ALWAYS AS (selling_price - (unit_cost * quantity)) STORED;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_procurement_order_id ON public.orders(procurement_order_id);
CREATE INDEX IF NOT EXISTS idx_procurement_linked_order_id ON public.admin_procurement_orders(linked_order_id);