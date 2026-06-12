-- Partners can read their own row (this was missing — the partner menu never appeared)
CREATE POLICY "Partner reads own row"
ON public.partners
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Partners can update their own row (billing/contact fields); protected columns locked by trigger below
CREATE POLICY "Partner updates own row"
ON public.partners
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Prevent non-admin users from changing business-critical columns
CREATE OR REPLACE FUNCTION public.protect_partner_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.user_id := OLD.user_id;
    NEW.status := OLD.status;
    NEW.is_active := OLD.is_active;
    NEW.commission_per_order_amount := OLD.commission_per_order_amount;
    NEW.default_commission_percent := OLD.default_commission_percent;
    NEW.coupon_id := OLD.coupon_id;
    NEW.partner_type := OLD.partner_type;
    NEW.valid_from := OLD.valid_from;
    NEW.valid_until := OLD.valid_until;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_partner_columns ON public.partners;
CREATE TRIGGER trg_protect_partner_columns
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_columns();

-- Partners can read their own assigned coupon (needed for the coupon code in menus/portal)
CREATE POLICY "Partner reads own coupon"
ON public.coupons
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.partners p
  WHERE p.coupon_id = coupons.id AND p.user_id = auth.uid()
));