ALTER TABLE public.partner_storefronts
  ADD COLUMN IF NOT EXISTS section_order jsonb,
  ADD COLUMN IF NOT EXISTS brand_dna jsonb,
  ADD COLUMN IF NOT EXISTS last_quality_report jsonb,
  ADD COLUMN IF NOT EXISTS studio_state text;