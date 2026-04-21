-- Extend shop_products with launch fields
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS launch_status text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS launch_date timestamptz,
  ADD COLUMN IF NOT EXISTS teaser_image_url text,
  ADD COLUMN IF NOT EXISTS teaser_description text,
  ADD COLUMN IF NOT EXISTS preorder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_deposit_percent integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS preorder_limit integer,
  ADD COLUMN IF NOT EXISTS preorder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlist_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_sneak_peek boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poll_votes integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_shop_products_launch_status ON public.shop_products(launch_status);
CREATE INDEX IF NOT EXISTS idx_shop_products_launch_date ON public.shop_products(launch_date);

-- Pre-orders
CREATE TABLE IF NOT EXISTS public.product_preorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  user_id uuid,
  customer_email text NOT NULL,
  customer_name text,
  customer_phone text,
  quantity integer NOT NULL DEFAULT 1,
  deposit_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending, paid, fulfilled, cancelled
  payment_intent_id text,
  notified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_preorders_product ON public.product_preorders(product_id);
CREATE INDEX IF NOT EXISTS idx_preorders_email ON public.product_preorders(lower(customer_email));

ALTER TABLE public.product_preorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage preorders" ON public.product_preorders
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Anyone can preorder" ON public.product_preorders
  FOR INSERT TO anon, authenticated WITH CHECK (customer_email IS NOT NULL AND customer_email <> '');
CREATE POLICY "Users see own preorders" ON public.product_preorders
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR lower(btrim(customer_email)) = authenticated_email());

-- Waitlist
CREATE TABLE IF NOT EXISTS public.product_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL,
  name text,
  position integer,
  early_access boolean NOT NULL DEFAULT false,
  early_access_code text,
  notified_at timestamptz,
  converted_at timestamptz,
  source text DEFAULT 'website',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, email)
);
CREATE INDEX IF NOT EXISTS idx_waitlist_product ON public.product_waitlist(product_id);

ALTER TABLE public.product_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage waitlist" ON public.product_waitlist
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Anyone can join waitlist" ON public.product_waitlist
  FOR INSERT TO anon, authenticated WITH CHECK (email IS NOT NULL AND email <> '');
CREATE POLICY "Users see own waitlist" ON public.product_waitlist
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR lower(btrim(email)) = authenticated_email());

-- Sneak peek polls (one vote per email per product)
CREATE TABLE IF NOT EXISTS public.product_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  voter_email text NOT NULL,
  voter_id uuid,
  vote_weight integer NOT NULL DEFAULT 1,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, voter_email)
);
CREATE INDEX IF NOT EXISTS idx_polls_product ON public.product_polls(product_id);

ALTER TABLE public.product_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage polls" ON public.product_polls
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Anyone can vote" ON public.product_polls
  FOR INSERT TO anon, authenticated WITH CHECK (voter_email IS NOT NULL AND voter_email <> '');
CREATE POLICY "Anyone can read poll counts" ON public.product_polls
  FOR SELECT TO anon, authenticated USING (true);

-- Auto-update counters on shop_products
CREATE OR REPLACE FUNCTION public.update_launch_counters()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'product_preorders' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE shop_products SET preorder_count = preorder_count + NEW.quantity WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE shop_products SET preorder_count = GREATEST(0, preorder_count - OLD.quantity) WHERE id = OLD.product_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'product_waitlist' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE shop_products SET waitlist_count = waitlist_count + 1 WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE shop_products SET waitlist_count = GREATEST(0, waitlist_count - 1) WHERE id = OLD.product_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'product_polls' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE shop_products SET poll_votes = poll_votes + COALESCE(NEW.vote_weight, 1) WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE shop_products SET poll_votes = GREATEST(0, poll_votes - COALESCE(OLD.vote_weight, 1)) WHERE id = OLD.product_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_preorder_counter ON public.product_preorders;
CREATE TRIGGER trg_preorder_counter AFTER INSERT OR DELETE ON public.product_preorders
  FOR EACH ROW EXECUTE FUNCTION public.update_launch_counters();

DROP TRIGGER IF EXISTS trg_waitlist_counter ON public.product_waitlist;
CREATE TRIGGER trg_waitlist_counter AFTER INSERT OR DELETE ON public.product_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_launch_counters();

DROP TRIGGER IF EXISTS trg_polls_counter ON public.product_polls;
CREATE TRIGGER trg_polls_counter AFTER INSERT OR DELETE ON public.product_polls
  FOR EACH ROW EXECUTE FUNCTION public.update_launch_counters();

-- Auto-assign waitlist position
CREATE OR REPLACE FUNCTION public.assign_waitlist_position()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.position IS NULL THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
      FROM product_waitlist WHERE product_id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_position ON public.product_waitlist;
CREATE TRIGGER trg_waitlist_position BEFORE INSERT ON public.product_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.assign_waitlist_position();