CREATE OR REPLACE FUNCTION public.enforce_product_status_admin_for_active()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_owner boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = NEW.partner_id AND p.user_id = auth.uid()
  ) INTO _is_owner;

  IF NEW.status = 'rejected'
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reject products';
  END IF;

  IF NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT _is_owner THEN
    RAISE EXCEPTION 'Only the owning partner or an admin can activate products';
  END IF;

  IF NEW.status = 'pending_review' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending_review') THEN
    NEW.submitted_at := now();
  END IF;
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END $$;