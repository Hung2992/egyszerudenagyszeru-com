
-- SEO extensions
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS seo_og_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seo_canonical_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seo_robots text DEFAULT 'index, follow',
  ADD COLUMN IF NOT EXISTS seo_google_analytics_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seo_search_console_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seo_structured_data_enabled boolean NOT NULL DEFAULT false;

-- Appearance extensions
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS theme_bg_color text DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS theme_button_radius text DEFAULT '0px',
  ADD COLUMN IF NOT EXISTS theme_logo_position text DEFAULT 'left',
  ADD COLUMN IF NOT EXISTS theme_favicon_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS theme_header_height text DEFAULT '64px',
  ADD COLUMN IF NOT EXISTS theme_footer_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS theme_custom_css text DEFAULT NULL;

-- Email template extensions
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS email_welcome_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_welcome_subject text DEFAULT 'Üdvözlünk a boltunkban!',
  ADD COLUMN IF NOT EXISTS email_welcome_body text DEFAULT 'Köszönjük, hogy regisztráltál! Fedezd fel legújabb kollekcióinkat.',
  ADD COLUMN IF NOT EXISTS email_abandoned_cart_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_abandoned_cart_delay_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS email_review_request_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_review_request_delay_days integer NOT NULL DEFAULT 7;

-- Social media extensions
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS social_youtube text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_twitter text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_pinterest text DEFAULT NULL;
