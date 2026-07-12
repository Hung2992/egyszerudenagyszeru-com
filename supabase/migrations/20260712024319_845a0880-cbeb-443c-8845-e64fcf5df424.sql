
ALTER TABLE public.ai_pricing_rules
  ADD COLUMN IF NOT EXISTS max_offers_per_product_per_day integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_attempts_per_hour integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_rejected_per_hour integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS coupon_conflict_policy text NOT NULL DEFAULT 'ask'
    CHECK (coupon_conflict_policy IN ('override','block','ask'));
