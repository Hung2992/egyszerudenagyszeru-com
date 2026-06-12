-- Performance: lassú lekérdezések indexelése
-- 1) orders ORDER BY created_at DESC (admin listák, 506+381 hívás, max 527ms)
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON public.orders (created_at DESC);

-- 2) shop_products preorder szűrés + launch_date sorrend (2400 hívás)
CREATE INDEX IF NOT EXISTS idx_shop_products_preorder_launch
  ON public.shop_products (preorder_enabled, is_active, launch_date)
  WHERE preorder_enabled = true AND is_active = true;

-- 3) shop_products auto launch query (14793 hívás — gyakori)
CREATE INDEX IF NOT EXISTS idx_shop_products_auto_launch
  ON public.shop_products (auto_launch_enabled, early_access_enabled, launch_status, launch_date)
  WHERE auto_launch_enabled = true AND launch_date IS NOT NULL;