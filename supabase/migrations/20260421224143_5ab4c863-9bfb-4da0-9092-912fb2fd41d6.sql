
-- Table to manage which products are part of the giveaway prize pool
CREATE TABLE public.giveaway_prizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);

ALTER TABLE public.giveaway_prizes ENABLE ROW LEVEL SECURITY;

-- Anyone can view active prizes (so the public giveaway page can list them)
CREATE POLICY "Anyone can view active giveaway prizes"
ON public.giveaway_prizes
FOR SELECT
USING (is_active = true);

-- Admins manage everything
CREATE POLICY "Admins can manage giveaway prizes"
ON public.giveaway_prizes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
