
ALTER TABLE public.tryon_generations ADD COLUMN IF NOT EXISTS stylist_session_id uuid;
ALTER TABLE public.tryon_events ADD COLUMN IF NOT EXISTS stylist_session_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stylist_session_id uuid;

CREATE INDEX IF NOT EXISTS idx_tryon_generations_stylist_session ON public.tryon_generations(stylist_session_id) WHERE stylist_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tryon_events_stylist_session ON public.tryon_events(stylist_session_id) WHERE stylist_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_stylist_session ON public.orders(stylist_session_id) WHERE stylist_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.mark_stylist_session_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stylist_session_id IS NOT NULL THEN
    UPDATE public.ai_stylist_sessions
       SET purchased = true
     WHERE id = NEW.stylist_session_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_mark_stylist_purchased ON public.orders;
CREATE TRIGGER trg_orders_mark_stylist_purchased
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.mark_stylist_session_purchased();
