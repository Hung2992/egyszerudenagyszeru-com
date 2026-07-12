
-- Add SEO/AI Studio content fields to shop_products
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS bullet_points jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_posts jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_hero_image_url text,
  ADD COLUMN IF NOT EXISTS ai_content_meta jsonb DEFAULT '{}'::jsonb;

-- Audit log for AI product content generation
CREATE TABLE IF NOT EXISTS public.ai_product_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.shop_products(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  kind text NOT NULL,             -- 'text' | 'image'
  model text,
  prompt text,
  input jsonb DEFAULT '{}'::jsonb,
  output jsonb DEFAULT '{}'::jsonb,
  image_url text,
  applied boolean NOT NULL DEFAULT false,
  applied_fields text[] DEFAULT '{}',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ai_product_generations TO authenticated;
GRANT ALL ON public.ai_product_generations TO service_role;

ALTER TABLE public.ai_product_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI product generations"
  ON public.ai_product_generations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert AI product generations"
  ON public.ai_product_generations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid());

CREATE POLICY "Admins can update AI product generations"
  ON public.ai_product_generations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS ai_product_generations_product_idx
  ON public.ai_product_generations(product_id, created_at DESC);
