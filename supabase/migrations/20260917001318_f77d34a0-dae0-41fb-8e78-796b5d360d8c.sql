ALTER TABLE public.partner_orders
  ADD COLUMN IF NOT EXISTS campaign_plan_id uuid REFERENCES public.partner_campaign_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_counted_at timestamptz;

CREATE OR REPLACE FUNCTION public.count_order_conversion(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o public.partner_orders%ROWTYPE;
  plan_id uuid;
  allowed boolean;
BEGIN
  SELECT * INTO o FROM public.partner_orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT (public.has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = o.partner_id AND p.user_id = auth.uid()))
    INTO allowed;
  IF NOT allowed THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;

  IF o.payment_status IS DISTINCT FROM 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_paid');
  END IF;
  IF o.campaign_counted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_counted', 'plan_id', o.campaign_plan_id);
  END IF;

  plan_id := o.campaign_plan_id;
  IF plan_id IS NULL THEN
    SELECT s.active_campaign_plan_id INTO plan_id
    FROM public.partner_storefronts s
    WHERE s.partner_id = o.partner_id
    LIMIT 1;
  END IF;

  IF plan_id IS NULL THEN
    UPDATE public.partner_orders SET campaign_counted_at = now() WHERE id = _order_id;
    RETURN jsonb_build_object('ok', true, 'reason', 'no_campaign');
  END IF;

  UPDATE public.partner_campaign_plans
     SET order_count = order_count + 1,
         revenue_huf = revenue_huf + greatest(coalesce(o.total_huf, 0), 0)
   WHERE id = plan_id AND status = 'published';

  UPDATE public.partner_orders
     SET campaign_plan_id = plan_id,
         campaign_counted_at = now()
   WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'reason', 'counted', 'plan_id', plan_id);
END;
$$;

REVOKE ALL ON FUNCTION public.count_order_conversion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_order_conversion(uuid) TO authenticated;