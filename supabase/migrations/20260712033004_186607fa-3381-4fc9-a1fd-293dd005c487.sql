-- Sprint B — AR/3D Product Experience
-- 3D asset tárolás termékhez
CREATE TABLE public.product_3d_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_source TEXT NOT NULL DEFAULT 'shop_products', -- 'shop_products' | 'partner_products' | 'launch_products'
  glb_url TEXT,
  usdz_url TEXT,
  poster_url TEXT,
  alt_text TEXT,
  ar_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_rotate BOOLEAN NOT NULL DEFAULT true,
  camera_orbit TEXT DEFAULT '0deg 75deg 2.5m',
  style_ai_prompt TEXT,
  file_size_bytes BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_3d_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_3d_assets TO authenticated;
GRANT ALL ON public.product_3d_assets TO service_role;

ALTER TABLE public.product_3d_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active 3D assets" ON public.product_3d_assets
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage 3D assets" ON public.product_3d_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_product_3d_assets_product ON public.product_3d_assets(product_id, product_source) WHERE is_active = true;

CREATE TRIGGER update_product_3d_assets_updated_at
  BEFORE UPDATE ON public.product_3d_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AR/3D használati analitika
CREATE TABLE public.ar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- '3d_view_open' | '3d_rotate' | 'ar_launch' | 'ar_placed' | 'style_recommend' | 'style_click'
  product_id UUID,
  asset_id UUID REFERENCES public.product_3d_assets(id) ON DELETE SET NULL,
  user_id UUID,
  session_id TEXT,
  device_type TEXT, -- 'ios' | 'android' | 'desktop'
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ar_events TO anon;
GRANT SELECT, INSERT ON public.ar_events TO authenticated;
GRANT ALL ON public.ar_events TO service_role;

ALTER TABLE public.ar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert AR events" ON public.ar_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins read AR events" ON public.ar_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ar_events_created ON public.ar_events(created_at DESC);
CREATE INDEX idx_ar_events_product ON public.ar_events(product_id, event_type, created_at DESC);