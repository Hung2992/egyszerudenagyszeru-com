
CREATE TABLE public.refund_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL DEFAULT 'status_change',
  amount NUMERIC DEFAULT 0,
  method TEXT,
  transaction_id TEXT,
  card_last4 TEXT,
  notes TEXT,
  previous_status TEXT,
  new_status TEXT,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.refund_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage refund history"
ON public.refund_history
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_refund_history_request ON public.refund_history(return_request_id);
CREATE INDEX idx_refund_history_created ON public.refund_history(created_at DESC);
