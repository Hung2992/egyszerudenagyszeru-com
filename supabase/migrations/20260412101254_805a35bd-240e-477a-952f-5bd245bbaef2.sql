
-- 1. Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- 2. Trigger: when procurement order status changes to 'received', auto-update shop_products stock
CREATE OR REPLACE FUNCTION public.procurement_auto_stock_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes to 'received' and there's a linked product
  IF NEW.order_status = 'received' 
     AND (OLD.order_status IS DISTINCT FROM 'received')
     AND NEW.linked_product_id IS NOT NULL THEN
    UPDATE public.shop_products
    SET stock = stock + NEW.quantity
    WHERE id = NEW.linked_product_id::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_procurement_stock_update
BEFORE UPDATE ON public.admin_procurement_orders
FOR EACH ROW
EXECUTE FUNCTION public.procurement_auto_stock_update();
