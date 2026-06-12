
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','paused','revoked')),
  ADD COLUMN IF NOT EXISTS commission_per_order_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partners_user_id_unique ON public.partners(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pending_partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  partner_type text NOT NULL DEFAULT 'person',
  full_name text NOT NULL,
  company_name text,
  commission_per_order_amount numeric NOT NULL DEFAULT 0,
  customer_discount_percent numeric,
  customer_discount_amount numeric,
  coupon_code text NOT NULL,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pending_partner_invites_email_idx ON public.pending_partner_invites(lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_partner_invites TO authenticated;
GRANT ALL ON public.pending_partner_invites TO service_role;
ALTER TABLE public.pending_partner_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner invites" ON public.pending_partner_invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  coupon_code text NOT NULL,
  order_total numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  confirmed_at timestamptz,
  payout_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, partner_id)
);
CREATE INDEX IF NOT EXISTS partner_referrals_partner_idx ON public.partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS partner_referrals_status_idx ON public.partner_referrals(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_referrals TO authenticated;
GRANT ALL ON public.partner_referrals TO service_role;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner sees own referrals" ON public.partner_referrals
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_referrals.partner_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Admins manage referrals" ON public.partner_referrals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER partner_referrals_updated_at BEFORE UPDATE ON public.partner_referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','paid','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  paid_at timestamptz,
  rejected_at timestamptz,
  payment_reference text,
  admin_notes text,
  partner_notes text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_payouts_partner_idx ON public.partner_payouts(partner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_payouts TO authenticated;
GRANT ALL ON public.partner_payouts TO service_role;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner sees own payouts" ON public.partner_payouts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_payouts.partner_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Partner requests payout" ON public.partner_payouts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_payouts.partner_id AND p.user_id = auth.uid() AND p.status = 'active')
    AND status = 'requested'
  );
CREATE POLICY "Admins manage payouts" ON public.partner_payouts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER partner_payouts_updated_at BEFORE UPDATE ON public.partner_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.partner_marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  asset_type text NOT NULL DEFAULT 'banner' CHECK (asset_type IN ('banner','logo','photo','video','link_template','caption_template')),
  asset_url text,
  text_content text,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_marketing_assets TO authenticated;
GRANT ALL ON public.partner_marketing_assets TO service_role;
ALTER TABLE public.partner_marketing_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active partners read marketing" ON public.partner_marketing_assets
  FOR SELECT TO authenticated
  USING (
    active = true AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.partners p WHERE p.user_id = auth.uid() AND p.status = 'active')
    )
  );
CREATE POLICY "Admins manage marketing" ON public.partner_marketing_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER partner_marketing_assets_updated_at BEFORE UPDATE ON public.partner_marketing_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.track_partner_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_commission numeric;
  v_new_status text;
BEGIN
  IF NEW.coupon_code IS NULL OR length(btrim(NEW.coupon_code)) = 0 THEN
    IF TG_OP = 'UPDATE' AND NEW.status IN ('cancelled','refunded') THEN
      UPDATE public.partner_referrals SET status = 'cancelled' WHERE order_id = NEW.id AND status <> 'cancelled';
    END IF;
    RETURN NEW;
  END IF;

  SELECT p.id, p.commission_per_order_amount
    INTO v_partner_id, v_commission
  FROM public.partners p
  JOIN public.coupons c ON (c.id = p.coupon_id OR upper(c.code) = upper(NEW.coupon_code))
  WHERE upper(c.code) = upper(NEW.coupon_code)
    AND p.status = 'active'
  LIMIT 1;

  IF v_partner_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.status IN ('cancelled','refunded') THEN
    v_new_status := 'cancelled';
  ELSIF NEW.status IN ('paid','fulfilled','shipped','delivered','completed') THEN
    v_new_status := 'confirmed';
  ELSE
    v_new_status := 'pending';
  END IF;

  INSERT INTO public.partner_referrals (partner_id, order_id, coupon_code, order_total, commission_amount, status, confirmed_at)
  VALUES (v_partner_id, NEW.id, NEW.coupon_code, COALESCE(NEW.total_amount,0), COALESCE(v_commission,0), v_new_status,
          CASE WHEN v_new_status = 'confirmed' THEN now() ELSE NULL END)
  ON CONFLICT (order_id, partner_id) DO UPDATE
    SET status = EXCLUDED.status,
        order_total = EXCLUDED.order_total,
        commission_amount = EXCLUDED.commission_amount,
        confirmed_at = CASE WHEN EXCLUDED.status = 'confirmed' AND partner_referrals.confirmed_at IS NULL THEN now() ELSE partner_referrals.confirmed_at END,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_track_partner_referral ON public.orders;
CREATE TRIGGER orders_track_partner_referral
  AFTER INSERT OR UPDATE OF status, coupon_code, total_amount ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.track_partner_referral();

CREATE OR REPLACE FUNCTION public.get_partner_stats(_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean;
  v_pending numeric;
  v_confirmed numeric;
  v_paid numeric;
  v_total_orders integer;
BEGIN
  v_allowed := public.has_role(v_uid, 'admin'::app_role)
            OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = _partner_id AND p.user_id = v_uid);
  IF NOT v_allowed THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount END), 0),
    COALESCE(SUM(CASE WHEN status = 'confirmed' AND payout_id IS NULL THEN commission_amount END), 0),
    COUNT(*) FILTER (WHERE status IN ('pending','confirmed'))
  INTO v_pending, v_confirmed, v_total_orders
  FROM public.partner_referrals WHERE partner_id = _partner_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.partner_payouts WHERE partner_id = _partner_id AND status = 'paid';

  RETURN jsonb_build_object(
    'pending_commission', v_pending,
    'available_commission', v_confirmed,
    'paid_total', v_paid,
    'total_orders', v_total_orders
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_partner_payout(_partner_id uuid, _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_amount numeric;
  v_payout_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.partners p WHERE p.id = _partner_id AND p.user_id = v_uid AND p.status = 'active') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(SUM(commission_amount),0) INTO v_amount
  FROM public.partner_referrals
  WHERE partner_id = _partner_id AND status = 'confirmed' AND payout_id IS NULL;

  IF v_amount < 1000 THEN
    RAISE EXCEPTION 'min_payout_amount_not_reached';
  END IF;

  INSERT INTO public.partner_payouts (partner_id, amount, status, partner_notes)
  VALUES (_partner_id, v_amount, 'requested', _notes)
  RETURNING id INTO v_payout_id;

  UPDATE public.partner_referrals
  SET payout_id = v_payout_id, updated_at = now()
  WHERE partner_id = _partner_id AND status = 'confirmed' AND payout_id IS NULL;

  RETURN v_payout_id;
END;
$$;
