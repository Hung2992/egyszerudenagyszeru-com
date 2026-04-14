
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS seo_title text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seo_description text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seo_keywords text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS theme_primary_color text DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS theme_accent_color text DEFAULT '#D4AF37',
  ADD COLUMN IF NOT EXISTS theme_font_heading text DEFAULT 'Space Grotesk',
  ADD COLUMN IF NOT EXISTS theme_font_body text DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{"monday":{"open":"09:00","close":"17:00","closed":false},"tuesday":{"open":"09:00","close":"17:00","closed":false},"wednesday":{"open":"09:00","close":"17:00","closed":false},"thursday":{"open":"09:00","close":"17:00","closed":false},"friday":{"open":"09:00","close":"17:00","closed":false},"saturday":{"open":"10:00","close":"14:00","closed":false},"sunday":{"open":"","close":"","closed":true}}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_reply_message text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS privacy_policy text DEFAULT NULL;
