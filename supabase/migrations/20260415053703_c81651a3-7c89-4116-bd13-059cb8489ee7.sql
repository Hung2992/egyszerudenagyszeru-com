CREATE TABLE public.return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  request_type TEXT NOT NULL DEFAULT 'return' CHECK (request_type IN ('return', 'exchange')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  exchange_product_id UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_return_requests_user_id ON public.return_requests(user_id);
CREATE INDEX idx_return_requests_order_id ON public.return_requests(order_id);
CREATE INDEX idx_return_requests_status ON public.return_requests(status);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own return requests"
ON public.return_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create return requests for own orders"
ON public.return_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage return requests"
ON public.return_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));