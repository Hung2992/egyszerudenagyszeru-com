
-- Delivery time preferences
CREATE TABLE IF NOT EXISTS public.delivery_time_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preferred_slot TEXT NOT NULL DEFAULT 'anytime',
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.delivery_time_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_time_preferences' AND policyname = 'Users manage own delivery prefs') THEN
    CREATE POLICY "Users manage own delivery prefs" ON public.delivery_time_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Shopping lists
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopping_lists' AND policyname = 'Users manage own shopping lists') THEN
    CREATE POLICY "Users manage own shopping lists" ON public.shopping_lists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopping_lists' AND policyname = 'Public lists viewable') THEN
    CREATE POLICY "Public lists viewable" ON public.shopping_lists FOR SELECT USING (is_public = true);
  END IF;
END $$;

-- Shopping list items
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  product_id UUID,
  notes TEXT,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopping_list_items' AND policyname = 'Users manage own list items') THEN
    CREATE POLICY "Users manage own list items" ON public.shopping_list_items FOR ALL USING (
      EXISTS (SELECT 1 FROM public.shopping_lists sl WHERE sl.id = list_id AND sl.user_id = auth.uid())
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.shopping_lists sl WHERE sl.id = list_id AND sl.user_id = auth.uid())
    );
  END IF;
END $$;

-- Return preferences
CREATE TABLE IF NOT EXISTS public.return_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preferred_method TEXT NOT NULL DEFAULT 'courier',
  default_reason TEXT,
  auto_label BOOLEAN NOT NULL DEFAULT false,
  pickup_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.return_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'return_preferences' AND policyname = 'Users manage own return prefs') THEN
    CREATE POLICY "Users manage own return prefs" ON public.return_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
