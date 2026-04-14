
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tracking_number TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'return_requests' AND policyname = 'Users see own returns') THEN
    CREATE POLICY "Users see own returns" ON public.return_requests FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'return_requests' AND policyname = 'Users create returns') THEN
    CREATE POLICY "Users create returns" ON public.return_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.product_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  name TEXT DEFAULT 'Összehasonlítás',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.product_comparisons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_comparisons' AND policyname = 'Users manage own comparisons') THEN
    CREATE POLICY "Users manage own comparisons" ON public.product_comparisons FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_comparisons' AND policyname = 'Users create comparisons') THEN
    CREATE POLICY "Users create comparisons" ON public.product_comparisons FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_comparisons' AND policyname = 'Users update comparisons') THEN
    CREATE POLICY "Users update comparisons" ON public.product_comparisons FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_comparisons' AND policyname = 'Users delete comparisons') THEN
    CREATE POLICY "Users delete comparisons" ON public.product_comparisons FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
