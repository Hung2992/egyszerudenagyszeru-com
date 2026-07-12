
CREATE OR REPLACE FUNCTION public.enforce_drop_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allowed transitions
  ok := CASE OLD.status::text
    WHEN 'draft'     THEN NEW.status::text IN ('scheduled','open')
    WHEN 'scheduled' THEN NEW.status::text IN ('open','draft','closed')
    WHEN 'open'      THEN NEW.status::text IN ('closed','sold_out')
    WHEN 'closed'    THEN NEW.status::text IN ('drawn','sold_out','open')
    WHEN 'drawn'     THEN NEW.status::text IN ('sold_out','closed')
    WHEN 'sold_out'  THEN false
    ELSE false
  END;

  -- Allow service_role (edge functions / admin bypass) to force any transition
  IF NOT ok AND current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    ok := true;
  END IF;

  IF NOT ok THEN
    RAISE EXCEPTION 'Invalid drop status transition: % -> % (drop_id=%)',
      OLD.status, NEW.status, NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_drop_status_transition_trg ON public.product_drops;
CREATE TRIGGER enforce_drop_status_transition_trg
BEFORE UPDATE OF status ON public.product_drops
FOR EACH ROW
EXECUTE FUNCTION public.enforce_drop_status_transition();
