
-- 1. Fix profiles: remove public read, add owner-only read
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Fix store_settings: restrict direct SELECT to admins, create public view
DROP POLICY IF EXISTS "Anyone can read settings" ON public.store_settings;
CREATE POLICY "Admins can read all settings"
  ON public.store_settings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public view excluding sensitive fields
CREATE OR REPLACE VIEW public.store_settings_public
WITH (security_invoker = on) AS
SELECT
  id, store_name, logo_url, currency, shipping_fee, free_shipping_above,
  contact_email, contact_phone, contact_address,
  payment_cash_enabled, payment_card_enabled, payment_cod_enabled,
  social_facebook, social_instagram, social_tiktok, social_youtube, social_twitter, social_pinterest,
  seo_title, seo_description, seo_keywords, seo_og_image_url, seo_canonical_url, seo_robots,
  seo_structured_data_enabled, seo_meta_title, seo_meta_description, seo_og_image, seo_sitemap_enabled,
  theme_primary_color, theme_accent_color, theme_font_heading, theme_font_body, theme_bg_color,
  theme_button_radius, theme_logo_position, theme_favicon_url, theme_header_height, theme_footer_text, theme_custom_css,
  reviews_enabled, reviews_require_approval,
  loyalty_enabled, loyalty_points_per_currency, loyalty_discount_per_points, loyalty_min_redeem,
  loyalty_redemption_rate, loyalty_levels, loyalty_expiry_months,
  shipping_methods, shipping_zones, shipping_free_limit, shipping_default_cost,
  checkout_require_phone, checkout_require_city, checkout_require_zip, checkout_enable_notes,
  checkout_enable_gift_wrap, checkout_gift_wrap_price, checkout_min_order_amount, checkout_success_message,
  cookie_banner_enabled, cookie_banner_text, cookie_banner_button_text, cookie_banner_position,
  appearance_product_card_style, appearance_header_style, appearance_footer_style,
  appearance_announcement_bar_enabled, appearance_announcement_bar_text, appearance_announcement_bar_bg_color,
  compare_enabled, compare_max_products, compare_show_differences_only,
  return_deadline_days, return_reasons, return_refund_method, return_policy,
  giftcard_enabled, giftcard_min_amount, giftcard_max_amount, giftcard_expiry_months, giftcard_custom_design,
  terms_and_conditions, privacy_policy, warranty_info, size_chart_template,
  product_default_view, product_grid_columns, product_items_per_page, product_default_sort, product_quick_view_enabled,
  product_show_stock_badge, product_show_discount_badge,
  product_filter_by_color, product_filter_by_size, product_filter_by_price, product_filter_by_material,
  product_tags,
  i18n_default_language, i18n_supported_languages, i18n_show_switcher,
  lang_default, lang_available, lang_auto_detect,
  discount_quantity_enabled, discount_quantity_rules, discount_auto_enabled, discount_auto_min_amount, discount_auto_value, discount_auto_type,
  coupon_auto_apply_enabled, coupon_stackable, coupon_first_order_discount, coupon_first_order_value,
  popup_newsletter_enabled, popup_newsletter_title, popup_newsletter_text, popup_newsletter_delay_seconds,
  popup_exit_enabled, popup_exit_title, popup_exit_text,
  popup_promo_enabled, popup_promo_title, popup_promo_text, popup_promo_image_url,
  maintenance_enabled, maintenance_message,
  email_order_confirmation, email_shipping_notification,
  low_stock_threshold, auto_hide_out_of_stock,
  sender_name, reply_to_email
FROM public.store_settings;

-- Allow anon+authenticated to read the public view
CREATE POLICY "Anyone can read public settings"
  ON public.store_settings FOR SELECT
  TO anon
  USING (true);

-- Actually we need a different approach - views with security_invoker use the caller's policies
-- So we need anon to be able to SELECT but only through the view
-- Let's use a security definer function instead
DROP POLICY IF EXISTS "Anyone can read public settings" ON public.store_settings;

CREATE OR REPLACE FUNCTION public.get_public_store_settings()
RETURNS SETOF store_settings_public
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM store_settings_public LIMIT 1;
$$;

-- 3. Fix launch_subscribers INSERT policy
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.launch_subscribers;
CREATE POLICY "Anyone can subscribe with email"
  ON public.launch_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND email <> '');

-- 4. Restrict increment_coupon_usage to service_role only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_coupon_usage') THEN
    REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(TEXT) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(TEXT) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(TEXT) TO service_role;
  END IF;
END $$;
