
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS coupon_type text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS single_use boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_name text,
  ADD COLUMN IF NOT EXISTS partner_email text,
  ADD COLUMN IF NOT EXISTS partner_commission_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_type_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_type_check CHECK (coupon_type IN ('normal','single_use','partner'));

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid,
  order_id uuid,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage redemptions" ON public.coupon_redemptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own redemptions" ON public.coupon_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);
