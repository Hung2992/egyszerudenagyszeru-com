
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images are publicly viewable"
ON public.product_images FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage product images"
ON public.product_images FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images"
ON public.product_images FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images"
ON public.product_images FOR DELETE
USING (auth.role() = 'authenticated');

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
