
CREATE TABLE public.stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID NOT NULL,
  email TEXT NOT NULL,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own stock notifications" ON public.stock_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own stock notifications" ON public.stock_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own stock notifications" ON public.stock_notifications FOR DELETE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_stock_notifications_unique ON public.stock_notifications (user_id, product_id) WHERE notified = false;
