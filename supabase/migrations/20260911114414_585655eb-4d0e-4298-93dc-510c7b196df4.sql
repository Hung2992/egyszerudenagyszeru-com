
CREATE UNIQUE INDEX IF NOT EXISTS partners_user_id_unique ON public.partners(user_id) WHERE user_id IS NOT NULL;

CREATE POLICY "Users can apply as partner"
ON public.partners
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
  AND is_active = false
  AND coalesce(default_commission_percent, 0) = 0
  AND coalesce(commission_per_order_amount, 0) = 0
  AND coupon_id IS NULL
);

CREATE OR REPLACE FUNCTION public.prevent_partner_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND OLD.user_id = auth.uid() THEN
    NEW.status := OLD.status;
    NEW.is_active := OLD.is_active;
    NEW.default_commission_percent := OLD.default_commission_percent;
    NEW.commission_per_order_amount := OLD.commission_per_order_amount;
    NEW.coupon_id := OLD.coupon_id;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_partner_self_escalation ON public.partners;
CREATE TRIGGER trg_prevent_partner_self_escalation
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.prevent_partner_self_escalation();
