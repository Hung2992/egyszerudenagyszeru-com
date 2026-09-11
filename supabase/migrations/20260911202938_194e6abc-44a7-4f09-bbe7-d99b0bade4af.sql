CREATE TABLE public.storefront_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, partner_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.storefront_customers TO authenticated;
GRANT ALL ON public.storefront_customers TO service_role;

ALTER TABLE public.storefront_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own storefront profile"
ON public.storefront_customers
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners view their storefront customers"
ON public.storefront_customers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = storefront_customers.partner_id
      AND p.user_id = auth.uid()
  )
);

CREATE TRIGGER update_storefront_customers_updated_at
BEFORE UPDATE ON public.storefront_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();