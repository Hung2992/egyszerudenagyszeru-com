
-- Checkout customization
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS checkout_require_phone boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_require_city boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_require_zip boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_enable_notes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_enable_gift_wrap boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkout_gift_wrap_price numeric NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS checkout_min_order_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_success_message text DEFAULT 'Köszönjük a rendelést! Hamarosan felvesszük Önnel a kapcsolatot.';

-- Cookie/GDPR banner
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS cookie_banner_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cookie_banner_text text DEFAULT 'Ez a weboldal sütiket használ a jobb felhasználói élmény érdekében.',
  ADD COLUMN IF NOT EXISTS cookie_banner_button_text text DEFAULT 'Elfogadom',
  ADD COLUMN IF NOT EXISTS cookie_banner_position text DEFAULT 'bottom';

-- Maintenance mode
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS maintenance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message text DEFAULT 'A webshop jelenleg karbantartás alatt áll. Kérjük, látogass vissza később!',
  ADD COLUMN IF NOT EXISTS maintenance_password text DEFAULT NULL;

-- Popup settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS popup_newsletter_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_newsletter_title text DEFAULT 'Iratkozz fel hírlevelünkre!',
  ADD COLUMN IF NOT EXISTS popup_newsletter_text text DEFAULT 'Kapj 10% kedvezményt első rendelésedből!',
  ADD COLUMN IF NOT EXISTS popup_newsletter_delay_seconds integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS popup_exit_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_exit_title text DEFAULT 'Biztosan elmész?',
  ADD COLUMN IF NOT EXISTS popup_exit_text text DEFAULT 'Ne maradj le az aktuális ajánlatainkról!',
  ADD COLUMN IF NOT EXISTS popup_promo_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_promo_title text DEFAULT 'Akciós ajánlat!',
  ADD COLUMN IF NOT EXISTS popup_promo_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS popup_promo_image_url text DEFAULT NULL;
