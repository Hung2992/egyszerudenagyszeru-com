import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Package, ShoppingBag, Users, Ticket,
  Plus, Pencil, Trash2, X, Check, Search, Upload, Image,
  BarChart3, DollarSign, ShoppingCart, TrendingUp, Settings, Mail, CreditCard, Store, Globe, Save,
  Palette, Clock, FileText, SearchIcon, Star, MessageSquare, Gift, ListChecks, Ruler,
  Truck, Bell, AlertTriangle, Receipt, RotateCcw, Zap, Megaphone, Shield, Headphones, Lock, FileDown, CreditCard as CreditCardIcon,
  Link2, MousePointerClick, Globe as GlobeIcon, Wrench, Key, HelpCircle, BarChart3 as BarChart3Icon, Heart, SlidersHorizontal,
  MonitorSmartphone, Factory, Trophy, Rss, Database, RefreshCw, Globe as Globe2, ShieldCheck, Sparkles, Layers, Wallet, Rocket, Brain, Calculator, Building2
} from "lucide-react";
import AdminShippingTab from "@/components/admin/AdminShippingTab";
import AdminSectionSearch from "@/components/admin/AdminSectionSearch";
import AdminInventoryTab from "@/components/admin/AdminInventoryTab";
import AdminSeoMarketingTab from "@/components/admin/AdminSeoMarketingTab";
import AdminTranslationsTab from "@/components/admin/AdminTranslationsTab";
import AdminReturnsTab from "@/components/admin/AdminReturnsTab";
import AdminDynamicPricingTab from "@/components/admin/AdminDynamicPricingTab";
import AdminMarketingTab from "@/components/admin/AdminMarketingTab";
import AdminFacebookStudioTab from "@/components/admin/AdminFacebookStudioTab";
import AdminInstagramStudioTab from "@/components/admin/AdminInstagramStudioTab";
import AdminTiktokStudioTab from "@/components/admin/AdminTiktokStudioTab";
import AdminYoutubeStudioTab from "@/components/admin/AdminYoutubeStudioTab";
import AdminYoutubeShortsStudioTab from "@/components/admin/AdminYoutubeShortsStudioTab";
import AdminGoogleAdsStudioTab from "@/components/admin/AdminGoogleAdsStudioTab";
import AdminPinterestStudioTab from "@/components/admin/AdminPinterestStudioTab";
import AdminLinkedinStudioTab from "@/components/admin/AdminLinkedinStudioTab";
import AdminTwitterStudioTab from "@/components/admin/AdminTwitterStudioTab";
import AdminAiStudioRecorder from "@/components/admin/AdminAiStudioRecorder";
import { Facebook as FacebookIcon, Instagram as InstagramIcon, Youtube as YoutubeIcon, Music2, Linkedin as LinkedinIcon, Twitter as TwitterIcon } from "lucide-react";
import AdminGdprTab from "@/components/admin/AdminGdprTab";
import AdminSupportTab from "@/components/admin/AdminSupportTab";
import AdminPermissionsTab from "@/components/admin/AdminPermissionsTab";
import AdminImportExportTab from "@/components/admin/AdminImportExportTab";
import AdminPaymentIntegrationsTab from "@/components/admin/AdminPaymentIntegrationsTab";
import AdminFinancialCenterTab from "@/components/admin/AdminFinancialCenterTab";
import AdminNotificationsTab from "@/components/admin/AdminNotificationsTab";
import AdminCrmTab from "@/components/admin/AdminCrmTab";
import AdminReviewSettingsTab from "@/components/admin/AdminReviewSettingsTab";
import AdminTaxInvoiceTab from "@/components/admin/AdminTaxInvoiceTab";
import AdminAffiliateTab from "@/components/admin/AdminAffiliateTab";
import AdminConversionTab from "@/components/admin/AdminConversionTab";
import AdminCurrencyTab from "@/components/admin/AdminCurrencyTab";
import AdminSystemTab from "@/components/admin/AdminSystemTab";
import AdminEmailAutomationTab from "@/components/admin/AdminEmailAutomationTab";
import AdminEmailCenterTab from "@/components/admin/AdminEmailCenterTab";
import AdminEmailMonitoringTab from "@/components/admin/AdminEmailMonitoringTab";
import AdminInboxTab from "@/components/admin/AdminInboxTab";
import AdminApiWebhookTab from "@/components/admin/AdminApiWebhookTab";
import AdminFaqKnowledgeTab from "@/components/admin/AdminFaqKnowledgeTab";
import AdminAdvancedAnalyticsTab from "@/components/admin/AdminAdvancedAnalyticsTab";
import AdminPartnerButtonAnalyticsTab from "@/components/admin/AdminPartnerButtonAnalyticsTab";
import AdminFulfillmentTab from "@/components/admin/AdminFulfillmentTab";
import AdminSalesRulesTab from "@/components/admin/AdminSalesRulesTab";
import AdminProductAttributesTab from "@/components/admin/AdminProductAttributesTab";
import AdminWishlistTab from "@/components/admin/AdminWishlistTab";
import AdminProcurementTab from "@/components/admin/AdminProcurementTab";
import AdminBulkProductImport from "@/components/admin/AdminBulkProductImport";
import AdminCustomerSegmentationTab from "@/components/admin/AdminCustomerSegmentationTab";
import GiveawayWheel from "@/components/admin/GiveawayWheel";
import GiveawayPrizeManager from "@/components/admin/GiveawayPrizeManager";
import AdminProductBundlesTab from "@/components/admin/AdminProductBundlesTab";
import AdminSocialMediaTab from "@/components/admin/AdminSocialMediaTab";
import AdminDeliverySlotsTab from "@/components/admin/AdminDeliverySlotsTab";
import AdminAbTestingTab from "@/components/admin/AdminAbTestingTab";
import AdminFlashSaleTab from "@/components/admin/AdminFlashSaleTab";
import AdminReviewRewardsTab from "@/components/admin/AdminReviewRewardsTab";
import AdminTicketingTab from "@/components/admin/AdminTicketingTab";
import AdminLoyaltyTiersTab from "@/components/admin/AdminLoyaltyTiersTab";
import AdminProductSchedulingTab from "@/components/admin/AdminProductSchedulingTab";
import AdminAdvancedDiscountsTab from "@/components/admin/AdminAdvancedDiscountsTab";
import AdminAccountingTab from "@/components/admin/AdminAccountingTab";
import AdminAiBookkeeperTab from "@/components/admin/AdminAiBookkeeperTab";
import AdminAiKnowledgeBaseTab from "@/components/admin/AdminAiKnowledgeBaseTab";
import AdminAiBrainReviewTab from "@/components/admin/AdminAiBrainReviewTab";
import AdminAiMetaLearnTab from "@/components/admin/AdminAiMetaLearnTab";
import AdminMultilangTab from "@/components/admin/AdminMultilangTab";
import AdminEmailTemplatesTab from "@/components/admin/AdminEmailTemplatesTab";
import AdminAttributionTab from "@/components/admin/AdminAttributionTab";
import AdminPopupBannerTab from "@/components/admin/AdminPopupBannerTab";
import AdminPriceRulesTab from "@/components/admin/AdminPriceRulesTab";
import AdminSupplierTab from "@/components/admin/AdminSupplierTab";
import AdminLoyaltyGamificationTab from "@/components/admin/AdminLoyaltyGamificationTab";
import AdminProductFeedTab from "@/components/admin/AdminProductFeedTab";
import AdminCustomerGroupPricingTab from "@/components/admin/AdminCustomerGroupPricingTab";
import AdminAdvancedSeoTab from "@/components/admin/AdminAdvancedSeoTab";
import AdminErpSyncTab from "@/components/admin/AdminErpSyncTab";
import AdminAutoReorderTab from "@/components/admin/AdminAutoReorderTab";
import AdminAutoProcurementTab from "@/components/admin/AdminAutoProcurementTab";
import AdminMultichannelTab from "@/components/admin/AdminMultichannelTab";
import AdminQualityAssuranceTab from "@/components/admin/AdminQualityAssuranceTab";
import AdminLoyaltyAnalyticsTab from "@/components/admin/AdminLoyaltyAnalyticsTab";
import AdminPreorderMgmtTab from "@/components/admin/AdminPreorderMgmtTab";
import AdminPackagingCustomTab from "@/components/admin/AdminPackagingCustomTab";
import AdminInvoiceAutomationTab from "@/components/admin/AdminInvoiceAutomationTab";
import AdminNpsTab from "@/components/admin/AdminNpsTab";
import AdminSubscribersTab from "@/components/admin/AdminSubscribersTab";
import AdminCheckoutCustomTab from "@/components/admin/AdminCheckoutCustomTab";
import AdminRecommendationEngineTab from "@/components/admin/AdminRecommendationEngineTab";
import AdminGdprCenterTab from "@/components/admin/AdminGdprCenterTab";
import AdminWebhookEventsTab from "@/components/admin/AdminWebhookEventsTab";
import AdminInventoryForecastTab from "@/components/admin/AdminInventoryForecastTab";
import AdminOrderAutomationTab from "@/components/admin/AdminOrderAutomationTab";
import AdminOrderInsightsTab from "@/components/admin/AdminOrderInsightsTab";
import AdminLaunchCenterTab from "@/components/admin/AdminLaunchCenterTab";
import AdminMediaManagerTab from "@/components/admin/AdminMediaManagerTab";
import AdminRetentionTab from "@/components/admin/AdminRetentionTab";
import AdminReviewModerationTab from "@/components/admin/AdminReviewModerationTab";
import AdminMultiWarehouseTab from "@/components/admin/AdminMultiWarehouseTab";
import AdminProductSeoTab from "@/components/admin/AdminProductSeoTab";
import AdminCsatTab from "@/components/admin/AdminCsatTab";
import AdminEmailSequencesTab from "@/components/admin/AdminEmailSequencesTab";
import AdminShippingZonesMgmtTab from "@/components/admin/AdminShippingZonesMgmtTab";
import AdminGiftcardSystemTab from "@/components/admin/AdminGiftcardSystemTab";
import AdminProductRecallTab from "@/components/admin/AdminProductRecallTab";
import AdminLoyaltyPointsRulesTab from "@/components/admin/AdminLoyaltyPointsRulesTab";
import AdminProductCompareTab from "@/components/admin/AdminProductCompareTab";
import AdminCouponRulesTab from "@/components/admin/AdminCouponRulesTab";
import AdminCouponsManagerTab from "@/components/admin/AdminCouponsManagerTab";
import AdminPartnersTab from "@/components/admin/AdminPartnersTab";
import AdminTenantsTab from "@/components/admin/AdminTenantsTab";
import AdminKycTab from "@/components/admin/AdminKycTab";
import AdminContractsTab from "@/components/admin/AdminContractsTab";
import AdminStockAlertAutoTab from "@/components/admin/AdminStockAlertAutoTab";
import AdminCrosssellUpsellTab from "@/components/admin/AdminCrosssellUpsellTab";
import AdminCustomerSurveysTab from "@/components/admin/AdminCustomerSurveysTab";
import AdminOrderWorkflowTab from "@/components/admin/AdminOrderWorkflowTab";
import AdminProductBadgesTab from "@/components/admin/AdminProductBadgesTab";
import AdminProductVariantsTab from "@/components/admin/AdminProductVariantsTab";
import AdminLoyaltyRewardsTab from "@/components/admin/AdminLoyaltyRewardsTab";
import AdminOrderConsolidationTab from "@/components/admin/AdminOrderConsolidationTab";
import AdminLoyaltyAutomationTab from "@/components/admin/AdminLoyaltyAutomationTab";
import AdminMarginManagementTab from "@/components/admin/AdminMarginManagementTab";
import AdminSatisfactionAutomationTab from "@/components/admin/AdminSatisfactionAutomationTab";
import AdminRemarketingAutomationTab from "@/components/admin/AdminRemarketingAutomationTab";
import AdminInstallmentPaymentTab from "@/components/admin/AdminInstallmentPaymentTab";
import AdminLegalCenterTab from "@/components/admin/AdminLegalCenterTab";
import AdminAccountantAccessTab from "@/components/admin/AdminAccountantAccessTab";
import AdminProductRankingTab from "@/components/admin/AdminProductRankingTab";
import AdminAiProductTaggingTab from "@/components/admin/AdminAiProductTaggingTab";
import AdminShippingCostRulesTab from "@/components/admin/AdminShippingCostRulesTab";
import AdminInventoryMovementLogTab from "@/components/admin/AdminInventoryMovementLogTab";
import AdminLoyaltyDashboardTab from "@/components/admin/AdminLoyaltyDashboardTab";
import AdminDynamicPriceAutomationTab from "@/components/admin/AdminDynamicPriceAutomationTab";
import AdminFeedbackCampaignsTab from "@/components/admin/AdminFeedbackCampaignsTab";
import AdminBundleDealsMgmtTab from "@/components/admin/AdminBundleDealsMgmtTab";
import AdminInvoiceGeneratorTab from "@/components/admin/AdminInvoiceGeneratorTab";
import AdminPersonalizedRecommendationsTab from "@/components/admin/AdminPersonalizedRecommendationsTab";
import ProductImageGallery from "@/components/admin/ProductImageGallery";
import ProductLinkImport from "@/components/admin/ProductLinkImport";
import AdminAiAssistant from "@/components/admin/AdminAiAssistant";
import AdminDashboardEnhanced from "@/components/admin/AdminDashboardEnhanced";
import AdminVisitorAnalytics from "@/components/admin/AdminVisitorAnalytics";
import AdminOrderDetail from "@/components/admin/AdminOrderDetail";
import AdminUserProfile from "@/components/admin/AdminUserProfile";
import { Textarea } from "@/components/ui/textarea";
import { sendAppEmail } from "@/lib/app-email";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ─── Types ───
interface ShopProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  sizes: string[];
  colors: string[];
  image_url: string | null;
  is_active: boolean;
  stock: number;
  created_at: string;
  launch_status?: string;
  launch_date?: string | null;
  preorder_enabled?: boolean;
  preorder_deposit_percent?: number;
  preorder_limit?: number | null;
  teaser_description?: string | null;
  teaser_image_url?: string | null;
  is_sneak_peek?: boolean;
  material?: string | null;
  care_instructions?: string | null;
  origin_country?: string | null;
  manufacturer?: string | null;
  weight_grams?: number | null;
}

const createEmptyProductDraft = (): Partial<ShopProduct> => ({
  name: "",
  description: "",
  price: 0,
  original_price: null,
  category: "Egyéb",
  sizes: [],
  colors: [],
  image_url: null,
  is_active: true,
  stock: 0,
  launch_status: "live",
  launch_date: null,
  preorder_enabled: false,
  preorder_deposit_percent: 20,
  preorder_limit: null,
  teaser_description: null,
  teaser_image_url: null,
  is_sneak_peek: false,
  material: "",
  care_instructions: "",
  origin_country: "",
  manufacturer: "",
  weight_grams: null,
});

interface Order {
  id: string;
  customer_email: string;
  user_id: string | null;
  status: string;
  total_amount: number;
  shipping_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_zip: string | null;
  shipping_phone: string | null;
  payment_method: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  items: any;
  created_at: string;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  preferred_payment: string | null;
  created_at: string;
  user_id: string | null;
}

interface BusinessHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessHours {
  monday: BusinessHoursDay;
  tuesday: BusinessHoursDay;
  wednesday: BusinessHoursDay;
  thursday: BusinessHoursDay;
  friday: BusinessHoursDay;
  saturday: BusinessHoursDay;
  sunday: BusinessHoursDay;
}

interface StoreSettings {
  id: string;
  store_name: string;
  logo_url: string | null;
  currency: string;
  shipping_fee: number;
  free_shipping_above: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  payment_cash_enabled: boolean;
  payment_card_enabled: boolean;
  payment_cod_enabled: boolean;
  email_order_confirmation: boolean;
  email_shipping_notification: boolean;
  email_coupon_notification: boolean;
  social_facebook: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  social_twitter: string | null;
  social_pinterest: string | null;
  reply_to_email: string | null;
  sender_name: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_og_image_url: string | null;
  seo_canonical_url: string | null;
  seo_robots: string | null;
  seo_google_analytics_id: string | null;
  seo_search_console_code: string | null;
  seo_structured_data_enabled: boolean;
  theme_primary_color: string | null;
  theme_accent_color: string | null;
  theme_font_heading: string | null;
  theme_font_body: string | null;
  theme_bg_color: string | null;
  theme_button_radius: string | null;
  theme_logo_position: string | null;
  theme_favicon_url: string | null;
  theme_header_height: string | null;
  theme_footer_text: string | null;
  theme_custom_css: string | null;
  business_hours: BusinessHours | null;
  auto_reply_message: string | null;
  terms_and_conditions: string | null;
  privacy_policy: string | null;
  custom_order_statuses: { key: string; label: string; color: string }[] | null;
  size_chart_template: string | null;
  return_policy: string | null;
  warranty_info: string | null;
  loyalty_enabled: boolean;
  loyalty_points_per_currency: number;
  loyalty_discount_per_points: number;
  loyalty_min_redeem: number;
  loyalty_redemption_rate: number;
  loyalty_levels: string[];
  loyalty_expiry_months: number;
  reviews_enabled: boolean;
  reviews_require_approval: boolean;
  shipping_methods: { key: string; label: string; price: number; description: string; is_active: boolean }[] | null;
  low_stock_threshold: number;
  auto_hide_out_of_stock: boolean;
  notification_new_order: boolean;
  notification_low_stock: boolean;
  notification_new_review: boolean;
  notification_email: string | null;
  invoice_company_name: string | null;
  invoice_tax_number: string | null;
  invoice_bank_account: string | null;
  invoice_address: string | null;
  invoice_header_text: string | null;
  invoice_footer_text: string | null;
  // Checkout
  checkout_require_phone: boolean;
  checkout_require_city: boolean;
  checkout_require_zip: boolean;
  checkout_enable_notes: boolean;
  checkout_enable_gift_wrap: boolean;
  checkout_gift_wrap_price: number;
  checkout_min_order_amount: number;
  checkout_success_message: string | null;
  // Cookie
  cookie_banner_enabled: boolean;
  cookie_banner_text: string | null;
  cookie_banner_button_text: string | null;
  cookie_banner_position: string | null;
  // Maintenance
  maintenance_enabled: boolean;
  maintenance_message: string | null;
  maintenance_password: string | null;
  // Popups
  popup_newsletter_enabled: boolean;
  popup_newsletter_title: string | null;
  popup_newsletter_text: string | null;
  popup_newsletter_delay_seconds: number;
  popup_exit_enabled: boolean;
  popup_exit_title: string | null;
  popup_exit_text: string | null;
  popup_promo_enabled: boolean;
  popup_promo_title: string | null;
  popup_promo_text: string | null;
  popup_promo_image_url: string | null;
  // Email templates
  email_welcome_enabled: boolean;
  email_welcome_subject: string | null;
  email_welcome_body: string | null;
  email_abandoned_cart_enabled: boolean;
  email_abandoned_cart_delay_hours: number;
  email_review_request_enabled: boolean;
  email_review_request_delay_days: number;
  // Language
  lang_default: string | null;
  lang_available: string[] | null;
  lang_auto_detect: boolean;
  // Discount rules
  discount_quantity_enabled: boolean;
  discount_quantity_rules: any;
  discount_vip_enabled: boolean;
  discount_vip_tiers: any;
  discount_auto_enabled: boolean;
  discount_auto_min_amount: number;
  discount_auto_value: number;
  discount_auto_type: string | null;
  // Product display
  product_default_view: string | null;
  product_grid_columns: number;
  product_items_per_page: number;
  product_default_sort: string | null;
  product_quick_view_enabled: boolean;
  product_show_stock_badge: boolean;
  product_show_discount_badge: boolean;
  // Registration
  reg_require_name: boolean;
  reg_require_phone: boolean;
  reg_require_address: boolean;
  reg_social_login_enabled: boolean;
  reg_terms_required: boolean;
  reg_welcome_message: string | null;
  // Analytics
  analytics_enabled: boolean;
  analytics_meta_pixel_id: string | null;
  analytics_gtm_id: string | null;
  analytics_tiktok_pixel_id: string | null;
  analytics_fb_conversions_token: string | null;
  analytics_custom_head_code: string | null;
  analytics_custom_body_code: string | null;
  // Cookie extended
  cookie_analytics_enabled: boolean;
  cookie_marketing_enabled: boolean;
  cookie_functional_enabled: boolean;
  cookie_privacy_url: string | null;
  cookie_expiry_days: number;
  // Notification extended
  notification_slack_webhook: string | null;
  notification_new_user: boolean;
  notification_cancelled_order: boolean;
  notification_daily_summary: boolean;
  // Maintenance extended
  maintenance_return_date: string | null;
  maintenance_ip_whitelist: string | null;
  maintenance_banner_text: string | null;
  // Payment extended
  payment_transfer_enabled: boolean;
  payment_transfer_bank_name: string | null;
  payment_transfer_iban: string | null;
  payment_installment_enabled: boolean;
  payment_installment_months: number;
  payment_min_order_amount: number;
  // Shipping zones
  shipping_zones: { name: string; regions: string; fee: number; delivery_days: number; is_active: boolean }[] | null;
  shipping_free_limit: number;
  shipping_default_cost: number;
  // Stock alerts extended
  stock_alert_enabled: boolean;
  stock_alert_email: string | null;
  stock_alert_threshold: number;
  stock_auto_hide: boolean;
  stock_auto_reorder_enabled: boolean;
  stock_auto_reorder_threshold: number;
  stock_show_remaining_count: boolean;
  stock_show_availability_text: boolean;
  // SEO extended
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  seo_og_image: string | null;
  seo_sitemap_enabled: boolean;
  // Appearance extended
  appearance_product_card_style: string | null;
  appearance_header_style: string | null;
  appearance_footer_style: string | null;
  appearance_announcement_bar_enabled: boolean;
  appearance_announcement_bar_text: string | null;
  appearance_announcement_bar_bg_color: string | null;
  // Coupon settings
  coupon_auto_apply_enabled: boolean;
  coupon_stackable: boolean;
  coupon_max_per_user: number;
  coupon_first_order_discount: boolean;
  coupon_first_order_value: number;
  // Product tags/filters
  product_tags: { name: string; color: string }[];
  product_filter_by_color: boolean;
  product_filter_by_size: boolean;
  product_filter_by_price: boolean;
  product_filter_by_material: boolean;
  // User notifications
  notif_push_enabled: boolean;
  notif_sms_enabled: boolean;
  notif_sms_provider: string | null;
  notif_order_status_sms: boolean;
  notif_promo_push: boolean;
  // Order workflow
  order_auto_confirm: boolean;
  order_auto_cancel_hours: number;
  order_require_payment_proof: boolean;
  order_workflow_steps: { key: string; label: string; auto_email: boolean }[];
  // Product comparison
  compare_enabled: boolean;
  compare_max_products: number;
  compare_show_differences_only: boolean;
  // Return rules
  return_auto_approve: boolean;
  return_deadline_days: number;
  return_reasons: string[];
  return_refund_method: string | null;
  // Gift cards
  giftcard_enabled: boolean;
  giftcard_min_amount: number;
  giftcard_max_amount: number;
  giftcard_expiry_months: number;
  giftcard_custom_design: boolean;
  // i18n
  i18n_auto_translate: boolean;
  i18n_default_language: string | null;
  i18n_supported_languages: string[];
  i18n_show_switcher: boolean;
}

interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  admin_reply: string | null;
  created_at: string;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

interface HomepageBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  button_text: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  promo_type: string;
  discount_value: number;
  min_quantity: number;
  min_order_amount: number;
  applicable_categories: string[];
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

interface PaymentMethodConfig {
  key: string;
  label: string;
  description: string;
  is_active: boolean;
}

interface EmailTemplate {
  key: string;
  subject: string;
  body: string;
}

type Tab = "partner_contracts" | "ai_marketing_studio" | "ai_studio_recorder" | "ai_knowledge_base" | "ai_brain_review" | "ai_meta_learn" | "fb_studio" | "ig_studio" | "tt_studio" | "yt_studio" | "yts_studio" | "gads_studio" | "pin_studio" | "li_studio" | "x_studio" | "ai_bookkeeper" | "legal_center" | "accountant_access" | "messages" | "launch_center" | "order_insights" | "email_monitoring" | "dashboard" | "products" | "giveaway_wheel" | "orders" | "coupons" | "coupons_manager" | "partners" | "tenants" | "tenant_kyc" | "users" | "reviews" | "categories" | "banners" | "promotions" | "payment_methods" | "analytics" | "email_templates" | "roles" | "shipping_mgmt" | "inventory" | "seo_marketing" | "translations" | "returns" | "dynamic_pricing" | "marketing" | "gdpr" | "support" | "permissions" | "import_export" | "payment_integrations" | "notifications" | "crm" | "review_settings" | "tax_invoice" | "affiliate" | "conversion" | "currency" | "system" | "email_automation" | "api_webhooks" | "faq_knowledge" | "advanced_analytics" | "partner_button_analytics" | "fulfillment" | "sales_rules" | "product_attributes" | "wishlist" | "procurement" | "auto_procurement" | "customer_segmentation" | "product_bundles" | "social_media" | "delivery_slots" | "ab_testing" | "flash_sale" | "review_rewards" | "ticketing" | "loyalty_tiers" | "product_scheduling" | "advanced_discounts" | "accounting" | "multilang" | "email_templates_custom" | "attribution" | "popup_banners" | "price_rules" | "supplier_mgmt" | "loyalty_gamification" | "product_feed" | "customer_group_pricing" | "advanced_seo" | "erp_sync" | "auto_reorder" | "multichannel" | "quality_assurance" | "loyalty_analytics" | "preorder_mgmt" | "packaging_custom" | "invoice_automation" | "nps" | "checkout_custom" | "recommendation_engine" | "gdpr_center" | "webhook_events" | "inventory_forecast" | "order_automation" | "media_manager" | "retention" | "review_moderation" | "multi_warehouse" | "product_seo" | "csat" | "email_sequences" | "shipping_zones_mgmt" | "giftcard_system" | "product_recall" | "loyalty_points_rules" | "product_compare" | "coupon_rules" | "stock_alert_auto" | "crosssell_upsell" | "customer_surveys" | "order_workflow" | "product_badges" | "product_variants" | "loyalty_rewards" | "order_consolidation" | "loyalty_automation" | "margin_management" | "satisfaction_automation" | "remarketing_automation" | "installment_payment" | "product_ranking" | "ai_product_tagging" | "shipping_cost_rules" | "inventory_movement_log" | "loyalty_dashboard" | "dynamic_price_automation" | "feedback_campaigns" | "bundle_deals_mgmt" | "invoice_generator" | "personalized_recommendations" | "subscribers" | "financial_center" | "settings";
type SettingsSection = "store" | "payment" | "email" | "seo" | "appearance" | "hours" | "legal" | "statuses" | "templates" | "loyalty" | "reviews_config" | "shipping" | "inventory" | "notifications" | "invoicing" | "checkout" | "cookie" | "maintenance" | "popups" | "language" | "discounts" | "product_display" | "registration" | "analytics" | "payment_config" | "shipping_zones" | "stock_alerts" | "appearance_custom" | "coupon_settings" | "product_tags" | "user_notifications" | "order_workflow" | "compare_settings" | "return_rules" | "giftcard_settings" | "i18n_settings";

const CATEGORIES = ["Pólók", "Pulóverek", "Nadrágok", "Dzsekik", "Kiegészítők", "Cipők", "Egyéb"];

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading, userId } = useAdminCheck();
  const [tab, setTab] = useState<Tab>("ai_marketing_studio");
  const [marketingStudioTab, setMarketingStudioTab] = useState<Tab>("ai_studio_recorder");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("store");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Products state
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [editProduct, setEditProduct] = useState<Partial<ShopProduct> | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [procurementForProfit, setProcurementForProfit] = useState<any[]>([]);
  const [preorders, setPreorders] = useState<any[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);
  const [ordersSubTab, setOrdersSubTab] = useState<"live" | "preorder" | "waitlist">("live");

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editCoupon, setEditCoupon] = useState<Partial<Coupon> | null>(null);
  const [showCouponForm, setShowCouponForm] = useState(false);

  // Users state
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);

  // Settings state
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [replyingReview, setReplyingReview] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Categories state
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [editCategory, setEditCategory] = useState<Partial<ProductCategory> | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // Banners state
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [editBanner, setEditBanner] = useState<Partial<HomepageBanner> | null>(null);
  const [showBannerForm, setShowBannerForm] = useState(false);

  // Promotions state
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editPromotion, setEditPromotion] = useState<Partial<Promotion> | null>(null);
  const [showPromotionForm, setShowPromotionForm] = useState(false);

  // User roles state
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [newRoleUserId, setNewRoleUserId] = useState("");
  const [newRoleType, setNewRoleType] = useState<string>("admin");

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([
    { key: "cash", label: "Készpénz", description: "Személyes átvételkor készpénzzel", is_active: false },
    { key: "card", label: "Bankkártya", description: "Online bankkártyás fizetés", is_active: false },
    { key: "cod", label: "Utánvét", description: "Fizetés a futárnál átvételkor", is_active: false },
    { key: "transfer", label: "Banki átutalás", description: "Előre utalás bankszámlára", is_active: false },
  ]);

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([
    { key: "order_confirmation", subject: "Rendelés visszaigazolás - #{orderId}", body: "Kedves {name}!\n\nKöszönjük rendelését! Az alábbi rendelést rögzítettük:\n\nRendelés szám: #{orderId}\nÖsszeg: {total} Ft\n\nÜdvözlettel,\n{storeName}" },
    { key: "shipping_notification", subject: "Rendelésed útnak indult! - #{orderId}", body: "Kedves {name}!\n\nÖrömmel értesítünk, hogy #{orderId} számú rendelésed elküldtük!\n\nÜdvözlettel,\n{storeName}" },
    { key: "registration_welcome", subject: "Üdvözlünk a {storeName}-nál!", body: "Kedves {name}!\n\nÜdvözlünk a {storeName} webshopban! Sikeres regisztrációd után most már hozzáférhetsz az exkluzív ajánlatainkhoz.\n\nJó vásárlást kívánunk!\n{storeName}" },
    { key: "password_reset", subject: "Jelszó visszaállítás - {storeName}", body: "Kedves {name}!\n\nJelszó visszaállítási kérelmet kaptunk. Kattints az alábbi linkre:\n{resetLink}\n\nHa nem te kérted, hagyd figyelmen kívül.\n\n{storeName}" },
  ]);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      const isLoggedIn = Boolean(userId);
      navigate(isLoggedIn ? "/" : "/auth?redirect=/admin", { replace: true });
      toast({
        title: isLoggedIn ? "Hozzáférés megtagadva" : "Admin belépés szükséges",
        description: isLoggedIn ? "Nincs admin jogosultságod." : "Jelentkezz be, utána visszaviszünk az admin felületre.",
        variant: "destructive",
      });
    }
  }, [loading, isAdmin, userId, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
      fetchOrders();
      fetchCoupons();
      fetchUsers();
      fetchSettings();
      fetchReviews();
      fetchCategories();
      fetchBanners();
      fetchPromotions();
      fetchUserRoles();
    }
  }, [isAdmin]);

  // Sync payment methods from settings
  useEffect(() => {
    if (settings) {
      setPaymentMethods(prev => prev.map(pm => ({
        ...pm,
        is_active: pm.key === "cash" ? settings.payment_cash_enabled :
                   pm.key === "card" ? settings.payment_card_enabled :
                   pm.key === "cod" ? settings.payment_cod_enabled :
                   pm.is_active
      })));
    }
  }, [settings]);

  // ─── Fetch functions ───
  const fetchProducts = async () => {
    const { data, error } = await supabase.from("shop_products").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Product fetch failed:", error);
      throw error;
    }
    if (data) setProducts(data as any);
  };

  const fetchOrders = async () => {
    const [oRes, pRes, wRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("product_preorders").select("*, shop_products(name, image_url, price)").order("created_at", { ascending: false }),
      supabase.from("product_waitlist").select("*, shop_products(name, image_url)").order("created_at", { ascending: false }),
    ]);
    if (oRes.data) setOrders(oRes.data as any);
    if (pRes.data) setPreorders(pRes.data as any);
    if (wRes.data) setWaitlistEntries(wRes.data as any);
  };

  const fetchCoupons = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (data) setCoupons(data as any);
  };

  const fetchUsers = async () => {
    // Merge users from profiles, orders, giveaway entries, and subscribers
    const [profilesRes, ordersRes, giveawayRes, subscribersRes] = await Promise.all([
      supabase.from("profiles").select("id, display_name, email, phone, city, preferred_payment, created_at, user_id").order("created_at", { ascending: false }),
      supabase.from("orders").select("customer_email, shipping_name, shipping_city, shipping_phone, created_at, user_id"),
      supabase.from("giveaway_entries").select("email, created_at"),
      supabase.from("launch_subscribers").select("email, created_at"),
    ]);

    const mergedMap: Record<string, ProfileRow> = {};

    // Add profiles first (highest priority)
    (profilesRes.data || []).forEach((p: any) => {
      const key = (p.email || p.id).toLowerCase();
      mergedMap[key] = p;
    });

    // Add order customers
    (ordersRes.data || []).forEach((o: any) => {
      const email = o.customer_email?.toLowerCase();
      if (!email || email === "missing-email@invalid.local") return;
      if (!mergedMap[email]) {
        mergedMap[email] = {
          id: email,
          display_name: o.shipping_name || null,
          email: o.customer_email,
          phone: o.shipping_phone || null,
          city: o.shipping_city || null,
          preferred_payment: null,
          created_at: o.created_at,
          user_id: o.user_id || null,
        };
      } else {
        // Update with latest data
        if (o.shipping_name && !mergedMap[email].display_name) mergedMap[email].display_name = o.shipping_name;
        if (o.shipping_phone && !mergedMap[email].phone) mergedMap[email].phone = o.shipping_phone;
        if (o.shipping_city && !mergedMap[email].city) mergedMap[email].city = o.shipping_city;
      }
    });

    // Add giveaway entries
    (giveawayRes.data || []).forEach((g: any) => {
      const email = g.email?.toLowerCase();
      if (!email) return;
      if (!mergedMap[email]) {
        mergedMap[email] = {
          id: email,
          display_name: null,
          email: g.email,
          phone: null,
          city: null,
          preferred_payment: null,
          created_at: g.created_at,
          user_id: null,
        };
      }
    });

    // Add subscribers
    (subscribersRes.data || []).forEach((s: any) => {
      const email = s.email?.toLowerCase();
      if (!email) return;
      if (!mergedMap[email]) {
        mergedMap[email] = {
          id: email,
          display_name: null,
          email: s.email,
          phone: null,
          city: null,
          preferred_payment: null,
          created_at: s.created_at,
          user_id: null,
        };
      }
    });

    const merged = Object.values(mergedMap).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setUsers(merged);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
    if (data) setSettings(data as any);
  };

  const fetchReviews = async () => {
    const { data } = await supabase.from("product_reviews").select("*").order("created_at", { ascending: false });
    if (data) setReviews(data as any);
  };

  const approveReview = async (id: string, approved: boolean) => {
    await supabase.from("product_reviews").update({ is_approved: approved } as any).eq("id", id);
    fetchReviews();
    toast({ title: approved ? "Vélemény jóváhagyva" : "Vélemény elutasítva" });
  };

  const deleteReview = async (id: string) => {
    await supabase.from("product_reviews").delete().eq("id", id);
    fetchReviews();
    toast({ title: "Vélemény törölve" });
  };

  const saveAdminReply = async (id: string) => {
    await supabase.from("product_reviews").update({ admin_reply: replyText } as any).eq("id", id);
    setReplyingReview(null);
    setReplyText("");
    fetchReviews();
    toast({ title: "Válasz elmentve" });
  };

  // ─── Categories CRUD ───
  const fetchCategories = async () => {
    const { data } = await supabase.from("product_categories").select("*").order("sort_order", { ascending: true });
    if (data) setCategories(data as any);
  };

  const saveCategory = async () => {
    if (!editCategory?.name) {
      toast({ title: "Hiba", description: "Kategória név kötelező!", variant: "destructive" });
      return;
    }
    const slug = editCategory.slug || editCategory.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = {
      name: editCategory.name,
      slug,
      image_url: editCategory.image_url || null,
      sort_order: editCategory.sort_order || 0,
      is_active: editCategory.is_active ?? true,
    };
    if (editCategory.id) {
      await supabase.from("product_categories").update(payload).eq("id", editCategory.id);
      toast({ title: "Kategória frissítve!" });
    } else {
      await supabase.from("product_categories").insert(payload);
      toast({ title: "Kategória létrehozva!" });
    }
    setShowCategoryForm(false);
    setEditCategory(null);
    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("product_categories").delete().eq("id", id);
    toast({ title: "Kategória törölve!" });
    fetchCategories();
  };

  // ─── Banners CRUD ───
  const fetchBanners = async () => {
    const { data } = await supabase.from("homepage_banners").select("*").order("sort_order", { ascending: true });
    if (data) setBanners(data as any);
  };

  const saveBanner = async () => {
    if (!editBanner?.title) {
      toast({ title: "Hiba", description: "Banner cím kötelező!", variant: "destructive" });
      return;
    }
    const payload = {
      title: editBanner.title,
      subtitle: editBanner.subtitle || null,
      image_url: editBanner.image_url || null,
      link_url: editBanner.link_url || null,
      button_text: editBanner.button_text || "Vásárlás",
      sort_order: editBanner.sort_order || 0,
      is_active: editBanner.is_active ?? true,
    };
    if (editBanner.id) {
      await supabase.from("homepage_banners").update(payload).eq("id", editBanner.id);
      toast({ title: "Banner frissítve!" });
    } else {
      await supabase.from("homepage_banners").insert(payload);
      toast({ title: "Banner létrehozva!" });
    }
    setShowBannerForm(false);
    setEditBanner(null);
    fetchBanners();
  };

  const deleteBanner = async (id: string) => {
    await supabase.from("homepage_banners").delete().eq("id", id);
    toast({ title: "Banner törölve!" });
    fetchBanners();
  };

  // ─── Promotions CRUD ───
  const fetchPromotions = async () => {
    const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
    if (data) setPromotions(data as any);
  };

  const savePromotion = async () => {
    if (!editPromotion?.name) {
      toast({ title: "Hiba", description: "Akció név kötelező!", variant: "destructive" });
      return;
    }
    const payload = {
      name: editPromotion.name,
      description: editPromotion.description || null,
      promo_type: editPromotion.promo_type || "percentage",
      discount_value: Number(editPromotion.discount_value) || 0,
      min_quantity: Number(editPromotion.min_quantity) || 1,
      min_order_amount: Number(editPromotion.min_order_amount) || 0,
      applicable_categories: editPromotion.applicable_categories || [],
      is_active: editPromotion.is_active ?? true,
      valid_from: editPromotion.valid_from || new Date().toISOString(),
      valid_until: editPromotion.valid_until || null,
    };
    if (editPromotion.id) {
      await supabase.from("promotions").update(payload).eq("id", editPromotion.id);
      toast({ title: "Akció frissítve!" });
    } else {
      await supabase.from("promotions").insert(payload);
      toast({ title: "Akció létrehozva!" });
    }
    setShowPromotionForm(false);
    setEditPromotion(null);
    fetchPromotions();
  };

  const deletePromotion = async (id: string) => {
    await supabase.from("promotions").delete().eq("id", id);
    toast({ title: "Akció törölve!" });
    fetchPromotions();
  };

  // ─── User Roles CRUD ───
  const fetchUserRoles = async () => {
    const { data } = await supabase.from("user_roles").select("*").order("user_id", { ascending: true });
    if (data) setUserRoles(data as any);
  };

  const addUserRole = async () => {
    if (!newRoleUserId.trim()) {
      toast({ title: "Hiba", description: "User ID kötelező!", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: newRoleUserId.trim(), role: newRoleType } as any);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Szerepkör hozzáadva!" });
      setNewRoleUserId("");
      fetchUserRoles();
    }
  };

  const removeUserRole = async (id: string) => {
    await supabase.from("user_roles").delete().eq("id", id);
    toast({ title: "Szerepkör eltávolítva!" });
    fetchUserRoles();
  };

  // ─── Payment methods toggle ───
  const togglePaymentMethod = async (key: string, enabled: boolean) => {
    if (!settings) return;
    const updatedSettings = { ...settings };
    if (key === "cash") updatedSettings.payment_cash_enabled = enabled;
    else if (key === "card") updatedSettings.payment_card_enabled = enabled;
    else if (key === "cod") updatedSettings.payment_cod_enabled = enabled;
    setSettings(updatedSettings);
    setPaymentMethods(prev => prev.map(pm => pm.key === key ? { ...pm, is_active: enabled } : pm));
    
    const { id, ...payload } = updatedSettings;
    await supabase.from("store_settings").update(payload as any).eq("id", id);
    toast({ title: `${key === "cash" ? "Készpénz" : key === "card" ? "Bankkártya" : "Utánvét"} ${enabled ? "engedélyezve" : "letiltva"}` });
  };


  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: "Nincs exportálható adat", variant: "destructive" });
      return;
    }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(";"),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return JSON.stringify(val).replace(/;/g, ",");
        return String(val).replace(/;/g, ",");
      }).join(";"))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast({ title: `${filename} exportálva!` });
  };

  // ─── Image Upload ───
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Csak képfájl tölthető fel", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (error) {
        toast({ title: "Feltöltési hiba", description: error.message, variant: "destructive" });
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(data?.path || fileName);

      setEditProduct((prev) => (prev ? { ...prev, image_url: publicUrlData.publicUrl } : prev));
      toast({ title: "Kép feltöltve!" });
    } catch (error) {
      toast({
        title: "Feltöltési hiba",
        description: error instanceof Error ? error.message : "Ismeretlen hiba történt.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);
    if (error) {
      toast({ title: "Feltöltési hiba", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
    setSettings({ ...settings, logo_url: publicUrl });
    toast({ title: "Logó feltöltve!" });
    setUploading(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // ─── Product CRUD ───
  const saveProduct = async () => {
    if (!editProduct || savingProduct) return;

    const name = editProduct.name?.trim() || "";
    const price = Number(editProduct.price);
    const originalPrice = editProduct.original_price === null || editProduct.original_price === undefined || String(editProduct.original_price).trim() === ""
      ? null
      : Number(editProduct.original_price);
    const stock = Number(editProduct.stock ?? 0);

    if (!name || Number.isNaN(price) || price < 0) {
      toast({ title: "Hiba", description: "Adj meg érvényes nevet és árat!", variant: "destructive" });
      return;
    }

    if (originalPrice !== null && Number.isNaN(originalPrice)) {
      toast({ title: "Hiba", description: "Az eredeti ár nem érvényes.", variant: "destructive" });
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      toast({ title: "Hiba", description: "A készlet nem lehet negatív.", variant: "destructive" });
      return;
    }

    const payload = {
      name,
      description: editProduct.description?.trim() || null,
      price,
      original_price: originalPrice,
      category: editProduct.category || "Egyéb",
      sizes: (editProduct.sizes || []).map((size) => size.trim()).filter(Boolean),
      colors: (editProduct.colors || []).map((color) => color.trim()).filter(Boolean),
      image_url: editProduct.image_url?.trim() || null,
      is_active: editProduct.is_active ?? true,
      stock,
      launch_status: editProduct.launch_status || "live",
      launch_date: editProduct.launch_date || null,
      preorder_enabled: editProduct.preorder_enabled ?? false,
      preorder_deposit_percent: Number(editProduct.preorder_deposit_percent ?? 20),
      preorder_limit: editProduct.preorder_limit === null || editProduct.preorder_limit === undefined || String(editProduct.preorder_limit).trim() === "" ? null : Number(editProduct.preorder_limit),
      teaser_description: editProduct.teaser_description?.trim() || null,
      teaser_image_url: editProduct.teaser_image_url?.trim() || null,
      is_sneak_peek: editProduct.is_sneak_peek ?? false,
      material: editProduct.material?.trim() || null,
      care_instructions: editProduct.care_instructions?.trim() || null,
      origin_country: editProduct.origin_country?.trim() || null,
      manufacturer: editProduct.manufacturer?.trim() || null,
      weight_grams: editProduct.weight_grams === null || editProduct.weight_grams === undefined || String(editProduct.weight_grams).trim() === "" ? null : Number(editProduct.weight_grams),
    };

    setSavingProduct(true);

    try {
      let productId = editProduct.id;
      if (editProduct.id) {
        const { error } = await supabase.from("shop_products").update(payload).eq("id", editProduct.id);
        if (error) {
          console.error("Product update failed:", error, payload);
          toast({ title: "Mentési hiba", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Termék frissítve!" });
      } else {
        const { data: inserted, error } = await supabase.from("shop_products").insert(payload).select("id").single();
        if (error) {
          console.error("Product insert failed:", error, payload);
          toast({ title: "Mentési hiba", description: error.message, variant: "destructive" });
          return;
        }
        productId = inserted?.id;
        toast({ title: "Termék hozzáadva!" });
      }

      // ─── Szín × méret darabszám mátrix mentése product_variants-be ───
      const matrix: Record<string, Record<string, number>> = (editProduct as any)._stockMatrix || {};
      const hasMatrix = Object.keys(matrix).length > 0;
      if (productId && hasMatrix) {
        try {
          await supabase.from("product_variants").delete().eq("product_id", productId);
          const rows: any[] = [];
          for (const [color, sizes] of Object.entries(matrix)) {
            for (const [size, stock] of Object.entries(sizes || {})) {
              rows.push({
                product_id: productId,
                color: color === "—" ? null : color,
                size: size === "—" ? null : size,
                stock: Number(stock || 0),
                is_active: true,
              });
            }
          }
          if (rows.length > 0) {
            const { error: varErr } = await supabase.from("product_variants").insert(rows);
            if (varErr) console.error("Variant sync failed:", varErr);
          }
          await supabase.from("shop_products").update({ has_variants: true }).eq("id", productId);
        } catch (err) {
          console.error("Variant matrix save failed:", err);
        }
      }

      setShowProductForm(false);
      setEditProduct(null);

      setSavingProduct(false);
      void fetchProducts().catch((error) => {
        console.error("Product refresh failed after save:", error);
        toast({
          title: "Frissítési hiba",
          description: error instanceof Error ? error.message : "A termék mentve lett, de a lista nem frissült automatikusan.",
          variant: "destructive",
        });
      });
      return;
    } catch (error) {
      console.error("Unexpected product save error:", error);
      toast({
        title: "Mentési hiba",
        description: error instanceof Error ? error.message : "Ismeretlen hiba történt.",
        variant: "destructive",
      });
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) {
      toast({ title: "Törlési hiba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Termék törölve!" });
    fetchProducts();
  };

  // ─── Coupon CRUD ───
  const saveCoupon = async () => {
    if (!editCoupon?.code) {
      toast({ title: "Hiba", description: "Kuponkód kötelező!", variant: "destructive" });
      return;
    }
    const payload = {
      code: editCoupon.code.toUpperCase(),
      description: editCoupon.description || null,
      discount_percent: editCoupon.discount_percent ? Number(editCoupon.discount_percent) : null,
      discount_amount: editCoupon.discount_amount ? Number(editCoupon.discount_amount) : null,
      is_active: editCoupon.is_active ?? true,
      valid_from: editCoupon.valid_from || null,
      valid_until: editCoupon.valid_until || null,
      max_uses: editCoupon.max_uses ? Number(editCoupon.max_uses) : null,
    };

    if (editCoupon.id) {
      await supabase.from("coupons").update(payload).eq("id", editCoupon.id);
      toast({ title: "Kupon frissítve!" });
    } else {
      await supabase.from("coupons").insert(payload);
      toast({ title: "Kupon létrehozva!" });
    }
    setShowCouponForm(false);
    setEditCoupon(null);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast({ title: "Kupon törölve!" });
    fetchCoupons();
  };

  // ─── Order status ───
  const updateOrderStatus = async (id: string, status: string) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    if (order.status === status) return;

    const { error } = await supabase.from("orders").update({ status } as any).eq("id", id);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
      return;
    }

    if (order.customer_email && status === "shipped") {
      try {
        await sendAppEmail({
          templateName: "shipping-notification",
          recipientEmail: order.customer_email,
          idempotencyKey: `shipping-${order.id}`,
          templateData: { name: order.shipping_name ?? undefined },
        });
      } catch (emailError) {
        console.error("Shipping email error:", emailError);
      }
    }

    if (order.customer_email && status === "delivered") {
      try {
        await sendAppEmail({
          templateName: "delivery-confirmation",
          recipientEmail: order.customer_email,
          idempotencyKey: `delivery-${order.id}`,
          templateData: { name: order.shipping_name ?? undefined },
        });
      } catch (emailError) {
        console.error("Delivery email error:", emailError);
      }
    }

    toast({ title: `Rendelés státusza: ${statusLabel(status)}` });
    fetchOrders();
  };

  const updateProcurementStatus = async (orderId: string, procStatus: string) => {
    await supabase.from("orders").update({ procurement_status: procStatus } as any).eq("id", orderId);
    toast({ title: `Beszerzés státusza: ${procurementStatusLabel(procStatus)}` });
    fetchOrders();
  };

  const createProcurementFromOrder = async (order: Order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items as any[]) {
      await supabase.from("admin_procurement_orders").insert({
        product_name: item.name || "Termék",
        supplier_name: "Meghatározandó",
        quantity: item.quantity || 1,
        unit_cost: 0,
        selling_price: item.price || 0,
        currency: "HUF",
        payment_method: "bank_card",
        linked_order_id: order.id,
      } as any);
    }
    await supabase.from("orders").update({ procurement_status: "ordered" } as any).eq("id", order.id);
    toast({ title: "Beszerzés létrehozva!", description: "A rendelés tételeihez beszerzési igények lettek rögzítve." });
    fetchOrders();
  };

  // ─── Save Settings ───
  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { id, ...payload } = settings;
    const { error } = await supabase.from("store_settings").update(payload as any).eq("id", id);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Beállítások mentve!" });
    }
    setSavingSettings(false);
  };

  // Wrapper for product image gallery with its own state
  const ProductImageGalleryWrapper = ({ productId }: { productId: string }) => {
    const [images, setImages] = useState<any[]>([]);
    const fetchImgs = async () => {
      const { data } = await supabase.from("product_images").select("*").eq("product_id", productId).order("sort_order");
      if (data) setImages(data);
    };
    useEffect(() => { fetchImgs(); }, [productId]);
    return <ProductImageGallery productId={productId} images={images} onImagesChange={fetchImgs} />;
  };

  useEffect(() => {
    if (isAdmin) {
      supabase.from("admin_procurement_orders").select("unit_cost, quantity, selling_price, profit_amount, linked_order_id").then(({ data }) => {
        if (data) setProcurementForProfit(data);
      });
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // ─── Dashboard stats ───
  const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrders = orders.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const uniqueCustomerEmails = new Set(orders.map(o => (o as any).customer_email?.toLowerCase()).filter(Boolean));
  const totalUsers = Math.max(users.length, uniqueCustomerEmails.size);

  const totalProcurementCost = procurementForProfit.reduce((sum, p) => sum + (p.unit_cost * p.quantity), 0);
  const totalProfit = totalRevenue - totalProcurementCost;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0";
  const pendingProcurement = orders.filter(o => (o as any).procurement_status === "pending").length;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "dashboard", label: "Áttekintés", icon: BarChart3 },
    { key: "products", label: "Termékek", icon: Package },
    { key: "orders", label: "Rendelések", icon: ShoppingBag },
    { key: "coupons", label: "Kuponok", icon: Ticket },
    { key: "users", label: "Felhasználók", icon: Users },
    { key: "reviews", label: "Vélemények", icon: Star },
    { key: "categories", label: "Kategóriák", icon: ListChecks },
    { key: "banners", label: "Bannerek", icon: Image },
    { key: "promotions", label: "Akciók", icon: Gift },
    { key: "giveaway_wheel", label: "Sorsolókerék", icon: Trophy },
    { key: "payment_methods", label: "Fizetés", icon: CreditCard },
    { key: "analytics", label: "Analitika", icon: TrendingUp },
    { key: "email_templates", label: "Email sablonok", icon: Mail },
    { key: "roles", label: "Szerepkörök", icon: Users },
    { key: "shipping_mgmt", label: "Szállítás", icon: Truck },
    { key: "inventory", label: "Készlet", icon: Package },
    { key: "seo_marketing", label: "SEO & Marketing", icon: Search },
    { key: "translations", label: "Nyelvek", icon: Globe },
    { key: "returns", label: "Visszáru", icon: RotateCcw },
    { key: "dynamic_pricing", label: "Árazás", icon: Zap },
    { key: "marketing", label: "Kampányok", icon: Megaphone },
    { key: "ai_marketing_studio", label: "AI Marketing Stúdió", icon: Brain },
    { key: "fb_studio", label: "Facebook Stúdió", icon: FacebookIcon },
    { key: "ig_studio", label: "Instagram Stúdió", icon: InstagramIcon },
    { key: "tt_studio", label: "TikTok Stúdió", icon: Music2 },
    { key: "yt_studio", label: "YouTube Stúdió", icon: YoutubeIcon },
    { key: "yts_studio", label: "YouTube Shorts Stúdió", icon: YoutubeIcon },
    { key: "gads_studio", label: "Google Ads Stúdió", icon: SearchIcon },
    { key: "pin_studio", label: "Pinterest Stúdió", icon: Image },
    { key: "li_studio", label: "LinkedIn Stúdió", icon: LinkedinIcon },
    { key: "x_studio", label: "X (Twitter) Stúdió", icon: TwitterIcon },
    { key: "gdpr", label: "GDPR", icon: Shield },
    { key: "support", label: "Ügyfélszolg.", icon: Headphones },
    { key: "permissions", label: "Jogosultságok", icon: Lock },
    { key: "import_export", label: "Import/Export", icon: FileDown },
    { key: "payment_integrations", label: "Fizetés", icon: CreditCardIcon },
    { key: "financial_center", label: "Pénzügy", icon: Wallet },
    { key: "notifications", label: "Értesítések", icon: Bell },
    { key: "crm", label: "CRM", icon: Users },
    { key: "review_settings", label: "Vélemények", icon: Star },
    { key: "tax_invoice", label: "Adó/Számla", icon: Receipt },
    { key: "affiliate", label: "Affiliate", icon: Link2 },
    { key: "conversion", label: "Konverzió", icon: MousePointerClick },
    { key: "currency", label: "Pénznemek", icon: GlobeIcon },
    { key: "system", label: "Rendszer", icon: Wrench },
    { key: "messages", label: "Üzenetek", icon: Mail },
    { key: "email_automation", label: "E-mail auto.", icon: Mail },
    { key: "api_webhooks", label: "API/Webhook", icon: Key },
    { key: "faq_knowledge", label: "GYIK/Tudásbázis", icon: HelpCircle },
    { key: "advanced_analytics", label: "Analitika+", icon: BarChart3Icon },
    { key: "partner_button_analytics", label: "Partner gomb-analitika", icon: MousePointerClick },
    { key: "fulfillment", label: "Logisztika", icon: Truck },
    { key: "sales_rules", label: "Értékesítés", icon: Zap },
    { key: "product_attributes", label: "Attribútumok", icon: SlidersHorizontal },
    { key: "wishlist", label: "Kívánságlista", icon: Heart },
    { key: "procurement", label: "Beszerzés", icon: ShoppingCart },
    { key: "auto_procurement", label: "Auto-beszerzés", icon: Zap },
    { key: "customer_segmentation", label: "Szegmentáció", icon: Users },
    { key: "product_bundles", label: "Csomagok", icon: Package },
    { key: "social_media", label: "Közösségi", icon: GlobeIcon },
    { key: "delivery_slots", label: "Időablakok", icon: Clock },
    { key: "ab_testing", label: "A/B Teszt", icon: SlidersHorizontal },
    { key: "flash_sale", label: "Flash Sale", icon: Zap },
    { key: "review_rewards", label: "Jutalmak", icon: Star },
    { key: "ticketing", label: "Ticketing", icon: Headphones },
    { key: "loyalty_tiers", label: "Hűségszintek", icon: Star },
    { key: "product_scheduling", label: "Ütemezés", icon: Clock },
    { key: "advanced_discounts", label: "Kedvezmények+", icon: Zap },
    { key: "accounting", label: "Könyvelés", icon: Receipt },
    { key: "ai_bookkeeper", label: "AI Könyvelő", icon: Brain },
    { key: "ai_knowledge_base", label: "AI Tudásbázis", icon: Brain },
    { key: "ai_brain_review", label: "AI Agy Review", icon: Brain },
    { key: "ai_meta_learn", label: "AI Meta-tanulás", icon: Brain },
    { key: "multilang", label: "Nyelvek", icon: Globe },
    { key: "email_templates_custom", label: "E-mail sablonok", icon: Mail },
    { key: "attribution", label: "Csatornák", icon: MousePointerClick },
    { key: "popup_banners", label: "Popup/Banner", icon: MonitorSmartphone },
    { key: "price_rules", label: "Árszabályok", icon: Clock },
    { key: "supplier_mgmt", label: "Beszállítók", icon: Factory },
    { key: "loyalty_gamification", label: "Gamifikáció", icon: Trophy },
    { key: "product_feed", label: "Feed kezelő", icon: Rss },
    { key: "customer_group_pricing", label: "Csoport árazás", icon: Users },
    { key: "advanced_seo", label: "Haladó SEO", icon: Search },
    { key: "erp_sync", label: "ERP szinkron", icon: Database },
    { key: "auto_reorder", label: "Auto újrarendelés", icon: RefreshCw },
    { key: "multichannel", label: "Többcsatornás", icon: Globe2 },
    { key: "quality_assurance", label: "Minőségbizt.", icon: ShieldCheck },
    { key: "loyalty_analytics", label: "Hűség analytics", icon: TrendingUp },
    { key: "preorder_mgmt", label: "Előrendelés", icon: ShoppingCart },
    { key: "packaging_custom", label: "Csomagolás", icon: Package },
    { key: "invoice_automation", label: "Számlázás auto", icon: FileText },
    { key: "nps", label: "NPS / Elégedettség", icon: MessageSquare },
    { key: "checkout_custom", label: "Checkout testr.", icon: ShoppingCart },
    { key: "recommendation_engine", label: "Ajánló motor", icon: Sparkles },
    { key: "gdpr_center", label: "GDPR központ", icon: Shield },
    { key: "webhook_events", label: "Webhookok", icon: Link2 },
    { key: "inventory_forecast", label: "Készlet előrej.", icon: TrendingUp },
    { key: "order_automation", label: "Rend. autom.", icon: Zap },
    { key: "order_insights", label: "Rend. AI", icon: Sparkles },
    { key: "launch_center", label: "Launch Center", icon: Rocket },
    { key: "media_manager", label: "Média kezelő", icon: Image },
    { key: "retention", label: "Visszatérők", icon: Heart },
    { key: "review_moderation", label: "Vélemény mod.", icon: MessageSquare },
    { key: "multi_warehouse", label: "Többraktár", icon: Factory },
    { key: "product_seo", label: "Termék SEO", icon: SearchIcon },
    { key: "csat", label: "CSAT", icon: Star },
    { key: "email_sequences", label: "E-mail szekv.", icon: Mail },
    { key: "shipping_zones_mgmt", label: "Száll. zónák", icon: Truck },
    { key: "giftcard_system", label: "Ajándékkártya", icon: Gift },
    { key: "product_recall", label: "Visszahívás", icon: AlertTriangle },
    { key: "loyalty_points_rules", label: "Hűségpontok", icon: Trophy },
    { key: "product_compare", label: "Összehasonlító", icon: SlidersHorizontal },
    { key: "coupon_rules", label: "Kupon szabályok", icon: Ticket },
    { key: "coupons_manager", label: "Kuponok (mód & partner)", icon: Ticket },
    { key: "partners", label: "Partnerek (profil)", icon: Users },
    { key: "tenants", label: "Bérlők (revenue share)", icon: Building2 },
    { key: "tenant_kyc", label: "Bérlő KYC ellenőrzés", icon: ShieldCheck },
    { key: "partner_contracts", label: "Partneri szerződések", icon: ShieldCheck },
    { key: "stock_alert_auto", label: "Készlet riaszt.", icon: Bell },
    { key: "crosssell_upsell", label: "Cross/Upsell", icon: TrendingUp },
    { key: "customer_surveys", label: "Kérdőívek", icon: ListChecks },
    { key: "order_workflow", label: "Rendel. workflow", icon: RefreshCw },
    { key: "product_badges", label: "Badge-ek", icon: Sparkles },
    { key: "product_variants", label: "Variánsok", icon: Layers },
    { key: "loyalty_rewards", label: "Hűség jutalmak", icon: Trophy },
    { key: "order_consolidation", label: "Rend. összevonás", icon: Package },
    { key: "loyalty_automation", label: "Hűség automata", icon: Zap },
    { key: "margin_management", label: "Árrés kezelés", icon: DollarSign },
    { key: "satisfaction_automation", label: "Elégedettség", icon: Star },
    { key: "remarketing_automation", label: "Remarketing", icon: Megaphone },
    { key: "installment_payment", label: "Részletfizetés", icon: CreditCard },
    { key: "product_ranking", label: "Rangsorolás", icon: TrendingUp },
    { key: "ai_product_tagging", label: "AI címkézés", icon: Sparkles },
    { key: "shipping_cost_rules", label: "Száll. költség", icon: Truck },
    { key: "inventory_movement_log", label: "Készletmozgás", icon: Database },
    { key: "loyalty_dashboard", label: "Hűség dashboard", icon: Trophy },
    { key: "dynamic_price_automation", label: "Ár automata", icon: Zap },
    { key: "feedback_campaigns", label: "Visszajelzés", icon: MessageSquare },
    { key: "bundle_deals_mgmt", label: "Csomag akciók", icon: Gift },
    { key: "invoice_generator", label: "Számla gen.", icon: FileText },
    { key: "personalized_recommendations", label: "Ajánlások", icon: Heart },
    { key: "subscribers", label: "Feliratkozók", icon: Bell },
    { key: "legal_center", label: "Jogi központ", icon: Shield },
    { key: "accountant_access" as Tab, label: "Könyvelő hozzáférés", icon: Calculator },
    { key: "settings", label: "Beállítások", icon: Settings },
  ];

  // Mobil gyorselérés: a legfontosabb fülek – AI Marketing + Jogi + Adó kiemelten
  const primaryTabKeys: Tab[] = ["ai_marketing_studio", "ai_knowledge_base", "products", "orders", "ai_bookkeeper", "legal_center", "tax_invoice", "accounting", "settings"];
  const primaryTabs = primaryTabKeys
    .map((k) => tabs.find((t) => t.key === k))
    .filter((t): t is { key: Tab; label: string; icon: any } => Boolean(t));

  const marketingStudioKeys: Tab[] = ["ai_studio_recorder", "fb_studio", "ig_studio", "tt_studio", "yt_studio", "yts_studio", "gads_studio", "pin_studio", "li_studio", "x_studio"];
  const marketingStudioTabs = marketingStudioKeys
    .map((k) => tabs.find((t) => t.key === k) || (k === "ai_studio_recorder" ? { key: k, label: "★ Saját AI Stúdió", icon: Sparkles } : null))
    .filter((t): t is { key: Tab; label: string; icon: any } => Boolean(t));
  const visibleTabs = tabs.filter((t) => !marketingStudioKeys.includes(t.key));

  const openMarketingStudio = (platformKey: Tab = marketingStudioTab) => {
    setMarketingStudioTab(platformKey);
    setTab("ai_marketing_studio");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const jumpToLegal = () => {
    setTab("settings");
    setSettingsSection("legal");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  // ─── Analytics calculations ───
  const ordersByStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ordersByMonth = orders.reduce((acc, o) => {
    const month = new Date(o.created_at).toLocaleDateString("hu-HU", { year: "numeric", month: "short" });
    if (!acc[month]) acc[month] = { count: 0, revenue: 0 };
    acc[month].count += 1;
    acc[month].revenue += o.total_amount;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const topProducts = [...products].sort((a, b) => b.stock - a.stock).slice(0, 5);
  const lowStockProducts = products.filter(p => p.stock <= (settings?.low_stock_threshold || 5) && p.is_active);
  const paymentBreakdown = orders.reduce((acc, o) => {
    const method = o.payment_method || "ismeretlen";
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredUsers = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.city || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderMarketingStudio = () => {
    const current = marketingStudioTabs.find((t) => t.key === marketingStudioTab) || marketingStudioTabs[0];
    const renderCurrent = () => {
      switch (marketingStudioTab) {
        case "ig_studio": return <AdminInstagramStudioTab />;
        case "tt_studio": return <AdminTiktokStudioTab />;
        case "yt_studio": return <AdminYoutubeStudioTab />;
        case "yts_studio": return <AdminYoutubeShortsStudioTab />;
        case "gads_studio": return <AdminGoogleAdsStudioTab />;
        case "pin_studio": return <AdminPinterestStudioTab />;
        case "li_studio": return <AdminLinkedinStudioTab />;
        case "x_studio": return <AdminTwitterStudioTab />;
        case "ai_studio_recorder": return <AdminAiStudioRecorder />;
        case "fb_studio":
        default:
          return <AdminFacebookStudioTab />;
      }
    };

    return (
      <div className="space-y-4">
        <div className="border-2 border-primary bg-primary/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">AI Marketing Stúdió központ</div>
              <h2 className="mt-1 text-lg font-black uppercase tracking-wider text-foreground">{current?.label || "Facebook Stúdió"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Válassz platformot: minden platform saját reklám-, tartalom- és videó eszközkészletet nyit meg.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-9 md:min-w-[60%]">
              {marketingStudioTabs.map(t => (
                <button
                  key={`inside-marketing-${t.key}`}
                  onClick={() => openMarketingStudio(t.key)}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 border px-2 py-2 text-[10px] font-black uppercase tracking-wider leading-tight text-center transition-colors ${
                    marketingStudioTab === t.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/40 bg-card text-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  <t.icon className="h-4 w-4 shrink-0" />
                  <span className="line-clamp-2">{t.label.replace(" Stúdió", "")}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderCurrent()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold uppercase tracking-wider text-foreground">
              Admin Panel
            </span>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-accent">
            Szuper Admin
          </span>
          <Button
            size="sm"
            onClick={() => openMarketingStudio()}
            className="h-9 rounded-none px-3 text-[10px] font-black uppercase tracking-wider"
          >
            <Brain className="mr-1 h-3.5 w-3.5" /> AI Marketing
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-3">
          {/* ⚖️ JOGI + ÁFA MEGA KIEMELT SÁV — minden képernyőn látható */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => openMarketingStudio()}
              className={`group relative flex items-center justify-between gap-3 border-2 px-4 py-3 text-left transition-all sm:col-span-2 ${
                tab === "ai_marketing_studio" || marketingStudioKeys.includes(tab)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary bg-primary/10 text-foreground hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center border border-current">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
                    AI · REKLÁM · VIDEÓ EDITOR
                  </div>
                  <div className="text-sm font-black uppercase tracking-wider truncate">
                    AI Marketing Stúdió — 40 eszköz/platform
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 shrink-0 hidden sm:inline">
                Facebook · Instagram · TikTok · Google Ads
              </span>
            </button>
            <button
              onClick={() => setTab("legal_center")}
              className={`group relative flex items-center justify-between gap-3 border-2 px-4 py-3 text-left transition-all ${
                tab === "legal_center"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-foreground bg-foreground text-background hover:bg-accent hover:border-accent hover:text-accent-foreground"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center border border-current">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
                    GDPR · EU · MAGYAR
                  </div>
                  <div className="text-sm font-black uppercase tracking-wider truncate">
                    Jogi Központ
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 shrink-0 hidden sm:inline">
                ÁSZF · GDPR · Cookie · Elállás
              </span>
            </button>
            <button
              onClick={() => setTab("tax_invoice")}
              className={`group relative flex items-center justify-between gap-3 border-2 px-4 py-3 text-left transition-all ${
                tab === "tax_invoice"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-accent bg-accent/10 text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center border border-current">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
                    ÁFA · NAV · SZÁMLÁZÁS
                  </div>
                  <div className="text-sm font-black uppercase tracking-wider truncate">
                    Adó &amp; Számla
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 shrink-0 hidden sm:inline">
                27% · AAM · Fordított adózás
              </span>
            </button>
          </div>

          {/* Globális admin szekció kereső (Ctrl+K) */}
          <AdminSectionSearch
            tabs={visibleTabs as any}
            currentKey={tab}
            onSelect={(k) => {
              setTab(k as Tab);
              setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
            }}
          />




          <div className="grid grid-cols-3 gap-2 sm:hidden">
            {primaryTabs.map(t => (
              <button
                key={`primary-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 border px-2 py-2 text-[10px] font-bold uppercase tracking-wider leading-tight text-center transition-colors ${
                  tab === t.key
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4 shrink-0" />
                <span className="line-clamp-2">{t.label}</span>
              </button>
            ))}
            <button
              onClick={jumpToLegal}
              className={`col-span-3 flex min-h-12 items-center justify-center gap-2 border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                tab === "settings" && settingsSection === "legal"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-foreground bg-foreground text-background"
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" />
              Jogi / ÁSZF / GDPR
            </button>
          </div>
          <select
            value={tab}
            onChange={(event) => setTab(event.target.value as Tab)}
            className="flex h-11 w-full border border-input bg-card px-3 text-xs font-bold uppercase tracking-wider text-foreground sm:hidden"
            aria-label="Admin menü"
          >
            {visibleTabs.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <div className="flex gap-0 overflow-x-auto">
            {visibleTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6">

        {/* ─── DASHBOARD TAB ─── */}
        {tab === "dashboard" && (
          <>
            <AdminDashboardEnhanced
              orders={orders}
              products={products}
              totalRevenue={totalRevenue}
              totalOrders={totalOrders}
              totalUsers={totalUsers}
              totalProfit={totalProfit}
              profitMargin={profitMargin}
              onViewOrder={(id) => setSelectedOrderId(id)}
            />
            <AdminVisitorAnalytics />
          </>
        )}

        {/* ─── PRODUCTS TAB ─── */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Termékek ({products.length})</h2>
              <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditProduct(createEmptyProductDraft()); setShowProductForm(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Új termék
              </Button>
            </div>

            {/* Bulk Import */}
            <AdminBulkProductImport onImportDone={fetchProducts} />

            {/* Link Import */}
            <ProductLinkImport
              onProductImported={async (p) => {
                const payload = {
                  name: p.name.trim(),
                  description: p.description.trim() || null,
                  price: Number(p.price) || 0,
                  category: p.category || "Egyéb",
                  image_url: p.image_url,
                  is_active: true,
                  stock: p.stock,
                  sizes: p.sizes,
                  colors: p.colors,
                };

                if (!payload.name) {
                  throw new Error("A termék neve kötelező.");
                }

                const { error } = await supabase.from("shop_products").insert(payload);
                if (error) {
                  throw new Error(error.message);
                }

                await fetchProducts();
              }}
              onBatchImported={fetchProducts}
            />

            {showProductForm && editProduct && (
              <div className="border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider">{editProduct.id ? "Szerkesztés" : "Új termék"}</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowProductForm(false); setEditProduct(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image Upload */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Termék kép</Label>
                  <div className="mt-2 flex items-start gap-4">
                    {editProduct.image_url ? (
                      <div className="relative group">
                        <img src={editProduct.image_url} alt="Termék" className="h-24 w-24 object-cover border" />
                        <button
                          onClick={() => setEditProduct({ ...editProduct, image_url: null })}
                          className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 w-24 border border-dashed flex items-center justify-center text-muted-foreground">
                        <Image className="h-8 w-8" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-none text-xs uppercase tracking-wider"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        {uploading ? "Feltöltés..." : "Kép feltöltés"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground">vagy adj meg URL-t alább</p>
                      <Input
                        value={editProduct.image_url || ""}
                        onChange={e => setEditProduct({ ...editProduct, image_url: e.target.value })}
                        placeholder="https://..."
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Név *</Label>
                    <Input value={editProduct.name || ""} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kategória</Label>
                    <select
                      value={editProduct.category || "Egyéb"}
                      onChange={e => setEditProduct({ ...editProduct, category: e.target.value })}
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ár (Ft) *</Label>
                    <Input type="number" value={editProduct.price ?? ""} onChange={e => setEditProduct({ ...editProduct, price: e.target.value === "" ? 0 : Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Eredeti ár (Ft)</Label>
                    <Input type="number" value={editProduct.original_price ?? ""} onChange={e => setEditProduct({ ...editProduct, original_price: e.target.value === "" ? null : Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Készlet</Label>
                    <Input type="number" value={editProduct.stock ?? 0} onChange={e => setEditProduct({ ...editProduct, stock: e.target.value === "" ? 0 : Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Méretek (kattints a kívántakra)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {["XS","S","M","L","XL","XXL","XXXL","One Size","34","36","38","40","42","44"].map(s => {
                        const active = (editProduct.sizes || []).includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              const cur = editProduct.sizes || [];
                              setEditProduct({ ...editProduct, sizes: active ? cur.filter(x => x !== s) : [...cur, s] });
                            }}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-all ${active ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-foreground/40"}`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    <Input
                      value={(editProduct.sizes || []).filter(s => !["XS","S","M","L","XL","XXL","XXXL","One Size","34","36","38","40","42","44"].includes(s)).join(", ")}
                      onChange={e => {
                        const presets = (editProduct.sizes || []).filter(s => ["XS","S","M","L","XL","XXL","XXXL","One Size","34","36","38","40","42","44"].includes(s));
                        const customs = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                        setEditProduct({ ...editProduct, sizes: [...presets, ...customs] });
                      }}
                      className="mt-2 text-xs"
                      placeholder="Egyedi méretek vesszővel (opcionális)"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Színek</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {["Fekete","Fehér","Szürke","Bézs","Barna","Kék","Piros","Zöld","Sárga","Rózsaszín","Lila","Narancs"].map(c => {
                        const active = (editProduct.colors || []).includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              const cur = editProduct.colors || [];
                              setEditProduct({ ...editProduct, colors: active ? cur.filter(x => x !== c) : [...cur, c] });
                            }}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-all ${active ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-foreground/40"}`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                    <Input
                      value={(editProduct.colors || []).filter(c => !["Fekete","Fehér","Szürke","Bézs","Barna","Kék","Piros","Zöld","Sárga","Rózsaszín","Lila","Narancs"].includes(c)).join(", ")}
                      onChange={e => {
                        const presets = (editProduct.colors || []).filter(c => ["Fekete","Fehér","Szürke","Bézs","Barna","Kék","Piros","Zöld","Sárga","Rózsaszín","Lila","Narancs"].includes(c));
                        const customs = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                        setEditProduct({ ...editProduct, colors: [...presets, ...customs] });
                      }}
                      className="mt-2 text-xs"
                      placeholder="Egyedi színek vesszővel (opcionális)"
                    />
                  </div>

                  {/* ─── Szín × Méret darabszám mátrix ─── */}
                  {(editProduct.colors?.length || 0) > 0 && (editProduct.sizes?.length || 0) > 0 && (
                    <div className="md:col-span-2 border-2 border-accent/40 bg-accent/5 p-3 rounded-md">
                      <Label className="text-xs uppercase tracking-wider text-accent font-bold mb-1 block">
                        🎯 Darabszám szín × méret szerint
                      </Label>
                      <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider">
                        Írd be / léptetsd a darabszámot minden cellába. Az összesítés automatikusan frissíti a fenti Készlet mezőt.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr>
                              <th className="border border-border bg-muted p-1.5 text-left uppercase tracking-wider text-[10px]">Szín \ Méret</th>
                              {(editProduct.sizes || []).map((s: string) => (
                                <th key={s} className="border border-border bg-muted p-1.5 text-center uppercase tracking-wider text-[10px] min-w-[80px]">{s}</th>
                              ))}
                              <th className="border border-border bg-accent/20 p-1.5 text-center uppercase tracking-wider text-[10px]">Σ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(editProduct.colors || []).map((c: string) => {
                              const ep: any = editProduct;
                              const matrix: Record<string, Record<string, number>> = ep._stockMatrix || {};
                              const rowSum = (editProduct.sizes || []).reduce((acc: number, s: string) => acc + Number(matrix?.[c]?.[s] || 0), 0);
                              return (
                                <tr key={c}>
                                  <td className="border border-border bg-muted/50 p-1.5 font-bold uppercase tracking-wider text-[10px]">{c}</td>
                                  {(editProduct.sizes || []).map((s: string) => {
                                    const val = Number(matrix?.[c]?.[s] || 0);
                                    const setVal = (n: number) => {
                                      const safe = Math.max(0, Math.floor(n));
                                      const next: Record<string, Record<string, number>> = { ...((editProduct as any)._stockMatrix || {}) };
                                      next[c] = { ...(next[c] || {}), [s]: safe };
                                      let total = 0;
                                      for (const row of Object.values(next)) {
                                        for (const v of Object.values(row || {})) total += Number(v || 0);
                                      }
                                      setEditProduct({ ...(editProduct as any), _stockMatrix: next, stock: total });
                                    };
                                    const out = val === 0;
                                    const low = val > 0 && val < 5;
                                    return (
                                      <td key={s} className={`border border-border p-1 ${out ? "bg-destructive/10" : low ? "bg-yellow-500/10" : ""}`}>
                                        <div className="flex flex-col gap-1">
                                          <Input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            value={val}
                                            onFocus={(e) => e.currentTarget.select()}
                                            onChange={(e) => setVal(Number(e.target.value) || 0)}
                                            className={`h-9 text-center text-base font-bold ${out ? "text-destructive border-destructive" : low ? "border-yellow-500" : ""}`}
                                          />
                                          <div className="flex gap-0.5">
                                            <button type="button" onClick={() => setVal(val - 1)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-border hover:bg-muted">−</button>
                                            <button type="button" onClick={() => setVal(val + 1)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-border hover:bg-muted">+</button>
                                          </div>
                                          <div className="flex gap-0.5">
                                            <button type="button" onClick={() => setVal(val + 5)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-accent/50 text-accent hover:bg-accent/10">+5</button>
                                            <button type="button" onClick={() => setVal(val + 10)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-accent/50 text-accent hover:bg-accent/10">+10</button>
                                            <button type="button" onClick={() => setVal(0)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-destructive/50 text-destructive hover:bg-destructive/10">0</button>
                                          </div>
                                          {out && <div className="text-[9px] text-destructive font-bold text-center uppercase">Elfogyott</div>}
                                          {low && <div className="text-[9px] text-yellow-600 font-bold text-center uppercase">Kevés</div>}
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td className="border border-border bg-accent/10 p-1.5 text-center font-bold">{rowSum}</td>
                                </tr>
                              );
                            })}
                            <tr>
                              <td className="border border-border bg-accent/20 p-1.5 font-bold uppercase tracking-wider text-[10px]">Σ Méret</td>
                              {(editProduct.sizes || []).map((s: string) => {
                                const matrix: Record<string, Record<string, number>> = (editProduct as any)._stockMatrix || {};
                                const colSum = (editProduct.colors || []).reduce((acc: number, c: string) => acc + Number(matrix?.[c]?.[s] || 0), 0);
                                return <td key={s} className="border border-border bg-accent/10 p-1.5 text-center font-bold">{colSum}</td>;
                              })}
                              <td className="border border-border bg-accent/30 p-1.5 text-center font-bold text-accent">
                                {(() => {
                                  const matrix: Record<string, Record<string, number>> = (editProduct as any)._stockMatrix || {};
                                  let total = 0;
                                  for (const row of Object.values(matrix)) {
                                    for (const v of Object.values(row || {})) total += Number(v || 0);
                                  }
                                  return total;
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        💡 A darabszámok mentéskor a variánsok közé kerülnek és külön-külön nyomon követhetők (méret + szín szerint).
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Leírás</Label>
                    <textarea
                      value={editProduct.description || ""}
                      onChange={e => setEditProduct({ ...editProduct, description: e.target.value })}
                      className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Termék összetétel — Miből van */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                    📦 Termék összetétel — Miből van
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Anyag / Összetétel</Label>
                      <textarea
                        value={editProduct.material || ""}
                        onChange={e => setEditProduct({ ...editProduct, material: e.target.value })}
                        placeholder="Pl. 95% pamut, 5% elasztán"
                        className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mosási / ápolási útmutató</Label>
                      <textarea
                        value={editProduct.care_instructions || ""}
                        onChange={e => setEditProduct({ ...editProduct, care_instructions: e.target.value })}
                        placeholder="Pl. 30°C-on mosható, ne centrifugázd, vasalás közepes hőfokon"
                        className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Származási ország</Label>
                      <Input value={editProduct.origin_country || ""} onChange={e => setEditProduct({ ...editProduct, origin_country: e.target.value })} placeholder="Pl. Magyarország" className="mt-1 h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gyártó</Label>
                      <Input value={editProduct.manufacturer || ""} onChange={e => setEditProduct({ ...editProduct, manufacturer: e.target.value })} placeholder="Pl. Egyszerű de Nagyszerű Műhely" className="mt-1 h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tömeg (gramm)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editProduct.weight_grams ?? ""}
                        onChange={e => setEditProduct({ ...editProduct, weight_grams: e.target.value === "" ? null : Number(e.target.value) })}
                        placeholder="Pl. 220"
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    💡 Ezek a mezők megjelennek a webshop termék oldalán is, hogy a vásárlók tudják, miből van a termék.
                  </p>
                </div>
                {/* Launch / Pre-order állapot */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                    <Rocket className="h-3.5 w-3.5" /> Launch állapot
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Állapot</Label>
                      <select
                        value={editProduct.launch_status || "live"}
                        onChange={e => setEditProduct({ ...editProduct, launch_status: e.target.value })}
                        className="w-full mt-1 h-9 px-3 text-xs bg-background border border-input rounded-md"
                      >
                        <option value="live">🟢 Élő (aktívan vásárolható)</option>
                        <option value="coming_soon">🔵 Hamarosan (teaser, sneak peek)</option>
                        <option value="pre_order">🟣 Előrendelhető (foglalóval)</option>
                        <option value="waitlist">🟡 Várólistás (csak email gyűjtés)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Megjelenés dátuma</Label>
                      <Input
                        type="datetime-local"
                        value={editProduct.launch_date ? new Date(editProduct.launch_date).toISOString().slice(0, 16) : ""}
                        onChange={e => setEditProduct({ ...editProduct, launch_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    {(editProduct.launch_status === "pre_order" || editProduct.launch_status === "coming_soon") && (
                      <>
                        <div className="flex items-center justify-between md:col-span-2 border-t pt-3">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={editProduct.preorder_enabled ?? false} onChange={e => setEditProduct({ ...editProduct, preorder_enabled: e.target.checked })} className="rounded" />
                            Előrendelés engedélyezése
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={editProduct.is_sneak_peek ?? false} onChange={e => setEditProduct({ ...editProduct, is_sneak_peek: e.target.checked })} className="rounded" />
                            Sneak peek (homályos kép, szavazás)
                          </label>
                        </div>
                        {editProduct.preorder_enabled && (
                          <>
                            <div>
                              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Foglaló (%)</Label>
                              <Input type="number" min={0} max={100} value={editProduct.preorder_deposit_percent ?? 20} onChange={e => setEditProduct({ ...editProduct, preorder_deposit_percent: Number(e.target.value) })} className="mt-1 h-9 text-xs" />
                            </div>
                            <div>
                              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max előrendelés (db)</Label>
                              <Input type="number" min={0} value={editProduct.preorder_limit ?? ""} onChange={e => setEditProduct({ ...editProduct, preorder_limit: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Korlátlan" className="mt-1 h-9 text-xs" />
                            </div>
                          </>
                        )}
                        <div className="md:col-span-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Teaser leírás (féligazság)</Label>
                          <textarea
                            value={editProduct.teaser_description || ""}
                            onChange={e => setEditProduct({ ...editProduct, teaser_description: e.target.value })}
                            placeholder="Kelts kíváncsiságot, ne áruld el a részleteket..."
                            className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Teaser kép URL (opcionális, blur effekttel jelenik meg)</Label>
                          <Input value={editProduct.teaser_image_url || ""} onChange={e => setEditProduct({ ...editProduct, teaser_image_url: e.target.value })} placeholder="https://..." className="mt-1 h-9 text-xs" />
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    💡 A részletes szerkesztéshez (galéria, méret-szín mátrix, méret-táblázat) használd a <strong>Launch Center</strong> fület.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={editProduct.is_active ?? true} onChange={e => setEditProduct({ ...editProduct, is_active: e.target.checked })} className="rounded" />
                    Látható a shopban
                  </label>
                </div>
                <Button className="rounded-none uppercase tracking-wider text-xs" onClick={saveProduct} disabled={savingProduct || uploading}>
                  {savingProduct ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />} {savingProduct ? "Mentés..." : "Mentés"}
                </Button>

                {/* Multi-image gallery for existing products */}
                {editProduct.id && (
                  <ProductImageGalleryWrapper productId={editProduct.id} />
                )}
              </div>
            )}

            <div className="space-y-2">
              {products.map(p => (
                <div key={p.id} className="flex items-center gap-3 border bg-card p-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-14 w-14 object-cover border flex-shrink-0" />
                  ) : (
                    <div className="h-14 w-14 border flex items-center justify-center text-muted-foreground flex-shrink-0">
                      <Image className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                      {!p.is_active && <span className="text-[9px] font-bold uppercase tracking-widest text-destructive">Inaktív</span>}
                      {p.launch_status === "coming_soon" && <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500 border border-blue-500/30 px-1.5 py-0.5">Hamarosan</span>}
                      {p.launch_status === "pre_order" && <span className="text-[9px] font-bold uppercase tracking-widest text-accent border border-accent/30 px-1.5 py-0.5">Előrendelhető</span>}
                      {p.launch_status === "waitlist" && <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5">Várólista</span>}
                      {p.preorder_enabled && <span className="text-[9px] font-bold uppercase tracking-widest text-purple-500">Pre-order ON</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{p.category}</span>
                      <span className="font-semibold text-accent">{p.price.toLocaleString()} Ft</span>
                      <span>Készlet: {p.stock}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                      // Variánsok betöltése a mátrixhoz
                      const matrix: Record<string, Record<string, number>> = {};
                      try {
                        const { data: vars } = await supabase.from("product_variants").select("color,size,stock").eq("product_id", p.id);
                        (vars || []).forEach((v: any) => {
                          const c = v.color || "—";
                          const s = v.size || "—";
                          if (!matrix[c]) matrix[c] = {};
                          matrix[c][s] = Number(v.stock || 0);
                        });
                      } catch (err) { console.error("variant load failed", err); }
                      setEditProduct({ ...p, _stockMatrix: matrix } as any);
                      setShowProductForm(true);
                    }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek termékek.</p>
              )}
            </div>
          </div>
        )}

        {/* ─── ORDERS TAB — 3 RENDSZER ─── */}
        {tab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold uppercase tracking-wider">Rendelés központ</h2>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none uppercase tracking-wider text-[10px] h-7 px-2"
                  onClick={() => { fetchOrders(); toast({ title: "Frissítve" }); }}
                >
                  ↻ Frissítés
                </Button>
                <div className="text-xs text-muted-foreground">
                  Bevétel: <span className="font-semibold text-accent">{totalRevenue.toLocaleString()} Ft</span>
                </div>
              </div>
            </div>

            {/* SUB-TAB SWITCHER — 3 színkódolt kártya */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setOrdersSubTab("live")}
                className={`border p-3 text-left transition-all ${ordersSubTab === "live" ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Élő</span>
                </div>
                <div className="text-2xl font-bold">{orders.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Rendelés</div>
              </button>
              <button
                onClick={() => setOrdersSubTab("preorder")}
                className={`border p-3 text-left transition-all ${ordersSubTab === "preorder" ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-purple-500/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">🟣 Előrendelés</span>
                </div>
                <div className="text-2xl font-bold">{preorders.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Foglaló</div>
              </button>
              <button
                onClick={() => setOrdersSubTab("waitlist")}
                className={`border p-3 text-left transition-all ${ordersSubTab === "waitlist" ? "border-yellow-500 bg-yellow-500/10" : "border-border hover:border-yellow-500/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">🟡 Várólista</span>
                </div>
                <div className="text-2xl font-bold">{waitlistEntries.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</div>
              </button>
            </div>

            {/* ─── 1. ÉLŐ RENDELÉSEK ─── */}
            {ordersSubTab === "live" && (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o.id} className="border bg-card p-4 space-y-3 cursor-pointer hover:border-accent/30 transition-colors" onClick={() => setSelectedOrderId(o.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono">#{o.id.slice(0, 8)}</span>
                        <span className="text-sm font-semibold text-accent">{o.total_amount.toLocaleString()} Ft</span>
                        {o.discount_amount && o.discount_amount > 0 && (
                          <span className="text-[10px] text-green-400">-{o.discount_amount.toLocaleString()} Ft</span>
                        )}
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-widest font-medium text-foreground/60">Ki rendelte</p>
                        <p>{o.shipping_name || "—"}</p>
                        {o.shipping_phone && <p>📱 {o.shipping_phone}</p>}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-widest font-medium text-foreground/60">Cím</p>
                        <p>{[o.shipping_zip, o.shipping_city, o.shipping_address].filter(Boolean).join(", ") || "—"}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-widest font-medium text-foreground/60">Fizetés</p>
                        <p>{o.payment_method === "cash" ? "Készpénz" : o.payment_method === "card" ? "Bankkártya" : o.payment_method === "cod" ? "Utánvét" : o.payment_method || "—"}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-widest font-medium text-foreground/60">Dátum</p>
                        <p>{new Date(o.created_at).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      {o.coupon_code && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-widest font-medium text-foreground/60">Kupon</p>
                          <p className="font-mono text-accent">{o.coupon_code}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap pt-1 border-t border-border/50" onClick={e => e.stopPropagation()}>
                      {["pending", "processing", "packed", "shipped", "delivered", "cancelled"].map(s => (
                        <button
                          key={s}
                          onClick={() => updateOrderStatus(o.id, s)}
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
                            o.status === s ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:border-foreground/30"
                          }`}
                        >
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/50" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Beszerzés:</span>
                      <ProcurementBadge status={(o as any).procurement_status || "pending"} />
                      {(!(o as any).procurement_status || (o as any).procurement_status === "pending") && (
                        <Button size="sm" variant="outline" className="rounded-none text-[10px] uppercase tracking-wider h-6 px-2" onClick={() => createProcurementFromOrder(o)}>
                          🛒 Beszerzés indítása
                        </Button>
                      )}
                      {(o as any).procurement_status && (o as any).procurement_status !== "pending" && (
                        <div className="flex gap-1">
                          {["ordered", "shipped", "received", "delivered"].map(ps => (
                            <button
                              key={ps}
                              onClick={() => updateProcurementStatus(o.id, ps)}
                              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border transition-colors ${
                                (o as any).procurement_status === ps ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:border-foreground/30"
                              }`}
                            >
                              {procurementStatusLabel(ps)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek élő rendelések.</p>
                )}
              </div>
            )}

            {/* ─── 2. ELŐRENDELÉSEK ─── */}
            {ordersSubTab === "preorder" && (
              <div className="space-y-3">
                <div className="border border-purple-500/30 bg-purple-500/5 p-3 text-xs text-muted-foreground">
                  🟣 <span className="font-bold text-purple-400">Előrendelések</span> — Foglalóval lefoglalt termékek. Készlet érkezésekor értesítsd a vásárlókat és válts át "kész"-re.
                </div>
                {preorders.map((p: any) => {
                  const product = p.shop_products;
                  const statusColors: Record<string, string> = {
                    pending: "text-yellow-500 border-yellow-500/30",
                    confirmed: "text-blue-500 border-blue-500/30",
                    paid: "text-green-500 border-green-500/30",
                    ready: "text-accent border-accent/30",
                    shipped: "text-purple-500 border-purple-500/30",
                    cancelled: "text-destructive border-destructive/30",
                  };
                  return (
                    <div key={p.id} className="border bg-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {product?.image_url && <img src={product.image_url} alt="" className="h-12 w-12 object-cover border" />}
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{product?.name || "Ismeretlen termék"}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">#{p.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] uppercase tracking-widest border px-2 py-0.5 ${statusColors[p.status] || "text-muted-foreground border-border"}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div><p className="text-[10px] uppercase text-muted-foreground">Vásárló</p><p className="truncate">{p.customer_name || p.customer_email}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Mennyiség</p><p className="font-bold">{p.quantity} db</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Variáns</p><p>{[p.selected_size, p.selected_color].filter(Boolean).join(" / ") || "—"}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Foglaló</p><p className="font-bold text-purple-400">{Number(p.deposit_amount).toLocaleString()} Ft</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Teljes ár</p><p className="font-bold text-accent">{Number(p.total_amount).toLocaleString()} Ft</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Telefon</p><p>{p.customer_phone || "—"}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Dátum</p><p>{new Date(p.created_at).toLocaleDateString("hu-HU")}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Értesítve</p><p>{p.notified_at ? "✓" : "—"}</p></div>
                      </div>
                      {p.notes && (
                        <div className="border border-purple-500/30 bg-purple-500/5 p-3 space-y-1">
                          <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">📍 Szállítási cím / Megjegyzés</p>
                          <p className="text-xs whitespace-pre-wrap break-words">{p.notes}</p>
                          {(() => {
                            const m = String(p.notes).match(/Cím:\s*(.+)$/);
                            if (!m) return null;
                            const addr = m[1].trim();
                            return (
                              <button
                                onClick={() => { navigator.clipboard.writeText(addr); toast({ title: "Cím másolva" }); }}
                                className="text-[10px] uppercase tracking-wider text-accent hover:underline mt-1"
                              >
                                📋 Cím másolása
                              </button>
                            );
                          })()}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
                        {["pending", "confirmed", "paid", "ready", "shipped", "cancelled"].map(s => (
                          <button
                            key={s}
                            onClick={async () => {
                              await supabase.from("product_preorders").update({ status: s }).eq("id", p.id);
                              toast({ title: `Státusz: ${s}` });
                              fetchOrders();
                            }}
                            className={`text-[10px] uppercase tracking-wider px-2 py-1 border transition-colors ${
                              p.status === s ? "bg-purple-500 text-white font-bold border-purple-500" : "text-muted-foreground hover:border-foreground/30"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                        {!p.notified_at && (
                          <Button size="sm" variant="outline" className="rounded-none text-[10px] uppercase tracking-wider h-6 px-2 ml-auto" onClick={async () => {
                            await supabase.from("product_preorders").update({ notified_at: new Date().toISOString() }).eq("id", p.id);
                            toast({ title: "Megjelölve értesítettként" });
                            fetchOrders();
                          }}>
                            ✉️ Értesítés
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {preorders.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek előrendelések.</p>
                )}
              </div>
            )}

            {/* ─── 3. VÁRÓLISTA ─── */}
            {ordersSubTab === "waitlist" && (
              <div className="space-y-3">
                <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-muted-foreground">
                  🟡 <span className="font-bold text-yellow-500">Várólista</span> — Email gyűjtés érdeklődő vásárlókról. Megosztásokkal előrébb sorolva.
                </div>
                {waitlistEntries.map((w: any) => {
                  const product = w.shop_products;
                  return (
                    <div key={w.id} className="border bg-card p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {product?.image_url && <img src={product.image_url} alt="" className="h-10 w-10 object-cover border" />}
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{product?.name || "Ismeretlen termék"}</p>
                            <p className="text-xs text-muted-foreground truncate">{w.email}{w.name ? ` · ${w.name}` : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {w.early_access && <span className="text-[9px] uppercase tracking-widest text-accent border border-accent/30 px-1.5 py-0.5">Early Access</span>}
                          <span className="text-[10px] uppercase tracking-widest text-yellow-500 border border-yellow-500/30 px-2 py-0.5 font-bold">#{(w.position || 0) - (w.boost_position || 0)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div><p className="text-[10px] uppercase text-muted-foreground">Pozíció</p><p className="font-bold">#{w.position || "—"}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Boost</p><p className="text-green-400 font-bold">-{w.boost_position || 0}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Megosztások</p><p className="font-bold">{w.shares_count || 0}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Forrás</p><p>{w.source || "—"}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Csatlakozott</p><p>{new Date(w.created_at).toLocaleDateString("hu-HU")}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Értesítve</p><p>{w.notified_at ? "✓" : "—"}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Konvertált</p><p>{w.converted_at ? "✓" : "—"}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-foreground">Share kód</p><p className="font-mono text-[10px] truncate">{w.share_code || "—"}</p></div>
                      </div>
                      <div className="flex gap-1 pt-2 border-t border-border/50">
                        {!w.notified_at && (
                          <Button size="sm" variant="outline" className="rounded-none text-[10px] uppercase tracking-wider h-6 px-2" onClick={async () => {
                            await supabase.from("product_waitlist").update({ notified_at: new Date().toISOString() }).eq("id", w.id);
                            toast({ title: "Értesítés megjelölve" });
                            fetchOrders();
                          }}>
                            ✉️ Értesítés
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="rounded-none text-[10px] uppercase tracking-wider h-6 px-2 text-destructive" onClick={async () => {
                          if (!confirm("Törlöd a várólistából?")) return;
                          await supabase.from("product_waitlist").delete().eq("id", w.id);
                          toast({ title: "Törölve" });
                          fetchOrders();
                        }}>
                          🗑️ Törlés
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {waitlistEntries.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek várólistás érdeklődők.</p>
                )}
              </div>
            )}
          </div>
        )}


        {/* ─── COUPONS TAB ─── */}
        {tab === "coupons" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Kuponok ({coupons.length})</h2>
              <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditCoupon({}); setShowCouponForm(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Új kupon
              </Button>
            </div>

            {showCouponForm && editCoupon && (
              <div className="border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider">{editCoupon.id ? "Szerkesztés" : "Új kupon"}</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowCouponForm(false); setEditCoupon(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kuponkód *</Label>
                    <Input value={editCoupon.code || ""} onChange={e => setEditCoupon({ ...editCoupon, code: e.target.value.toUpperCase() })} className="mt-1 uppercase" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Leírás</Label>
                    <Input value={editCoupon.description || ""} onChange={e => setEditCoupon({ ...editCoupon, description: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kedvezmény %</Label>
                    <Input type="number" value={editCoupon.discount_percent || ""} onChange={e => setEditCoupon({ ...editCoupon, discount_percent: Number(e.target.value) })} className="mt-1" placeholder="pl. 10" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kedvezmény összeg (Ft)</Label>
                    <Input type="number" value={editCoupon.discount_amount || ""} onChange={e => setEditCoupon({ ...editCoupon, discount_amount: Number(e.target.value) })} className="mt-1" placeholder="pl. 2000" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max felhasználás (db)</Label>
                    <Input type="number" value={editCoupon.max_uses || ""} onChange={e => setEditCoupon({ ...editCoupon, max_uses: Number(e.target.value) })} className="mt-1" placeholder="pl. 100" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Érvényes eddig</Label>
                    <Input type="date" value={editCoupon.valid_until || ""} onChange={e => setEditCoupon({ ...editCoupon, valid_until: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={editCoupon.is_active ?? true} onChange={e => setEditCoupon({ ...editCoupon, is_active: e.target.checked })} className="rounded" />
                    Aktív
                  </label>
                </div>
                <Button className="rounded-none uppercase tracking-wider text-xs" onClick={saveCoupon}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Mentés
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {coupons.map(c => {
                const isExpired = c.valid_until && new Date(c.valid_until) < new Date();
                const usedUp = c.max_uses && (c.used_count || 0) >= c.max_uses;
                return (
                  <div key={c.id} className={`border bg-card p-4 ${isExpired || usedUp ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold font-mono text-accent">{c.code}</span>
                          {!c.is_active && <span className="text-[9px] font-bold uppercase tracking-widest text-destructive border border-destructive/30 px-1.5 py-0.5">Inaktív</span>}
                          {isExpired && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border border-muted px-1.5 py-0.5">Lejárt</span>}
                          {usedUp && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border border-muted px-1.5 py-0.5">Elfogyott</span>}
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          {c.discount_percent && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              <span className="font-semibold text-foreground">{c.discount_percent}%</span> kedvezmény
                            </span>
                          )}
                          {c.discount_amount && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span className="font-semibold text-foreground">{c.discount_amount.toLocaleString()} Ft</span> kedvezmény
                            </span>
                          )}
                          {c.max_uses && (
                            <span>
                              Darab: <span className="font-semibold text-foreground">{c.used_count || 0}/{c.max_uses}</span>
                            </span>
                          )}
                          {c.valid_until && (
                            <span>
                              Eddig: <span className="font-semibold text-foreground">{new Date(c.valid_until).toLocaleDateString("hu-HU")}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditCoupon(c); setShowCouponForm(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCoupon(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {coupons.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek kuponok.</p>
              )}
            </div>
          </div>
        )}

        {/* ─── USERS TAB ─── */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Felhasználók ({filteredUsers.length})</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Keresés név, email, város..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border bg-card p-3 text-center">
                <p className="text-xl font-bold text-accent">{filteredUsers.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Összes</p>
              </div>
              <div className="border bg-card p-3 text-center">
                <p className="text-xl font-bold text-foreground">{filteredUsers.filter(u => orders.some(o => (o as any).customer_email?.toLowerCase() === u.email?.toLowerCase())).length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vásárlók</p>
              </div>
              <div className="border bg-card p-3 text-center">
                <p className="text-xl font-bold text-foreground">{filteredUsers.filter(u => u.user_id).length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Regisztrált</p>
              </div>
            </div>
            <div className="space-y-2">
              {filteredUsers.map(u => {
                const userOrders = orders.filter(o => (o as any).customer_email?.toLowerCase() === u.email?.toLowerCase());
                const totalSpent = userOrders.reduce((s, o) => s + o.total_amount, 0);
                return (
                  <div key={u.id} className="border bg-card p-4 cursor-pointer hover:border-accent/30 transition-colors" onClick={() => setSelectedUser(u)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-foreground">{u.display_name || "Névtelen"}</span>
                        {u.email && <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("hu-HU")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {u.phone && <span>📱 {u.phone}</span>}
                      {u.city && <span>📍 {u.city}</span>}
                      {userOrders.length > 0 && (
                        <span className="text-accent font-semibold">🛒 {userOrders.length} rendelés · {totalSpent.toLocaleString()} Ft</span>
                      )}
                      {u.preferred_payment && <span>💳 {u.preferred_payment}</span>}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Nincs találat.</p>
              )}
            </div>
          </div>
        )}

        {/* ─── REVIEWS TAB ─── */}
        {tab === "reviews" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider">Vásárlói vélemények ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek vélemények.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => {
                  const product = products.find(p => p.id === r.product_id);
                  return (
                    <div key={r.id} className="border bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-foreground">{product?.name || "Ismeretlen termék"}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${r.is_approved ? "text-green-400 border-green-400/30" : "text-yellow-500 border-yellow-500/30"}`}>
                            {r.is_approved ? "Jóváhagyva" : "Várakozik"}
                          </span>
                        </div>
                      </div>
                      {r.title && <p className="text-sm font-medium text-foreground">{r.title}</p>}
                      {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                      {r.admin_reply && (
                        <div className="border-l-2 border-accent pl-3 mt-2">
                          <p className="text-[10px] uppercase tracking-wider text-accent font-bold">Admin válasz:</p>
                          <p className="text-xs text-muted-foreground">{r.admin_reply}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        {!r.is_approved && (
                          <Button size="sm" variant="outline" className="rounded-none text-xs h-7" onClick={() => approveReview(r.id, true)}>
                            <Check className="h-3 w-3 mr-1" /> Jóváhagy
                          </Button>
                        )}
                        {r.is_approved && (
                          <Button size="sm" variant="outline" className="rounded-none text-xs h-7" onClick={() => approveReview(r.id, false)}>
                            <X className="h-3 w-3 mr-1" /> Elutasít
                          </Button>
                        )}
                        {replyingReview === r.id ? (
                          <div className="flex-1 flex gap-2">
                            <Input
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="Válasz írása..."
                              className="text-xs h-7"
                            />
                            <Button size="sm" className="rounded-none text-xs h-7" onClick={() => saveAdminReply(r.id)}>
                              Mentés
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-none text-xs h-7" onClick={() => { setReplyingReview(null); setReplyText(""); }}>
                              Mégse
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="rounded-none text-xs h-7" onClick={() => { setReplyingReview(r.id); setReplyText(r.admin_reply || ""); }}>
                            <MessageSquare className="h-3 w-3 mr-1" /> Válasz
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="rounded-none text-xs h-7 text-destructive" onClick={() => deleteReview(r.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── CATEGORIES TAB ─── */}
        {tab === "categories" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Kategóriák</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(categories, "kategoriak")}>
                  Exportálás
                </Button>
                <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditCategory({ is_active: true, sort_order: 0 }); setShowCategoryForm(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Új kategória
                </Button>
              </div>
            </div>

            {showCategoryForm && editCategory && (
              <div className="border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider">{editCategory.id ? "Kategória szerkesztése" : "Új kategória"}</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowCategoryForm(false); setEditCategory(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Név</Label>
                    <Input value={editCategory.name || ""} onChange={e => setEditCategory({ ...editCategory, name: e.target.value })} className="mt-1" placeholder="pl. Pólók" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slug (URL)</Label>
                    <Input value={editCategory.slug || ""} onChange={e => setEditCategory({ ...editCategory, slug: e.target.value })} className="mt-1" placeholder="auto-generált" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kép URL</Label>
                    <Input value={editCategory.image_url || ""} onChange={e => setEditCategory({ ...editCategory, image_url: e.target.value })} className="mt-1" placeholder="https://..." />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sorrend</Label>
                    <Input type="number" value={editCategory.sort_order || 0} onChange={e => setEditCategory({ ...editCategory, sort_order: Number(e.target.value) })} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editCategory.is_active ?? true} onChange={e => setEditCategory({ ...editCategory, is_active: e.target.checked })} className="h-4 w-4 accent-accent" />
                    <span className="text-xs">Aktív</span>
                  </label>
                  <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={saveCategory}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Mentés
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between border p-4 hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-3">
                    {cat.image_url && <img src={cat.image_url} alt={cat.name} className="h-10 w-10 object-cover border" />}
                    <div>
                      <span className="text-sm font-semibold">{cat.name}</span>
                      <p className="text-xs text-muted-foreground">/{cat.slug} · Sorrend: {cat.sort_order}</p>
                    </div>
                    {!cat.is_active && <span className="text-[10px] uppercase tracking-widest text-muted-foreground border px-2 py-0.5">Inaktív</span>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditCategory(cat); setShowCategoryForm(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Még nincsenek kategóriák.</p>}
            </div>
          </div>
        )}

        {/* ─── BANNERS TAB ─── */}
        {tab === "banners" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Főoldal bannerek</h2>
              <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditBanner({ is_active: true, sort_order: 0, button_text: "Vásárlás" }); setShowBannerForm(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Új banner
              </Button>
            </div>

            {showBannerForm && editBanner && (
              <div className="border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider">{editBanner.id ? "Banner szerkesztése" : "Új banner"}</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowBannerForm(false); setEditBanner(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cím</Label>
                    <Input value={editBanner.title || ""} onChange={e => setEditBanner({ ...editBanner, title: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Alcím</Label>
                    <Input value={editBanner.subtitle || ""} onChange={e => setEditBanner({ ...editBanner, subtitle: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kép URL</Label>
                    <Input value={editBanner.image_url || ""} onChange={e => setEditBanner({ ...editBanner, image_url: e.target.value })} className="mt-1" placeholder="https://..." />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Link URL</Label>
                    <Input value={editBanner.link_url || ""} onChange={e => setEditBanner({ ...editBanner, link_url: e.target.value })} className="mt-1" placeholder="/shop" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gomb szöveg</Label>
                    <Input value={editBanner.button_text || ""} onChange={e => setEditBanner({ ...editBanner, button_text: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sorrend</Label>
                    <Input type="number" value={editBanner.sort_order || 0} onChange={e => setEditBanner({ ...editBanner, sort_order: Number(e.target.value) })} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editBanner.is_active ?? true} onChange={e => setEditBanner({ ...editBanner, is_active: e.target.checked })} className="h-4 w-4 accent-accent" />
                    <span className="text-xs">Aktív</span>
                  </label>
                  <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={saveBanner}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Mentés
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {banners.map(b => (
                <div key={b.id} className="flex items-center justify-between border p-4 hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-3">
                    {b.image_url && <img src={b.image_url} alt={b.title} className="h-12 w-20 object-cover border" />}
                    <div>
                      <span className="text-sm font-semibold">{b.title}</span>
                      {b.subtitle && <p className="text-xs text-muted-foreground">{b.subtitle}</p>}
                      <p className="text-xs text-muted-foreground">Sorrend: {b.sort_order} · {b.link_url || "nincs link"}</p>
                    </div>
                    {!b.is_active && <span className="text-[10px] uppercase tracking-widest text-muted-foreground border px-2 py-0.5">Inaktív</span>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditBanner(b); setShowBannerForm(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBanner(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {banners.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Még nincsenek bannerek.</p>}
            </div>
          </div>
        )}

        {/* ─── PROMOTIONS TAB ─── */}
        {tab === "promotions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Akciók / Csomagajánlatok</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(promotions, "akciok")}>
                  Exportálás
                </Button>
                <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditPromotion({ is_active: true, promo_type: "percentage", min_quantity: 1, min_order_amount: 0, discount_value: 0, applicable_categories: [] }); setShowPromotionForm(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Új akció
                </Button>
              </div>
            </div>

            {showPromotionForm && editPromotion && (
              <div className="border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider">{editPromotion.id ? "Akció szerkesztése" : "Új akció"}</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowPromotionForm(false); setEditPromotion(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Akció neve</Label>
                    <Input value={editPromotion.name || ""} onChange={e => setEditPromotion({ ...editPromotion, name: e.target.value })} className="mt-1" placeholder="pl. Nyári akció" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Típus</Label>
                    <select
                      value={editPromotion.promo_type || "percentage"}
                      onChange={e => setEditPromotion({ ...editPromotion, promo_type: e.target.value })}
                      className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="percentage">Százalékos kedvezmény</option>
                      <option value="fixed">Fix összegű kedvezmény</option>
                      <option value="bundle">Csomagajánlat</option>
                      <option value="buy_x_get_y">X-et veszek Y-t kapok</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kedvezmény értéke ({editPromotion.promo_type === "percentage" ? "%" : "Ft"})</Label>
                    <Input type="number" value={editPromotion.discount_value || 0} onChange={e => setEditPromotion({ ...editPromotion, discount_value: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Min. darabszám</Label>
                    <Input type="number" value={editPromotion.min_quantity || 1} onChange={e => setEditPromotion({ ...editPromotion, min_quantity: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Min. rendelési összeg</Label>
                    <Input type="number" value={editPromotion.min_order_amount || 0} onChange={e => setEditPromotion({ ...editPromotion, min_order_amount: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Érvényesség vége</Label>
                    <Input type="date" value={editPromotion.valid_until?.slice(0, 10) || ""} onChange={e => setEditPromotion({ ...editPromotion, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Leírás</Label>
                    <Textarea value={editPromotion.description || ""} onChange={e => setEditPromotion({ ...editPromotion, description: e.target.value })} className="mt-1 rounded-none min-h-[60px] text-xs" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editPromotion.is_active ?? true} onChange={e => setEditPromotion({ ...editPromotion, is_active: e.target.checked })} className="h-4 w-4 accent-accent" />
                    <span className="text-xs">Aktív</span>
                  </label>
                  <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={savePromotion}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Mentés
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {promotions.map(promo => {
                const typeLabels: Record<string, string> = {
                  percentage: "Százalékos",
                  fixed: "Fix összeg",
                  bundle: "Csomag",
                  buy_x_get_y: "X+Y",
                };
                return (
                  <div key={promo.id} className="flex items-center justify-between border p-4 hover:border-foreground/20 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{promo.name}</span>
                        <span className="text-[10px] uppercase tracking-widest border px-2 py-0.5 text-muted-foreground">{typeLabels[promo.promo_type] || promo.promo_type}</span>
                        {!promo.is_active && <span className="text-[10px] uppercase tracking-widest text-muted-foreground border px-2 py-0.5">Inaktív</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {promo.promo_type === "percentage" ? `${promo.discount_value}%` : `${promo.discount_value} Ft`} kedvezmény
                        {promo.min_quantity > 1 ? ` · Min. ${promo.min_quantity} db` : ""}
                        {promo.min_order_amount > 0 ? ` · Min. ${promo.min_order_amount} Ft` : ""}
                        {promo.valid_until ? ` · Érvényes: ${new Date(promo.valid_until).toLocaleDateString("hu-HU")}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditPromotion(promo); setShowPromotionForm(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePromotion(promo.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {promotions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Még nincsenek akciók.</p>}
            </div>
          </div>
        )}

        {/* ─── DATA EXPORT (accessible from dashboard) ─── */}
        {tab === "dashboard" && (
          <div className="border bg-card p-5 space-y-4 mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Adat exportálás
            </h3>
            <p className="text-xs text-muted-foreground">Töltsd le az adatokat CSV formátumban.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(products, "termekek")}>
                Termékek
              </Button>
              <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(orders, "rendelesek")}>
                Rendelések
              </Button>
              <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(users, "felhasznalok")}>
                Felhasználók
              </Button>
              <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(coupons, "kuponok")}>
                Kuponok
              </Button>
            </div>
          </div>
        )}

        {/* ─── PAYMENT METHODS TAB ─── */}
        {tab === "payment_methods" && settings && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-wider">Fizetési módok kezelése</h2>
            <p className="text-xs text-muted-foreground">Engedélyezd vagy tiltsd le a rendelkezésre álló fizetési módokat a vásárlóid számára.</p>

            <div className="space-y-3">
              {paymentMethods.map(pm => (
                <label key={pm.key} className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-accent" />
                    <div>
                      <span className="text-sm font-semibold text-foreground">{pm.label}</span>
                      <p className="text-xs text-muted-foreground">{pm.description}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={pm.is_active}
                    onChange={e => togglePaymentMethod(pm.key, e.target.checked)}
                    className="h-5 w-5 rounded border-2 accent-accent"
                  />
                </label>
              ))}
            </div>

            <div className="border bg-card p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                Fizetési információk
              </h3>
              <p className="text-xs text-muted-foreground">
                A bankkártyás fizetés esetén csak a kártyabirtokos nevét és az utolsó 4 számjegyet tároljuk biztonsági referenciaként. 
                Online fizetési átjáró integrációjához keresse az ügyfélszolgálatot.
              </p>
              {settings.invoice_bank_account && (
                <div className="border-l-2 border-accent pl-3">
                  <p className="text-[10px] uppercase tracking-widest text-accent font-bold">Bankszámla átutaláshoz</p>
                  <p className="text-sm font-mono text-foreground">{settings.invoice_bank_account}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ANALYTICS TAB ─── */}
        {tab === "analytics" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-wider">Analitika & Statisztikák</h2>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border bg-card p-4">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Össz. bevétel</span>
                <p className="text-xl font-bold text-accent mt-1">{totalRevenue.toLocaleString()} Ft</p>
              </div>
              <div className="border bg-card p-4">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Átlagos kosárérték</span>
                <p className="text-xl font-bold text-foreground mt-1">{avgOrderValue.toLocaleString()} Ft</p>
              </div>
              <div className="border bg-card p-4">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Konverziós arány</span>
                <p className="text-xl font-bold text-foreground mt-1">{totalUsers > 0 ? ((totalOrders / totalUsers) * 100).toFixed(1) : 0}%</p>
              </div>
              <div className="border bg-card p-4">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Aktív termékek</span>
                <p className="text-xl font-bold text-foreground mt-1">{activeProducts}</p>
              </div>
            </div>

            {/* Orders by status */}
            <div className="border bg-card p-5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider">Rendelések státusz szerint</h3>
              <div className="space-y-2">
                {Object.entries(ordersByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{count}</span>
                      <div className="w-32 h-2 bg-muted overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${(count / totalOrders) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly revenue */}
            <div className="border bg-card p-5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider">Havi bevétel</h3>
              <div className="space-y-2">
                {Object.entries(ordersByMonth).slice(-6).map(([month, data]) => (
                  <div key={month} className="flex items-center justify-between border-b border-border/30 pb-2 last:border-0">
                    <span className="text-xs text-muted-foreground">{month}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-accent">{data.revenue.toLocaleString()} Ft</span>
                      <span className="text-xs text-muted-foreground ml-2">({data.count} db)</span>
                    </div>
                  </div>
                ))}
                {Object.keys(ordersByMonth).length === 0 && <p className="text-xs text-muted-foreground">Még nincs adat.</p>}
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="border bg-card p-5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider">Fizetési módok eloszlása</h3>
              <div className="space-y-2">
                {Object.entries(paymentBreakdown).map(([method, count]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span className="text-xs text-foreground">{method === "cash" ? "Készpénz" : method === "card" ? "Bankkártya" : method === "cod" ? "Utánvét" : method}</span>
                    <span className="text-sm font-bold text-foreground">{count} db ({totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(0) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Low stock warnings */}
            {lowStockProducts.length > 0 && (
              <div className="border border-destructive/30 bg-card p-5 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Alacsony készletű termékek ({lowStockProducts.length})
                </h3>
                <div className="space-y-2">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{p.name}</span>
                      <span className="font-bold text-destructive">{p.stock} db</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(products, "termekek")}>
                Termékek export
              </Button>
              <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(orders, "rendelesek")}>
                Rendelések export
              </Button>
              <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(users, "felhasznalok")}>
                Felhasználók export
              </Button>
              <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => exportToCSV(coupons, "kuponok")}>
                Kuponok export
              </Button>
            </div>
          </div>
        )}

        {/* ─── EMAIL TEMPLATES TAB ─── */}
        {tab === "email_templates" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-wider">Email sablonok</h2>
            <p className="text-xs text-muted-foreground">{"Szerkeszd az automatikus email értesítések tartalmát. Használj változókat: {name}, {orderId}, {total}, {storeName}, {resetLink}"}</p>

            <div className="space-y-4">
              {emailTemplates.map(tmpl => {
                const templateLabels: Record<string, string> = {
                  order_confirmation: "Rendelés visszaigazolás",
                  shipping_notification: "Szállítási értesítés",
                  registration_welcome: "Regisztrációs üdvözlés",
                  password_reset: "Jelszó visszaállítás",
                };
                return (
                  <div key={tmpl.key} className="border bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-accent" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">{templateLabels[tmpl.key] || tmpl.key}</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-none text-xs"
                        onClick={() => setEditingTemplate(editingTemplate === tmpl.key ? null : tmpl.key)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        {editingTemplate === tmpl.key ? "Bezár" : "Szerkesztés"}
                      </Button>
                    </div>

                    {editingTemplate === tmpl.key ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tárgy</Label>
                          <Input
                            value={tmpl.subject}
                            onChange={e => setEmailTemplates(prev => prev.map(t => t.key === tmpl.key ? { ...t, subject: e.target.value } : t))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szövegtörzs</Label>
                          <Textarea
                            value={tmpl.body}
                            onChange={e => setEmailTemplates(prev => prev.map(t => t.key === tmpl.key ? { ...t, body: e.target.value } : t))}
                            className="mt-1 rounded-none min-h-[180px] text-xs font-mono"
                          />
                        </div>
                        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => {
                          setEditingTemplate(null);
                          toast({ title: "Email sablon mentve!" });
                        }}>
                          <Save className="h-3.5 w-3.5 mr-1" /> Mentés
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Tárgy:</span> {tmpl.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{tmpl.body}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ROLES TAB ─── */}
        {tab === "roles" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-wider">Felhasználói szerepkörök</h2>
            <p className="text-xs text-muted-foreground">Admin és moderátor jogosultságok kiosztása. A user_id-t a Felhasználók fülön találod.</p>

            {/* Add role */}
            <div className="border bg-card p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider">Új szerepkör hozzáadása</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">User ID</Label>
                  <Input
                    value={newRoleUserId}
                    onChange={e => setNewRoleUserId(e.target.value)}
                    className="mt-1"
                    placeholder="Felhasználó UUID"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szerepkör</Label>
                  <select
                    value={newRoleType}
                    onChange={e => setNewRoleType(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderátor</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button className="rounded-none uppercase tracking-wider text-xs" onClick={addUserRole}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Hozzáadás
                  </Button>
                </div>
              </div>
            </div>

            {/* Roles list */}
            <div className="space-y-2">
              {userRoles.map(ur => {
                const user = users.find(u => u.id === ur.user_id);
                return (
                  <div key={ur.id} className="flex items-center justify-between border bg-card p-4">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{user?.display_name || user?.email || ur.user_id.slice(0, 12) + "..."}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${ur.role === "admin" ? "text-accent border-accent/30" : "text-blue-400 border-blue-400/30"}`}>
                          {ur.role === "admin" ? "Admin" : "Moderátor"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{ur.user_id.slice(0, 8)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeUserRole(ur.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              {userRoles.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek kiosztott szerepkörök.</p>
              )}
            </div>
          </div>
        )}

        {tab === "giveaway_wheel" && (
          <div className="space-y-6">
            <GiveawayPrizeManager />
            <div className="border-t border-border pt-6">
              <GiveawayWheel />
            </div>
          </div>
        )}
        {tab === "shipping_mgmt" && <AdminShippingTab />}
        {tab === "inventory" && <AdminInventoryTab />}
        {tab === "seo_marketing" && <AdminSeoMarketingTab />}
        {tab === "translations" && <AdminTranslationsTab />}
        {tab === "returns" && <AdminReturnsTab />}
        {tab === "dynamic_pricing" && <AdminDynamicPricingTab />}
        {tab === "marketing" && <AdminMarketingTab />}
        {tab === "ai_marketing_studio" && renderMarketingStudio()}
        {tab === "gdpr" && <AdminGdprTab />}
        {tab === "support" && <AdminSupportTab />}
        {tab === "permissions" && <AdminPermissionsTab />}
        {tab === "import_export" && <AdminImportExportTab />}
        {tab === "payment_integrations" && <AdminPaymentIntegrationsTab />}
        {tab === "financial_center" && <AdminFinancialCenterTab />}
        {tab === "notifications" && <AdminNotificationsTab />}
        {tab === "crm" && <AdminCrmTab />}
        {tab === "review_settings" && <AdminReviewSettingsTab />}
        {tab === "tax_invoice" && <AdminTaxInvoiceTab />}
        {tab === "legal_center" && <AdminLegalCenterTab />}
        {tab === "accountant_access" && <AdminAccountantAccessTab />}
        {tab === "affiliate" && <AdminAffiliateTab />}
        {tab === "conversion" && <AdminConversionTab />}
        {tab === "currency" && <AdminCurrencyTab />}
        {tab === "system" && <AdminSystemTab />}
        {tab === "email_automation" && <AdminEmailCenterTab />}
        {tab === "email_monitoring" && <AdminEmailMonitoringTab />}
        {tab === "messages" && <AdminInboxTab />}
        {tab === "order_insights" && <AdminOrderInsightsTab />}
        {tab === "launch_center" && <AdminLaunchCenterTab />}
        {tab === "api_webhooks" && <AdminApiWebhookTab />}
        {tab === "faq_knowledge" && <AdminFaqKnowledgeTab />}
        {tab === "advanced_analytics" && <AdminAdvancedAnalyticsTab />}
        {tab === "partner_button_analytics" && <AdminPartnerButtonAnalyticsTab />}
        {tab === "fulfillment" && <AdminFulfillmentTab />}
        {tab === "sales_rules" && <AdminSalesRulesTab />}
        {tab === "product_attributes" && <AdminProductAttributesTab />}
        {tab === "wishlist" && <AdminWishlistTab />}
        {tab === "procurement" && <AdminProcurementTab />}
        {tab === "auto_procurement" && <AdminAutoProcurementTab />}
        {tab === "customer_segmentation" && <AdminCustomerSegmentationTab />}
        {tab === "product_bundles" && <AdminProductBundlesTab />}
        {tab === "social_media" && <AdminSocialMediaTab />}
        {tab === "delivery_slots" && <AdminDeliverySlotsTab />}
        {tab === "ab_testing" && <AdminAbTestingTab />}
        {tab === "flash_sale" && <AdminFlashSaleTab />}
        {tab === "review_rewards" && <AdminReviewRewardsTab />}
        {tab === "ticketing" && <AdminTicketingTab />}
        {tab === "loyalty_tiers" && <AdminLoyaltyTiersTab />}
        {tab === "product_scheduling" && <AdminProductSchedulingTab />}
        {tab === "advanced_discounts" && <AdminAdvancedDiscountsTab />}
        {tab === "accounting" && <AdminAccountingTab />}
        {tab === "ai_bookkeeper" && <AdminAiBookkeeperTab />}
        {tab === "ai_knowledge_base" && <AdminAiKnowledgeBaseTab />}
        {tab === "ai_brain_review" && <AdminAiBrainReviewTab />}
        {tab === "ai_meta_learn" && <AdminAiMetaLearnTab />}
        {tab === "multilang" && <AdminMultilangTab />}
        {tab === "email_templates_custom" && <AdminEmailCenterTab />}
        {tab === "attribution" && <AdminAttributionTab />}
        {tab === "popup_banners" && <AdminPopupBannerTab />}
        {tab === "price_rules" && <AdminPriceRulesTab />}
        {tab === "supplier_mgmt" && <AdminSupplierTab />}
        {tab === "loyalty_gamification" && <AdminLoyaltyGamificationTab />}
        {tab === "product_feed" && <AdminProductFeedTab />}
        {tab === "customer_group_pricing" && <AdminCustomerGroupPricingTab />}
        {tab === "advanced_seo" && <AdminAdvancedSeoTab />}
        {tab === "erp_sync" && <AdminErpSyncTab />}
        {tab === "auto_reorder" && <AdminAutoReorderTab />}
        {tab === "multichannel" && <AdminMultichannelTab />}
        {tab === "quality_assurance" && <AdminQualityAssuranceTab />}
        {tab === "loyalty_analytics" && <AdminLoyaltyAnalyticsTab />}
        {tab === "preorder_mgmt" && <AdminPreorderMgmtTab />}
        {tab === "packaging_custom" && <AdminPackagingCustomTab />}
        {tab === "invoice_automation" && <AdminInvoiceAutomationTab />}
        {tab === "nps" && <AdminNpsTab />}
        {tab === "checkout_custom" && <AdminCheckoutCustomTab />}
        {tab === "recommendation_engine" && <AdminRecommendationEngineTab />}
        {tab === "gdpr_center" && <AdminGdprCenterTab />}
        {tab === "webhook_events" && <AdminWebhookEventsTab />}
        {tab === "inventory_forecast" && <AdminInventoryForecastTab />}
        {tab === "order_automation" && <AdminOrderAutomationTab />}
        {tab === "media_manager" && <AdminMediaManagerTab />}
        {tab === "retention" && <AdminRetentionTab />}
        {tab === "review_moderation" && <AdminReviewModerationTab />}
        {tab === "multi_warehouse" && <AdminMultiWarehouseTab />}
        {tab === "product_seo" && <AdminProductSeoTab />}
        {tab === "csat" && <AdminCsatTab />}
        {tab === "email_sequences" && <AdminEmailCenterTab />}
        {tab === "shipping_zones_mgmt" && <AdminShippingZonesMgmtTab />}
        {tab === "giftcard_system" && <AdminGiftcardSystemTab />}
        {tab === "product_recall" && <AdminProductRecallTab />}
        {tab === "loyalty_points_rules" && <AdminLoyaltyPointsRulesTab />}
        {tab === "product_compare" && <AdminProductCompareTab />}
        {tab === "coupon_rules" && <AdminCouponRulesTab />}
        {tab === "coupons_manager" && <AdminCouponsManagerTab />}
        {tab === "partners" && (
          <div className="space-y-3">
            <a href="/admin/partner-approvals" className="inline-flex items-center gap-2 px-4 py-2 border border-foreground/20 hover:bg-accent/10 uppercase text-xs font-bold tracking-widest">
              <Check className="h-4 w-4" /> Partner jóváhagyások (storefront + domain)
            </a>
            <AdminPartnersTab />
          </div>
        )}
        {tab === "tenants" && <AdminTenantsTab />}
        {tab === "tenant_kyc" && <AdminKycTab />}
        {tab === "partner_contracts" && <AdminContractsTab />}
        {tab === "stock_alert_auto" && <AdminStockAlertAutoTab />}
        {tab === "crosssell_upsell" && <AdminCrosssellUpsellTab />}
        {tab === "customer_surveys" && <AdminCustomerSurveysTab />}
        {tab === "order_workflow" && <AdminOrderWorkflowTab />}
        {tab === "product_variants" && <AdminProductVariantsTab />}
        {tab === "loyalty_rewards" && <AdminLoyaltyRewardsTab />}
        {tab === "order_consolidation" && <AdminOrderConsolidationTab />}
        {tab === "loyalty_automation" && <AdminLoyaltyAutomationTab />}
        {tab === "margin_management" && <AdminMarginManagementTab />}
        {tab === "satisfaction_automation" && <AdminSatisfactionAutomationTab />}
        {tab === "remarketing_automation" && <AdminRemarketingAutomationTab />}
        {tab === "installment_payment" && <AdminInstallmentPaymentTab />}
        {tab === "product_ranking" && <AdminProductRankingTab />}
        {tab === "ai_product_tagging" && <AdminAiProductTaggingTab />}
        {tab === "shipping_cost_rules" && <AdminShippingCostRulesTab />}
        {tab === "inventory_movement_log" && <AdminInventoryMovementLogTab />}
        {tab === "loyalty_dashboard" && <AdminLoyaltyDashboardTab />}
        {tab === "dynamic_price_automation" && <AdminDynamicPriceAutomationTab />}
        {tab === "feedback_campaigns" && <AdminFeedbackCampaignsTab />}
        {tab === "bundle_deals_mgmt" && <AdminBundleDealsMgmtTab />}
        {tab === "invoice_generator" && <AdminInvoiceGeneratorTab />}
        {tab === "personalized_recommendations" && <AdminPersonalizedRecommendationsTab />}
        {tab === "subscribers" && <AdminSubscribersTab />}

        {tab === "settings" && settings && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider">Beállítások</h2>
              <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={saveSettings} disabled={savingSettings}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {savingSettings ? "Mentés..." : "Mentés"}
              </Button>
            </div>

            {/* Settings section tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "store" as SettingsSection, label: "Bolt", icon: Store },
                { key: "payment" as SettingsSection, label: "Fizetés", icon: CreditCard },
                { key: "email" as SettingsSection, label: "E-mail", icon: Mail },
                { key: "seo" as SettingsSection, label: "SEO", icon: SearchIcon },
                { key: "appearance" as SettingsSection, label: "Megjelenés", icon: Palette },
                { key: "hours" as SettingsSection, label: "Nyitvatartás", icon: Clock },
                { key: "legal" as SettingsSection, label: "ÁSZF", icon: FileText },
                { key: "statuses" as SettingsSection, label: "Státuszok", icon: ListChecks },
                { key: "templates" as SettingsSection, label: "Sablonok", icon: Ruler },
                { key: "loyalty" as SettingsSection, label: "Hűségprogram", icon: Gift },
                { key: "reviews_config" as SettingsSection, label: "Vélemények", icon: Star },
                { key: "shipping" as SettingsSection, label: "Szállítás", icon: Truck },
                { key: "inventory" as SettingsSection, label: "Készlet", icon: AlertTriangle },
                { key: "notifications" as SettingsSection, label: "Értesítések", icon: Bell },
                { key: "invoicing" as SettingsSection, label: "Számlázás", icon: Receipt },
                { key: "checkout" as SettingsSection, label: "Checkout", icon: ShoppingCart },
                { key: "cookie" as SettingsSection, label: "Cookie", icon: Shield },
                { key: "maintenance" as SettingsSection, label: "Karbantartás", icon: Wrench },
                { key: "popups" as SettingsSection, label: "Popupok", icon: Megaphone },
                { key: "language" as SettingsSection, label: "Nyelv", icon: Globe },
                { key: "discounts" as SettingsSection, label: "Kedvezmények", icon: Zap },
                { key: "product_display" as SettingsSection, label: "Terméklista", icon: Package },
                { key: "registration" as SettingsSection, label: "Regisztráció", icon: Users },
                { key: "analytics" as SettingsSection, label: "Analitika", icon: BarChart3 },
                { key: "payment_config" as SettingsSection, label: "Fizetési módok", icon: CreditCardIcon },
                { key: "shipping_zones" as SettingsSection, label: "Szállítási zónák", icon: Truck },
                { key: "stock_alerts" as SettingsSection, label: "Készlet riasztás", icon: AlertTriangle },
                { key: "appearance_custom" as SettingsSection, label: "Megjelenés+", icon: SlidersHorizontal },
                { key: "coupon_settings" as SettingsSection, label: "Kuponok", icon: Ticket },
                { key: "product_tags" as SettingsSection, label: "Címkék/Szűrők", icon: ListChecks },
                { key: "user_notifications" as SettingsSection, label: "Felh. értesítések", icon: Bell },
                { key: "order_workflow" as SettingsSection, label: "Rendelés folyamat", icon: RotateCcw },
                { key: "compare_settings" as SettingsSection, label: "Összehasonlítás", icon: Search },
                { key: "return_rules" as SettingsSection, label: "Visszáru", icon: RotateCcw },
                { key: "giftcard_settings" as SettingsSection, label: "Ajándékkártyák", icon: Gift },
                { key: "i18n_settings" as SettingsSection, label: "Többnyelvűség", icon: Globe },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setSettingsSection(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wider border transition-colors ${
                    settingsSection === s.key
                      ? "bg-accent text-accent-foreground border-accent"
                      : "text-muted-foreground hover:text-foreground border-border"
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              ))}
            </div>

            {/* ─── Store Settings ─── */}
            {settingsSection === "store" && (
              <div className="space-y-6">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Bolt alapadatok</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bolt neve</Label>
                      <Input value={settings.store_name} onChange={e => setSettings({ ...settings, store_name: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pénznem</Label>
                      <select
                        value={settings.currency}
                        onChange={e => setSettings({ ...settings, currency: e.target.value })}
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="HUF">HUF (Forint)</option>
                        <option value="EUR">EUR (Euró)</option>
                        <option value="USD">USD (Dollár)</option>
                      </select>
                    </div>
                  </div>

                  {/* Logo */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Logó</Label>
                    <div className="mt-2 flex items-center gap-4">
                      {settings.logo_url ? (
                        <div className="relative group">
                          <img src={settings.logo_url} alt="Logó" className="h-16 w-16 object-contain border" />
                          <button
                            onClick={() => setSettings({ ...settings, logo_url: null })}
                            className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="h-16 w-16 border border-dashed flex items-center justify-center text-muted-foreground">
                          <Store className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <Button variant="outline" size="sm" className="rounded-none text-xs uppercase tracking-wider" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          {uploading ? "Feltöltés..." : "Logó feltöltés"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Szállítás</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szállítási díj ({settings.currency})</Label>
                      <Input type="number" value={settings.shipping_fee} onChange={e => setSettings({ ...settings, shipping_fee: Number(e.target.value) })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ingyenes szállítás felett ({settings.currency})</Label>
                      <Input type="number" value={settings.free_shipping_above || ""} onChange={e => setSettings({ ...settings, free_shipping_above: e.target.value ? Number(e.target.value) : null })} className="mt-1" placeholder="pl. 15000" />
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Kapcsolat</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail cím</Label>
                      <Input value={settings.contact_email || ""} onChange={e => setSettings({ ...settings, contact_email: e.target.value })} className="mt-1" placeholder="info@bolt.hu" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefon</Label>
                      <Input value={settings.contact_phone || ""} onChange={e => setSettings({ ...settings, contact_phone: e.target.value })} className="mt-1" placeholder="+36 1 234 5678" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cím</Label>
                      <Input value={settings.contact_address || ""} onChange={e => setSettings({ ...settings, contact_address: e.target.value })} className="mt-1" placeholder="1234 Budapest, Példa utca 1." />
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Közösségi média
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Facebook</Label>
                      <Input value={settings.social_facebook || ""} onChange={e => setSettings({ ...settings, social_facebook: e.target.value })} className="mt-1" placeholder="https://facebook.com/..." />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Instagram</Label>
                      <Input value={settings.social_instagram || ""} onChange={e => setSettings({ ...settings, social_instagram: e.target.value })} className="mt-1" placeholder="https://instagram.com/..." />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">TikTok</Label>
                      <Input value={settings.social_tiktok || ""} onChange={e => setSettings({ ...settings, social_tiktok: e.target.value })} className="mt-1" placeholder="https://tiktok.com/..." />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">YouTube</Label>
                      <Input value={settings.social_youtube || ""} onChange={e => setSettings({ ...settings, social_youtube: e.target.value })} className="mt-1" placeholder="https://youtube.com/..." />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Twitter / X</Label>
                      <Input value={settings.social_twitter || ""} onChange={e => setSettings({ ...settings, social_twitter: e.target.value })} className="mt-1" placeholder="https://x.com/..." />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pinterest</Label>
                      <Input value={settings.social_pinterest || ""} onChange={e => setSettings({ ...settings, social_pinterest: e.target.value })} className="mt-1" placeholder="https://pinterest.com/..." />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Payment Settings ─── */}
            {settingsSection === "payment" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Fizetési módok</h3>
                  <p className="text-xs text-muted-foreground">Válaszd ki, mely fizetési módokat szeretnéd engedélyezni a boltban.</p>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Készpénz</span>
                          <p className="text-xs text-muted-foreground">Személyes átvételkor készpénzes fizetés</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.payment_cash_enabled}
                        onChange={e => setSettings({ ...settings, payment_cash_enabled: e.target.checked })}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>

                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Bankkártya</span>
                          <p className="text-xs text-muted-foreground">Online bankkártyás fizetés</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.payment_card_enabled}
                        onChange={e => setSettings({ ...settings, payment_card_enabled: e.target.checked })}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>

                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Utánvét</span>
                          <p className="text-xs text-muted-foreground">Fizetés a csomag átvételekor</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.payment_cod_enabled}
                        onChange={e => setSettings({ ...settings, payment_cod_enabled: e.target.checked })}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Email Settings ─── */}
            {settingsSection === "email" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">E-mail feladó beállítások</h3>
                  <p className="text-xs text-muted-foreground">Állítsd be, hogy milyen névvel és e-mail címmel kapják a vásárlók az üzeneteket.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Feladó neve</Label>
                      <Input value={settings.sender_name || ""} onChange={e => setSettings({ ...settings, sender_name: e.target.value })} className="mt-1" placeholder="pl. MyShop Webáruház" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Válasz e-mail cím (Reply-To)</Label>
                      <Input value={settings.reply_to_email || ""} onChange={e => setSettings({ ...settings, reply_to_email: e.target.value })} className="mt-1" placeholder="pl. info@mybolt.hu" />
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Automatikus e-mail értesítések</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Rendelés visszaigazolás</span>
                          <p className="text-xs text-muted-foreground">Automatikus e-mail a rendelés leadása után</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={settings.email_order_confirmation} onChange={e => setSettings({ ...settings, email_order_confirmation: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Szállítási értesítés</span>
                          <p className="text-xs text-muted-foreground">E-mail, ha a csomag elküldve státuszba kerül</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={settings.email_shipping_notification} onChange={e => setSettings({ ...settings, email_shipping_notification: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Ticket className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Kupon értesítés</span>
                          <p className="text-xs text-muted-foreground">E-mail új kuponkód létrehozásakor</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={settings.email_coupon_notification} onChange={e => setSettings({ ...settings, email_coupon_notification: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">E-mail sablonok</h3>
                  <p className="text-xs text-muted-foreground">Automatikus e-mail sablonok szerkesztése — a rendszer ezeket küldi a megfelelő eseményekre.</p>

                  <div className="border p-4 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Üdvözlő e-mail</span>
                        <p className="text-xs text-muted-foreground">Regisztráció után automatikusan kiküldött üzenet</p>
                      </div>
                      <input type="checkbox" checked={settings.email_welcome_enabled} onChange={e => setSettings({ ...settings, email_welcome_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    {settings.email_welcome_enabled && (
                      <div className="space-y-2 pt-2 border-t border-dashed">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tárgy</Label>
                          <Input value={settings.email_welcome_subject || ""} onChange={e => setSettings({ ...settings, email_welcome_subject: e.target.value })} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szövegtörzs</Label>
                          <Textarea value={settings.email_welcome_body || ""} onChange={e => setSettings({ ...settings, email_welcome_body: e.target.value })} className="mt-1 rounded-none min-h-[80px]" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border p-4 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Elhagyott kosár emlékeztető</span>
                        <p className="text-xs text-muted-foreground">E-mail, ha a vásárló nem fejezi be a rendelést</p>
                      </div>
                      <input type="checkbox" checked={settings.email_abandoned_cart_enabled} onChange={e => setSettings({ ...settings, email_abandoned_cart_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    {settings.email_abandoned_cart_enabled && (
                      <div className="pt-2 border-t border-dashed">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Késleltetés (óra)</Label>
                        <Input type="number" value={settings.email_abandoned_cart_delay_hours} onChange={e => setSettings({ ...settings, email_abandoned_cart_delay_hours: Number(e.target.value) })} className="mt-1 w-32" min={1} />
                        <p className="text-[10px] text-muted-foreground mt-1">Ennyi óra elteltével kapja meg a vásárló az emlékeztetőt</p>
                      </div>
                    )}
                  </div>

                  <div className="border p-4 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Vélemény kérő e-mail</span>
                        <p className="text-xs text-muted-foreground">Kézbesítés után vélemény kérése a vásárlótól</p>
                      </div>
                      <input type="checkbox" checked={settings.email_review_request_enabled} onChange={e => setSettings({ ...settings, email_review_request_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    {settings.email_review_request_enabled && (
                      <div className="pt-2 border-t border-dashed">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Késleltetés (nap)</Label>
                        <Input type="number" value={settings.email_review_request_delay_days} onChange={e => setSettings({ ...settings, email_review_request_delay_days: Number(e.target.value) })} className="mt-1 w-32" min={1} />
                        <p className="text-[10px] text-muted-foreground mt-1">Ennyi nap elteltével kapja meg a vásárló a vélemény kérést</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-dashed bg-card/50 p-5 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Hírlevél / E-mail kampányok
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A tömeges hírlevél küldéshez egy dedikált e-mail marketing szolgáltatás szükséges (pl. Mailchimp, Brevo, SendGrid).
                  </p>
                </div>
              </div>
            )}

            {/* ─── SEO Settings ─── */}
            {settingsSection === "seo" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <SearchIcon className="h-4 w-4" />
                    Keresőoptimalizálás (SEO)
                  </h3>
                  <p className="text-xs text-muted-foreground">Ezek az adatok segítenek, hogy a boltod jobban megjelenjen a Google keresőben.</p>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Meta cím (max 60 karakter)</Label>
                      <Input value={settings.seo_title || ""} onChange={e => setSettings({ ...settings, seo_title: e.target.value })} className="mt-1" placeholder="pl. MyShop - Prémium divat webáruház" maxLength={60} />
                      <p className="text-[10px] text-muted-foreground mt-1">{(settings.seo_title || "").length}/60 karakter</p>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Meta leírás (max 160 karakter)</Label>
                      <Textarea value={settings.seo_description || ""} onChange={e => setSettings({ ...settings, seo_description: e.target.value })} className="mt-1 rounded-none min-h-[80px]" placeholder="pl. Fedezd fel prémium kollekciónkat!" maxLength={160} />
                      <p className="text-[10px] text-muted-foreground mt-1">{(settings.seo_description || "").length}/160 karakter</p>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kulcsszavak (vesszővel elválasztva)</Label>
                      <Input value={settings.seo_keywords || ""} onChange={e => setSettings({ ...settings, seo_keywords: e.target.value })} className="mt-1" placeholder="pl. divat, webshop, ruha, cipő" />
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Open Graph & Social</h3>
                  <p className="text-xs text-muted-foreground">Ezek az adatok jelennek meg, ha a boltod linkjét megosztják közösségi médiában.</p>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">OG kép URL (megosztási előnézeti kép)</Label>
                      <Input value={settings.seo_og_image_url || ""} onChange={e => setSettings({ ...settings, seo_og_image_url: e.target.value })} className="mt-1" placeholder="https://example.com/og-image.jpg" />
                      <p className="text-[10px] text-muted-foreground mt-1">Ajánlott méret: 1200x630px</p>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Canonical URL</Label>
                      <Input value={settings.seo_canonical_url || ""} onChange={e => setSettings({ ...settings, seo_canonical_url: e.target.value })} className="mt-1" placeholder="https://www.example.com" />
                      <p className="text-[10px] text-muted-foreground mt-1">A fő domain, ha több URL-en is elérhető az oldal</p>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Robots beállítás</Label>
                      <select value={settings.seo_robots || "index, follow"} onChange={e => setSettings({ ...settings, seo_robots: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="index, follow">index, follow (ajánlott)</option>
                        <option value="noindex, follow">noindex, follow</option>
                        <option value="index, nofollow">index, nofollow</option>
                        <option value="noindex, nofollow">noindex, nofollow</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Analitika & Tracking</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Google Analytics mérési azonosító</Label>
                      <Input value={settings.seo_google_analytics_id || ""} onChange={e => setSettings({ ...settings, seo_google_analytics_id: e.target.value })} className="mt-1" placeholder="G-XXXXXXXXXX" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Google Search Console ellenőrző kód</Label>
                      <Input value={settings.seo_search_console_code || ""} onChange={e => setSettings({ ...settings, seo_search_console_code: e.target.value })} className="mt-1" placeholder="google-site-verification=..." />
                    </div>
                  </div>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Structured Data (JSON-LD)</span>
                      <p className="text-xs text-muted-foreground">Termékoldalakhoz automatikus schema.org adatok generálása</p>
                    </div>
                    <input type="checkbox" checked={settings.seo_structured_data_enabled} onChange={e => setSettings({ ...settings, seo_structured_data_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Sitemap generálás</span>
                      <p className="text-xs text-muted-foreground">Automatikus sitemap.xml generálása a keresőmotoroknak</p>
                    </div>
                    <input type="checkbox" checked={settings.seo_sitemap_enabled} onChange={e => setSettings({ ...settings, seo_sitemap_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                </div>
              </div>
            )}

            {/* ─── Appearance Settings ─── */}
            {settingsSection === "appearance" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Színek
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Elsődleges szín</Label>
                      <div className="mt-1 flex items-center gap-3">
                        <input type="color" value={settings.theme_primary_color || "#000000"} onChange={e => setSettings({ ...settings, theme_primary_color: e.target.value })} className="h-10 w-14 border cursor-pointer" />
                        <Input value={settings.theme_primary_color || "#000000"} onChange={e => setSettings({ ...settings, theme_primary_color: e.target.value })} className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kiemelő (accent) szín</Label>
                      <div className="mt-1 flex items-center gap-3">
                        <input type="color" value={settings.theme_accent_color || "#D4AF37"} onChange={e => setSettings({ ...settings, theme_accent_color: e.target.value })} className="h-10 w-14 border cursor-pointer" />
                        <Input value={settings.theme_accent_color || "#D4AF37"} onChange={e => setSettings({ ...settings, theme_accent_color: e.target.value })} className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Háttérszín</Label>
                      <div className="mt-1 flex items-center gap-3">
                        <input type="color" value={settings.theme_bg_color || "#000000"} onChange={e => setSettings({ ...settings, theme_bg_color: e.target.value })} className="h-10 w-14 border cursor-pointer" />
                        <Input value={settings.theme_bg_color || "#000000"} onChange={e => setSettings({ ...settings, theme_bg_color: e.target.value })} className="flex-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Betűtípusok</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Címsor betűtípus</Label>
                      <select value={settings.theme_font_heading || "Space Grotesk"} onChange={e => setSettings({ ...settings, theme_font_heading: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="Space Grotesk">Space Grotesk</option>
                        <option value="Inter">Inter</option>
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Oswald">Oswald</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szövegtörzs betűtípus</Label>
                      <select value={settings.theme_font_body || "Inter"} onChange={e => setSettings({ ...settings, theme_font_body: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="Inter">Inter</option>
                        <option value="Space Grotesk">Space Grotesk</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Lato">Lato</option>
                        <option value="Nunito">Nunito</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Elrendezés & UI</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gomb lekerekítés</Label>
                      <select value={settings.theme_button_radius || "0px"} onChange={e => setSettings({ ...settings, theme_button_radius: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="0px">Szögletes (0px)</option>
                        <option value="4px">Enyhe (4px)</option>
                        <option value="8px">Közepes (8px)</option>
                        <option value="16px">Erős (16px)</option>
                        <option value="9999px">Teljesen lekerekített</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Logó pozíció</Label>
                      <select value={settings.theme_logo_position || "left"} onChange={e => setSettings({ ...settings, theme_logo_position: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="left">Bal oldalon</option>
                        <option value="center">Középen</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fejléc magasság</Label>
                      <select value={settings.theme_header_height || "64px"} onChange={e => setSettings({ ...settings, theme_header_height: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="48px">Kompakt (48px)</option>
                        <option value="64px">Alapértelmezett (64px)</option>
                        <option value="80px">Magas (80px)</option>
                        <option value="96px">Extra magas (96px)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Favicon URL</Label>
                      <Input value={settings.theme_favicon_url || ""} onChange={e => setSettings({ ...settings, theme_favicon_url: e.target.value })} className="mt-1" placeholder="https://example.com/favicon.ico" />
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Lábléc & Egyedi CSS</h3>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lábléc szöveg</Label>
                    <Input value={settings.theme_footer_text || ""} onChange={e => setSettings({ ...settings, theme_footer_text: e.target.value })} className="mt-1" placeholder="© 2026 MyShop - Minden jog fenntartva" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Egyedi CSS (haladó)</Label>
                    <Textarea value={settings.theme_custom_css || ""} onChange={e => setSettings({ ...settings, theme_custom_css: e.target.value })} className="mt-1 rounded-none min-h-[100px] font-mono text-xs" placeholder=".my-class { color: gold; }" />
                    <p className="text-[10px] text-muted-foreground mt-1">⚠️ Csak haladó felhasználóknak — helytelen CSS megjelenítési hibákat okozhat</p>
                  </div>
                </div>

                <div className="border border-dashed bg-card/50 p-4">
                  <p className="text-xs text-muted-foreground">
                    <strong>Előnézet:</strong> A szín- és betűtípus módosítások a mentés és az oldal újratöltése után lépnek érvénybe.
                  </p>
                </div>
              </div>
            )}

            {/* ─── Business Hours Settings ─── */}
            {settingsSection === "hours" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Nyitvatartási idők
                  </h3>
                  <p className="text-xs text-muted-foreground">Állítsd be a bolt nyitvatartási idejét. Ezek az adatok megjelennek a webshopban.</p>
                  <div className="space-y-2">
                    {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map(day => {
                      const dayLabels: Record<string, string> = {
                        monday: "Hétfő", tuesday: "Kedd", wednesday: "Szerda",
                        thursday: "Csütörtök", friday: "Péntek", saturday: "Szombat", sunday: "Vasárnap"
                      };
                      const hours = settings.business_hours || {} as BusinessHours;
                      const dayData = hours[day] || { open: "09:00", close: "17:00", closed: false };
                      const updateDay = (field: string, value: string | boolean) => {
                        setSettings({
                          ...settings,
                          business_hours: {
                            ...hours,
                            [day]: { ...dayData, [field]: value }
                          } as BusinessHours
                        });
                      };
                      return (
                        <div key={day} className="flex items-center gap-3 border p-3">
                          <span className="text-sm font-medium w-24">{dayLabels[day]}</span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!dayData.closed}
                              onChange={e => updateDay("closed", !e.target.checked)}
                              className="h-4 w-4 accent-accent"
                            />
                            <span className="text-xs text-muted-foreground">Nyitva</span>
                          </label>
                          {!dayData.closed && (
                            <div className="flex items-center gap-2 ml-auto">
                              <Input
                                type="time"
                                value={dayData.open}
                                onChange={e => updateDay("open", e.target.value)}
                                className="w-28 text-xs"
                              />
                              <span className="text-muted-foreground text-xs">–</span>
                              <Input
                                type="time"
                                value={dayData.close}
                                onChange={e => updateDay("close", e.target.value)}
                                className="w-28 text-xs"
                              />
                            </div>
                          )}
                          {dayData.closed && (
                            <span className="ml-auto text-xs text-muted-foreground italic">Zárva</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Automatikus válaszüzenet</h3>
                  <p className="text-xs text-muted-foreground">Ez az üzenet jelenik meg, ha a bolt zárva van és a vásárló kapcsolatba lép veled.</p>
                  <Textarea
                    value={settings.auto_reply_message || ""}
                    onChange={e => setSettings({ ...settings, auto_reply_message: e.target.value })}
                    className="rounded-none min-h-[100px]"
                    placeholder="pl. Köszönjük megkeresését! Nyitvatartási időben válaszolunk üzenetére."
                  />
                </div>
              </div>
            )}

            {/* ─── Legal Settings ─── */}
            {settingsSection === "legal" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Általános Szerződési Feltételek (ÁSZF)
                  </h3>
                  <p className="text-xs text-muted-foreground">A bolt általános feltételei, amelyeket a vásárlók elfogadnak rendeléskor.</p>
                  <Textarea
                    value={settings.terms_and_conditions || ""}
                    onChange={e => setSettings({ ...settings, terms_and_conditions: e.target.value })}
                    className="rounded-none min-h-[250px] text-xs leading-relaxed"
                    placeholder="Írd ide az ÁSZF szövegét..."
                  />
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Adatvédelmi tájékoztató
                  </h3>
                  <p className="text-xs text-muted-foreground">GDPR-nek megfelelő adatvédelmi tájékoztató a személyes adatok kezeléséről.</p>
                  <Textarea
                    value={settings.privacy_policy || ""}
                    onChange={e => setSettings({ ...settings, privacy_policy: e.target.value })}
                    className="rounded-none min-h-[250px] text-xs leading-relaxed"
                    placeholder="Írd ide az adatvédelmi tájékoztató szövegét..."
                  />
                </div>
              </div>
            )}

            {/* ─── Order Statuses Settings ─── */}
            {settingsSection === "statuses" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Rendelés állapotok kezelése
                  </h3>
                  <p className="text-xs text-muted-foreground">Testreszabhatod a rendelések állapotait. Adj hozzá új státuszokat vagy módosítsd a meglévőket.</p>
                  <div className="space-y-2">
                    {(settings.custom_order_statuses || []).map((status, idx) => (
                      <div key={idx} className="flex items-center gap-3 border p-3">
                        <div className={`h-3 w-3 rounded-full`} style={{ backgroundColor: status.color === "yellow" ? "#eab308" : status.color === "blue" ? "#3b82f6" : status.color === "orange" ? "#f97316" : status.color === "purple" ? "#a855f7" : status.color === "green" ? "#22c55e" : status.color === "red" ? "#ef4444" : status.color }} />
                        <Input
                          value={status.key}
                          onChange={e => {
                            const updated = [...(settings.custom_order_statuses || [])];
                            updated[idx] = { ...updated[idx], key: e.target.value };
                            setSettings({ ...settings, custom_order_statuses: updated });
                          }}
                          className="w-32 text-xs h-8"
                          placeholder="kulcs"
                        />
                        <Input
                          value={status.label}
                          onChange={e => {
                            const updated = [...(settings.custom_order_statuses || [])];
                            updated[idx] = { ...updated[idx], label: e.target.value };
                            setSettings({ ...settings, custom_order_statuses: updated });
                          }}
                          className="flex-1 text-xs h-8"
                          placeholder="Megjelenítendő név"
                        />
                        <select
                          value={status.color}
                          onChange={e => {
                            const updated = [...(settings.custom_order_statuses || [])];
                            updated[idx] = { ...updated[idx], color: e.target.value };
                            setSettings({ ...settings, custom_order_statuses: updated });
                          }}
                          className="h-8 border border-input bg-background px-2 text-xs"
                        >
                          <option value="yellow">Sárga</option>
                          <option value="blue">Kék</option>
                          <option value="orange">Narancs</option>
                          <option value="purple">Lila</option>
                          <option value="green">Zöld</option>
                          <option value="red">Piros</option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-none h-8 w-8 p-0"
                          onClick={() => {
                            const updated = (settings.custom_order_statuses || []).filter((_, i) => i !== idx);
                            setSettings({ ...settings, custom_order_statuses: updated });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none text-xs uppercase tracking-wider"
                    onClick={() => {
                      const updated = [...(settings.custom_order_statuses || []), { key: "new_status", label: "Új állapot", color: "blue" }];
                      setSettings({ ...settings, custom_order_statuses: updated });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Új állapot hozzáadása
                  </Button>
                </div>
              </div>
            )}

            {/* ─── Product Templates Settings ─── */}
            {settingsSection === "templates" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Mérettáblázat sablon
                  </h3>
                  <p className="text-xs text-muted-foreground">Ez a mérettáblázat jelenik meg minden terméknél (ha nincs egyedi beállítva).</p>
                  <Textarea
                    value={settings.size_chart_template || ""}
                    onChange={e => setSettings({ ...settings, size_chart_template: e.target.value })}
                    className="rounded-none min-h-[150px] text-xs"
                    placeholder="pl. S: Mell 88cm, Derék 72cm&#10;M: Mell 92cm, Derék 76cm&#10;L: Mell 96cm, Derék 80cm"
                  />
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Visszaküldési feltételek</h3>
                  <p className="text-xs text-muted-foreground">A visszaküldési feltételek szövege, ami megjelenik a termékoldalon.</p>
                  <Textarea
                    value={settings.return_policy || ""}
                    onChange={e => setSettings({ ...settings, return_policy: e.target.value })}
                    className="rounded-none min-h-[150px] text-xs"
                    placeholder="pl. 14 napon belül indoklás nélkül visszaküldhető..."
                  />
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Garanciális információk</h3>
                  <Textarea
                    value={settings.warranty_info || ""}
                    onChange={e => setSettings({ ...settings, warranty_info: e.target.value })}
                    className="rounded-none min-h-[150px] text-xs"
                    placeholder="pl. 2 év jótállás a törvényi előírások szerint..."
                  />
                </div>
              </div>
            )}

            {/* ─── Loyalty Program Settings ─── */}
            {settingsSection === "loyalty" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Hűségprogram beállítások
                  </h3>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Gift className="h-5 w-5 text-accent" />
                      <div>
                        <span className="text-sm font-semibold text-foreground">Hűségprogram engedélyezése</span>
                        <p className="text-xs text-muted-foreground">Vásárlók pontokat gyűjtenek minden vásárlás után</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.loyalty_enabled}
                      onChange={e => setSettings({ ...settings, loyalty_enabled: e.target.checked })}
                      className="h-5 w-5 rounded border-2 accent-accent"
                    />
                  </label>

                  {settings.loyalty_enabled && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pont / {settings.currency}</Label>
                          <Input type="number" value={settings.loyalty_points_per_currency} onChange={e => setSettings({ ...settings, loyalty_points_per_currency: Number(e.target.value) })} className="mt-1" />
                          <p className="text-[10px] text-muted-foreground mt-1">Mennyi pontot kap 1 {settings.currency} vásárlás után</p>
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kedvezmény / pont ({settings.currency})</Label>
                          <Input type="number" value={settings.loyalty_discount_per_points} onChange={e => setSettings({ ...settings, loyalty_discount_per_points: Number(e.target.value) })} className="mt-1" />
                          <p className="text-[10px] text-muted-foreground mt-1">Ennyi pontért kap 1 {settings.currency} kedvezményt</p>
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Minimum beváltás (pont)</Label>
                          <Input type="number" value={settings.loyalty_min_redeem} onChange={e => setSettings({ ...settings, loyalty_min_redeem: Number(e.target.value) })} className="mt-1" />
                          <p className="text-[10px] text-muted-foreground mt-1">Minimum ennyi pont kell a beváltáshoz</p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-dashed">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Beváltási arány és lejárat</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Beváltási ráta (pont → {settings.currency})</Label>
                            <Input type="number" step="0.01" value={settings.loyalty_redemption_rate} onChange={e => setSettings({ ...settings, loyalty_redemption_rate: Number(e.target.value) })} className="mt-1" />
                            <p className="text-[10px] text-muted-foreground mt-1">1 pont = ennyi {settings.currency} kedvezmény</p>
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pontok lejárata (hónap)</Label>
                            <Input type="number" value={settings.loyalty_expiry_months} onChange={e => setSettings({ ...settings, loyalty_expiry_months: Number(e.target.value) })} className="mt-1" min={1} />
                            <p className="text-[10px] text-muted-foreground mt-1">Ennyi hónap után járnak le a pontok</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-dashed">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Hűségszintek</h4>
                        <p className="text-xs text-muted-foreground">Szintek meghatározása a vásárlók kategorizálásához.</p>
                        {(settings.loyalty_levels || []).map((level: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input value={level} onChange={e => {
                              const levels = [...(settings.loyalty_levels || [])];
                              levels[i] = e.target.value;
                              setSettings({ ...settings, loyalty_levels: levels });
                            }} className="flex-1" placeholder="Szint neve" />
                            <Button variant="ghost" size="sm" onClick={() => {
                              const levels = [...(settings.loyalty_levels || [])];
                              levels.splice(i, 1);
                              setSettings({ ...settings, loyalty_levels: levels });
                            }}><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => {
                          const levels = [...(settings.loyalty_levels || [])];
                          levels.push("");
                          setSettings({ ...settings, loyalty_levels: levels });
                        }} className="w-full">
                          <Plus className="h-4 w-4 mr-2" /> Új szint hozzáadása
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ─── Reviews Config Settings ─── */}
            {settingsSection === "reviews_config" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Vélemények beállítások
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Star className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Vélemények engedélyezése</span>
                          <p className="text-xs text-muted-foreground">Vásárlók véleményt írhatnak a termékekről</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.reviews_enabled}
                        onChange={e => setSettings({ ...settings, reviews_enabled: e.target.checked })}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>

                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Moderálás szükséges</span>
                          <p className="text-xs text-muted-foreground">Vélemények csak admin jóváhagyás után jelennek meg</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.reviews_require_approval}
                        onChange={e => setSettings({ ...settings, reviews_require_approval: e.target.checked })}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Shipping Methods Settings ─── */}
            {settingsSection === "shipping" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Szállítási módok
                  </h3>
                  <p className="text-xs text-muted-foreground">Add meg a rendelkezésre álló szállítási módokat, díjaikat és leírásukat.</p>
                  <div className="space-y-2">
                    {(settings.shipping_methods || []).map((method, idx) => (
                      <div key={idx} className="border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={method.is_active}
                              onChange={e => {
                                const updated = [...(settings.shipping_methods || [])];
                                updated[idx] = { ...updated[idx], is_active: e.target.checked };
                                setSettings({ ...settings, shipping_methods: updated });
                              }}
                              className="h-4 w-4 accent-accent"
                            />
                            <span className="text-xs text-muted-foreground">Aktív</span>
                          </label>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-none h-8 w-8 p-0"
                            onClick={() => {
                              const updated = (settings.shipping_methods || []).filter((_, i) => i !== idx);
                              setSettings({ ...settings, shipping_methods: updated });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Név</Label>
                            <Input
                              value={method.label}
                              onChange={e => {
                                const updated = [...(settings.shipping_methods || [])];
                                updated[idx] = { ...updated[idx], label: e.target.value };
                                setSettings({ ...settings, shipping_methods: updated });
                              }}
                              className="mt-1 text-xs"
                              placeholder="pl. Futárszolgálat"
                            />
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Díj ({settings.currency})</Label>
                            <Input
                              type="number"
                              value={method.price}
                              onChange={e => {
                                const updated = [...(settings.shipping_methods || [])];
                                updated[idx] = { ...updated[idx], price: Number(e.target.value) };
                                setSettings({ ...settings, shipping_methods: updated });
                              }}
                              className="mt-1 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Leírás</Label>
                            <Input
                              value={method.description}
                              onChange={e => {
                                const updated = [...(settings.shipping_methods || [])];
                                updated[idx] = { ...updated[idx], description: e.target.value };
                                setSettings({ ...settings, shipping_methods: updated });
                              }}
                              className="mt-1 text-xs"
                              placeholder="pl. 1-2 munkanap"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none text-xs uppercase tracking-wider"
                    onClick={() => {
                      const updated = [...(settings.shipping_methods || []), { key: `method_${Date.now()}`, label: "Új szállítási mód", price: 0, description: "", is_active: true }];
                      setSettings({ ...settings, shipping_methods: updated });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Új szállítási mód
                  </Button>
                </div>
              </div>
            )}

            {/* ─── Inventory Settings ─── */}
            {settingsSection === "inventory" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Raktárkészlet beállítások
                  </h3>
                  <p className="text-xs text-muted-foreground">Készlet figyelmeztetések és automatikus elrejtés beállításai.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Alacsony készlet küszöb (db)</Label>
                      <Input
                        type="number"
                        value={settings.low_stock_threshold}
                        onChange={e => setSettings({ ...settings, low_stock_threshold: Number(e.target.value) })}
                        className="mt-1"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Ha a termék készlete ez alá csökken, figyelmeztetés jelenik meg.</p>
                    </div>
                  </div>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-accent" />
                      <div>
                        <span className="text-sm font-semibold text-foreground">Elfogyott termékek automatikus elrejtése</span>
                        <p className="text-xs text-muted-foreground">0 készletű termékek automatikusan inaktívvá válnak</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.auto_hide_out_of_stock}
                      onChange={e => setSettings({ ...settings, auto_hide_out_of_stock: e.target.checked })}
                      className="h-5 w-5 rounded border-2 accent-accent"
                    />
                  </label>
                </div>

                {/* Low stock products preview */}
                {products.filter(p => p.stock <= (settings.low_stock_threshold || 5) && p.is_active).length > 0 && (
                  <div className="border border-dashed bg-card/50 p-5 space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Alacsony készletű termékek
                    </h3>
                    <div className="space-y-1">
                      {products.filter(p => p.stock <= (settings.low_stock_threshold || 5) && p.is_active).map(p => (
                        <div key={p.id} className="flex items-center justify-between border p-2 text-xs">
                          <span className="font-medium">{p.name}</span>
                          <span className={`font-bold ${p.stock === 0 ? "text-destructive" : "text-yellow-500"}`}>{p.stock} db</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Notifications Settings ─── */}
            {settingsSection === "notifications" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Admin értesítések
                  </h3>
                  <p className="text-xs text-muted-foreground">Válaszd ki, milyen eseményekről kapj értesítést adminként.</p>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Értesítési e-mail cím</Label>
                    <Input
                      value={settings.notification_email || ""}
                      onChange={e => setSettings({ ...settings, notification_email: e.target.value })}
                      className="mt-1"
                      placeholder="admin@bolt.hu"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Erre a címre érkeznek az admin értesítések.</p>
                  </div>

                  <div className="space-y-3 mt-4">
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Új rendelés értesítés</span>
                          <p className="text-xs text-muted-foreground">Értesítés minden új beérkező rendelésről</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notification_new_order}
                        onChange={e => setSettings({ ...settings, notification_new_order: e.target.checked })}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>

                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Alacsony készlet figyelmeztetés</span>
                          <p className="text-xs text-muted-foreground">Értesítés, ha egy termék készlete a küszöb alá csökken</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notification_low_stock}
                        onChange={e => setSettings({ ...settings, notification_low_stock: e.target.checked })}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>

                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Star className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Új vélemény értesítés</span>
                          <p className="text-xs text-muted-foreground">Értesítés, ha új vásárlói vélemény érkezik</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notification_new_review}
                        onChange={e => setSettings({ ...settings, notification_new_review: e.target.checked })}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>

                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Új felhasználó értesítés</span>
                          <p className="text-xs text-muted-foreground">Értesítés, ha új felhasználó regisztrál</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={settings.notification_new_user} onChange={e => setSettings({ ...settings, notification_new_user: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>

                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <X className="h-5 w-5 text-destructive" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Törölt rendelés értesítés</span>
                          <p className="text-xs text-muted-foreground">Értesítés, ha egy rendelést törölnek</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={settings.notification_cancelled_order} onChange={e => setSettings({ ...settings, notification_cancelled_order: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>

                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-accent" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Napi összefoglaló e-mail</span>
                          <p className="text-xs text-muted-foreground">Napi összesítés a rendelésekről, bevételekről</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={settings.notification_daily_summary} onChange={e => setSettings({ ...settings, notification_daily_summary: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Slack integráció</h3>
                  <p className="text-xs text-muted-foreground">Értesítések küldése Slack csatornába webhook-on keresztül.</p>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slack Webhook URL</Label>
                    <Input value={settings.notification_slack_webhook || ""} onChange={e => setSettings({ ...settings, notification_slack_webhook: e.target.value })} className="mt-1" placeholder="https://hooks.slack.com/services/..." />
                    <p className="text-[10px] text-muted-foreground mt-1">Slack Incoming Webhook URL a valós idejű értesítésekhez.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Invoicing Settings ─── */}
            {settingsSection === "invoicing" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Számlázási adatok
                  </h3>
                  <p className="text-xs text-muted-foreground">A számlán megjelenő cégadatok. Ezek az adatok kerülnek a kiállított számlákra.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cégnév</Label>
                      <Input
                        value={settings.invoice_company_name || ""}
                        onChange={e => setSettings({ ...settings, invoice_company_name: e.target.value })}
                        className="mt-1"
                        placeholder="pl. Példa Kft."
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Adószám</Label>
                      <Input
                        value={settings.invoice_tax_number || ""}
                        onChange={e => setSettings({ ...settings, invoice_tax_number: e.target.value })}
                        className="mt-1"
                        placeholder="pl. 12345678-2-42"
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bankszámlaszám</Label>
                      <Input
                        value={settings.invoice_bank_account || ""}
                        onChange={e => setSettings({ ...settings, invoice_bank_account: e.target.value })}
                        className="mt-1"
                        placeholder="pl. 12345678-12345678-12345678"
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Székhely</Label>
                      <Input
                        value={settings.invoice_address || ""}
                        onChange={e => setSettings({ ...settings, invoice_address: e.target.value })}
                        className="mt-1"
                        placeholder="pl. 1234 Budapest, Példa utca 1."
                      />
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Számla sablonok</h3>
                  <p className="text-xs text-muted-foreground">Egyedi fejléc és lábléc szöveg a számlákon.</p>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fejléc szöveg</Label>
                    <Textarea
                      value={settings.invoice_header_text || ""}
                      onChange={e => setSettings({ ...settings, invoice_header_text: e.target.value })}
                      className="mt-1 rounded-none min-h-[80px] text-xs"
                      placeholder="pl. Köszönjük vásárlását!"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lábléc szöveg</Label>
                    <Textarea
                      value={settings.invoice_footer_text || ""}
                      onChange={e => setSettings({ ...settings, invoice_footer_text: e.target.value })}
                      className="mt-1 rounded-none min-h-[80px] text-xs"
                      placeholder="pl. Fizetési határidő: 8 nap | Számla kiállítása elektronikusan történt."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Checkout Settings ─── */}
            {settingsSection === "checkout" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Checkout testreszabás
                  </h3>
                  <p className="text-xs text-muted-foreground">A rendelési űrlap mezőinek és funkcióinak beállítása.</p>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kötelező mezők</h4>
                    {[
                      { key: "checkout_require_phone" as const, label: "Telefonszám kötelező" },
                      { key: "checkout_require_city" as const, label: "Város kötelező" },
                      { key: "checkout_require_zip" as const, label: "Irányítószám kötelező" },
                    ].map(field => (
                      <label key={field.key} className="flex items-center justify-between border border-border/50 p-3">
                        <span className="text-xs">{field.label}</span>
                        <input
                          type="checkbox"
                          checked={(settings as any)[field.key] ?? true}
                          onChange={e => setSettings({ ...settings, [field.key]: e.target.checked } as any)}
                          className="h-5 w-5 rounded border-2 accent-accent"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kiegészítő funkciók</h4>
                    <label className="flex items-center justify-between border border-border/50 p-3">
                      <span className="text-xs">Rendelési megjegyzés mező</span>
                      <input
                        type="checkbox"
                        checked={settings.checkout_enable_notes ?? true}
                        onChange={e => setSettings({ ...settings, checkout_enable_notes: e.target.checked } as any)}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>
                    <label className="flex items-center justify-between border border-border/50 p-3">
                      <div>
                        <span className="text-xs">Ajándékcsomagolás opció</span>
                        <p className="text-[10px] text-muted-foreground">Vásárlók választhatnak ajándékcsomagolást</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.checkout_enable_gift_wrap ?? false}
                        onChange={e => setSettings({ ...settings, checkout_enable_gift_wrap: e.target.checked } as any)}
                        className="h-5 w-5 rounded border-2 accent-accent"
                      />
                    </label>
                    {settings.checkout_enable_gift_wrap && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ajándékcsomagolás ára (Ft)</Label>
                        <Input
                          type="number"
                          value={settings.checkout_gift_wrap_price ?? 500}
                          onChange={e => setSettings({ ...settings, checkout_gift_wrap_price: Number(e.target.value) } as any)}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Minimum rendelési összeg (Ft)</Label>
                      <Input
                        type="number"
                        value={settings.checkout_min_order_amount ?? 0}
                        onChange={e => setSettings({ ...settings, checkout_min_order_amount: Number(e.target.value) } as any)}
                        className="mt-1"
                        placeholder="0 = nincs minimum"
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sikeres rendelés üzenet</Label>
                      <Textarea
                        value={settings.checkout_success_message || ""}
                        onChange={e => setSettings({ ...settings, checkout_success_message: e.target.value } as any)}
                        className="mt-1 rounded-none min-h-[80px] text-xs"
                        placeholder="Köszönjük a rendelést!"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Cookie/GDPR Banner ─── */}
            {settingsSection === "cookie" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Cookie / GDPR banner
                  </h3>
                  <p className="text-xs text-muted-foreground">Süti tájékoztató sáv és GDPR consent beállítása.</p>

                  <label className="flex items-center justify-between border border-border/50 p-3">
                    <div>
                      <span className="text-xs font-bold">Cookie banner megjelenítése</span>
                      <p className="text-[10px] text-muted-foreground">Első látogatáskor megjelenik a süti tájékoztató</p>
                    </div>
                    <input type="checkbox" checked={settings.cookie_banner_enabled ?? true} onChange={e => setSettings({ ...settings, cookie_banner_enabled: e.target.checked } as any)} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.cookie_banner_enabled && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Banner szöveg</Label>
                        <Textarea value={settings.cookie_banner_text || ""} onChange={e => setSettings({ ...settings, cookie_banner_text: e.target.value } as any)} className="mt-1 rounded-none min-h-[80px] text-xs" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gomb szöveg</Label>
                          <Input value={settings.cookie_banner_button_text || "Elfogadom"} onChange={e => setSettings({ ...settings, cookie_banner_button_text: e.target.value } as any)} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pozíció</Label>
                          <select value={settings.cookie_banner_position || "bottom"} onChange={e => setSettings({ ...settings, cookie_banner_position: e.target.value } as any)} className="mt-1 w-full h-10 px-3 border border-border bg-background text-foreground text-sm">
                            <option value="bottom">Alul</option>
                            <option value="top">Felül</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Cookie kategóriák</h3>
                  <p className="text-xs text-muted-foreground">Részletes süti hozzájárulás kategóriánként (GDPR-kompatibilis).</p>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between border p-4 cursor-pointer opacity-60">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Szükséges sütik</span>
                        <p className="text-xs text-muted-foreground">Alapvető működéshez szükséges — nem kapcsolható ki</p>
                      </div>
                      <input type="checkbox" checked={true} disabled className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Funkcionális sütik</span>
                        <p className="text-xs text-muted-foreground">Személyre szabás, nyelv megjegyzése</p>
                      </div>
                      <input type="checkbox" checked={settings.cookie_functional_enabled ?? true} onChange={e => setSettings({ ...settings, cookie_functional_enabled: e.target.checked } as any)} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Analitikai sütik</span>
                        <p className="text-xs text-muted-foreground">Google Analytics, statisztikák gyűjtése</p>
                      </div>
                      <input type="checkbox" checked={settings.cookie_analytics_enabled ?? true} onChange={e => setSettings({ ...settings, cookie_analytics_enabled: e.target.checked } as any)} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Marketing sütik</span>
                        <p className="text-xs text-muted-foreground">Meta Pixel, remarketing, hirdetési célú nyomon követés</p>
                      </div>
                      <input type="checkbox" checked={settings.cookie_marketing_enabled ?? true} onChange={e => setSettings({ ...settings, cookie_marketing_enabled: e.target.checked } as any)} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">GDPR beállítások</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Adatvédelmi tájékoztató URL</Label>
                      <Input value={settings.cookie_privacy_url || ""} onChange={e => setSettings({ ...settings, cookie_privacy_url: e.target.value } as any)} className="mt-1" placeholder="https://bolt.hu/adatvedelem" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cookie lejárat (nap)</Label>
                      <Input type="number" value={settings.cookie_expiry_days ?? 365} onChange={e => setSettings({ ...settings, cookie_expiry_days: parseInt(e.target.value) || 365 } as any)} className="mt-1" />
                      <p className="text-[10px] text-muted-foreground mt-1">A consent cookie ennyi napig érvényes.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Maintenance Mode ─── */}
            {settingsSection === "maintenance" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Karbantartási mód
                  </h3>
                  <p className="text-xs text-muted-foreground">Ha bekapcsolod, a webshop nem lesz elérhető a látogatók számára.</p>

                  <label className="flex items-center justify-between border border-primary/30 bg-primary/5 p-4">
                    <div>
                      <span className="text-xs font-bold text-primary">⚠️ Karbantartási mód</span>
                      <p className="text-[10px] text-muted-foreground">FIGYELEM: Bekapcsolva a webshop nem elérhető!</p>
                    </div>
                    <input type="checkbox" checked={settings.maintenance_enabled ?? false} onChange={e => setSettings({ ...settings, maintenance_enabled: e.target.checked } as any)} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Karbantartási üzenet</Label>
                    <Textarea value={settings.maintenance_message || ""} onChange={e => setSettings({ ...settings, maintenance_message: e.target.value } as any)} className="mt-1 rounded-none min-h-[100px] text-xs" placeholder="A webshop jelenleg karbantartás alatt áll..." />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Admin jelszó (titkosítva tárolt)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        id="maintenance-pw-new"
                        className="mt-1 flex-1"
                        placeholder="Új jelszó megadása…"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-1"
                        onClick={async () => {
                          const el = document.getElementById("maintenance-pw-new") as HTMLInputElement | null;
                          const pw = el?.value || "";
                          const { error } = await (supabase as any).rpc("set_maintenance_password", { _password: pw });
                          if (error) {
                            toast({ title: "Hiba", description: error.message, variant: "destructive" });
                          } else {
                            if (el) el.value = "";
                            toast({ title: pw ? "Jelszó titkosítva mentve ✅" : "Jelszó törölve" });
                          }
                        }}
                      >
                        Mentés
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">A jelszó bcrypt hash-ként kerül tárolásra. A plaintext mező nem használható többé.</p>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tervezett visszatérés</Label>
                    <Input type="datetime-local" value={settings.maintenance_return_date || ""} onChange={e => setSettings({ ...settings, maintenance_return_date: e.target.value } as any)} className="mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-1">Mikor lesz újra elérhető a webshop. Megjelenik a karbantartási oldalon.</p>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Banner szöveg (nem karbantartási módban)</Label>
                    <Input value={settings.maintenance_banner_text || ""} onChange={e => setSettings({ ...settings, maintenance_banner_text: e.target.value } as any)} className="mt-1" placeholder="Tervezett karbantartás: holnap 02:00-04:00" />
                    <p className="text-[10px] text-muted-foreground mt-1">Előzetes figyelmeztetés a fejlécben, még a karbantartás előtt.</p>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">IP Whitelist</Label>
                    <Input value={settings.maintenance_ip_whitelist || ""} onChange={e => setSettings({ ...settings, maintenance_ip_whitelist: e.target.value } as any)} className="mt-1" placeholder="192.168.1.1, 10.0.0.1" />
                    <p className="text-[10px] text-muted-foreground mt-1">Vesszővel elválasztott IP-címek, amelyek karbantartás közben is elérhetik a boltot.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Popup Settings ─── */}
            {settingsSection === "popups" && (
              <div className="space-y-4">
                {/* Newsletter popup */}
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Hírlevél popup
                  </h3>
                  <label className="flex items-center justify-between border border-border/50 p-3">
                    <span className="text-xs font-bold">Hírlevél feliratkozó popup</span>
                    <input
                      type="checkbox"
                      checked={settings.popup_newsletter_enabled ?? false}
                      onChange={e => setSettings({ ...settings, popup_newsletter_enabled: e.target.checked } as any)}
                      className="h-5 w-5 rounded border-2 accent-accent"
                    />
                  </label>
                  {settings.popup_newsletter_enabled && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cím</Label>
                        <Input
                          value={settings.popup_newsletter_title || ""}
                          onChange={e => setSettings({ ...settings, popup_newsletter_title: e.target.value } as any)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szöveg</Label>
                        <Textarea
                          value={settings.popup_newsletter_text || ""}
                          onChange={e => setSettings({ ...settings, popup_newsletter_text: e.target.value } as any)}
                          className="mt-1 rounded-none min-h-[60px] text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Késleltetés (mp)</Label>
                        <Input
                          type="number"
                          value={settings.popup_newsletter_delay_seconds ?? 5}
                          onChange={e => setSettings({ ...settings, popup_newsletter_delay_seconds: Number(e.target.value) } as any)}
                          className="mt-1"
                          min={0}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Exit popup */}
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Kilépési popup
                  </h3>
                  <label className="flex items-center justify-between border border-border/50 p-3">
                    <div>
                      <span className="text-xs font-bold">Kilépési popup megjelenítése</span>
                      <p className="text-[10px] text-muted-foreground">Ha a felhasználó el akarja hagyni az oldalt</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.popup_exit_enabled ?? false}
                      onChange={e => setSettings({ ...settings, popup_exit_enabled: e.target.checked } as any)}
                      className="h-5 w-5 rounded border-2 accent-accent"
                    />
                  </label>
                  {settings.popup_exit_enabled && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cím</Label>
                        <Input
                          value={settings.popup_exit_title || ""}
                          onChange={e => setSettings({ ...settings, popup_exit_title: e.target.value } as any)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szöveg</Label>
                        <Textarea
                          value={settings.popup_exit_text || ""}
                          onChange={e => setSettings({ ...settings, popup_exit_text: e.target.value } as any)}
                          className="mt-1 rounded-none min-h-[60px] text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Promo popup */}
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Akciós popup
                  </h3>
                  <label className="flex items-center justify-between border border-border/50 p-3">
                    <span className="text-xs font-bold">Akciós / promóciós popup</span>
                    <input
                      type="checkbox"
                      checked={settings.popup_promo_enabled ?? false}
                      onChange={e => setSettings({ ...settings, popup_promo_enabled: e.target.checked } as any)}
                      className="h-5 w-5 rounded border-2 accent-accent"
                    />
                  </label>
                  {settings.popup_promo_enabled && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cím</Label>
                        <Input
                          value={settings.popup_promo_title || ""}
                          onChange={e => setSettings({ ...settings, popup_promo_title: e.target.value } as any)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szöveg</Label>
                        <Textarea
                          value={settings.popup_promo_text || ""}
                          onChange={e => setSettings({ ...settings, popup_promo_text: e.target.value } as any)}
                          className="mt-1 rounded-none min-h-[60px] text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kép URL (opcionális)</Label>
                        <Input
                          value={settings.popup_promo_image_url || ""}
                          onChange={e => setSettings({ ...settings, popup_promo_image_url: e.target.value } as any)}
                          className="mt-1"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Language Settings ─── */}
            {settingsSection === "language" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Nyelvi beállítások
                  </h3>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Alapértelmezett nyelv</Label>
                    <select value={settings.lang_default || "hu"} onChange={e => setSettings({ ...settings, lang_default: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                      <option value="hu">Magyar</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                      <option value="ro">Română</option>
                      <option value="sk">Slovenčina</option>
                      <option value="hr">Hrvatski</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Elérhető nyelvek</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[{code:"hu",name:"Magyar"},{code:"en",name:"English"},{code:"de",name:"Deutsch"},{code:"ro",name:"Română"},{code:"sk",name:"Slovenčina"},{code:"hr",name:"Hrvatski"}].map(lang => {
                        const active = (settings.lang_available || ["hu"]).includes(lang.code);
                        return (
                          <label key={lang.code} className={`flex items-center gap-2 border px-3 py-2 cursor-pointer transition-colors ${active ? "border-accent bg-accent/10" : "border-border"}`}>
                            <input type="checkbox" checked={active} onChange={() => {
                              const current = settings.lang_available || ["hu"];
                              const next = active ? current.filter((c: string) => c !== lang.code) : [...current, lang.code];
                              setSettings({ ...settings, lang_available: next });
                            }} className="h-4 w-4 accent-accent" />
                            <span className="text-xs">{lang.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Automatikus nyelvfelismerés</span>
                      <p className="text-xs text-muted-foreground">A böngésző nyelve alapján automatikusan váltás</p>
                    </div>
                    <input type="checkbox" checked={settings.lang_auto_detect} onChange={e => setSettings({ ...settings, lang_auto_detect: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                </div>
              </div>
            )}

            {/* ─── Discount Rules Settings ─── */}
            {settingsSection === "discounts" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Automatikus kedvezmény
                  </h3>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Automatikus kedvezmény engedélyezése</span>
                      <p className="text-xs text-muted-foreground">Megadott összeg felett automatikus kedvezmény</p>
                    </div>
                    <input type="checkbox" checked={settings.discount_auto_enabled} onChange={e => setSettings({ ...settings, discount_auto_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                  {settings.discount_auto_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-dashed">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Minimum összeg</Label>
                        <Input type="number" value={settings.discount_auto_min_amount} onChange={e => setSettings({ ...settings, discount_auto_min_amount: Number(e.target.value) })} className="mt-1" min={0} />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kedvezmény értéke</Label>
                        <Input type="number" value={settings.discount_auto_value} onChange={e => setSettings({ ...settings, discount_auto_value: Number(e.target.value) })} className="mt-1" min={0} />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Típus</Label>
                        <select value={settings.discount_auto_type || "percent"} onChange={e => setSettings({ ...settings, discount_auto_type: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                          <option value="percent">Százalék (%)</option>
                          <option value="fixed">Fix összeg (Ft)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Mennyiségi árazás</h3>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Mennyiségi kedvezmény</span>
                      <p className="text-xs text-muted-foreground">Több darab vásárlása esetén kedvezményes ár</p>
                    </div>
                    <input type="checkbox" checked={settings.discount_quantity_enabled} onChange={e => setSettings({ ...settings, discount_quantity_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">VIP vásárlói szintek</h3>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">VIP rendszer engedélyezése</span>
                      <p className="text-xs text-muted-foreground">Rendelésszám alapú automatikus kedvezményszintek</p>
                    </div>
                    <input type="checkbox" checked={settings.discount_vip_enabled} onChange={e => setSettings({ ...settings, discount_vip_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                  {settings.discount_vip_enabled && (
                    <div className="space-y-2 pt-2 border-t border-dashed">
                      <p className="text-xs text-muted-foreground">VIP szintek (rendelésszám → kedvezmény %):</p>
                      {(Array.isArray(settings.discount_vip_tiers) ? settings.discount_vip_tiers : []).map((tier: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs border p-2">
                          <span className="font-semibold min-w-[60px]">{tier.name}</span>
                          <span className="text-muted-foreground">{tier.min_orders}+ rendelés →</span>
                          <span className="font-bold text-accent">{tier.discount_pct}% kedvezmény</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Product Display Settings ─── */}
            {settingsSection === "product_display" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Terméklista megjelenítés
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Alapértelmezett nézet</Label>
                      <select value={settings.product_default_view || "grid"} onChange={e => setSettings({ ...settings, product_default_view: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="grid">Rács nézet</option>
                        <option value="list">Lista nézet</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rács oszlopszám</Label>
                      <select value={settings.product_grid_columns} onChange={e => setSettings({ ...settings, product_grid_columns: Number(e.target.value) })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value={2}>2 oszlop</option>
                        <option value={3}>3 oszlop</option>
                        <option value={4}>4 oszlop</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Elemek per oldal</Label>
                      <select value={settings.product_items_per_page} onChange={e => setSettings({ ...settings, product_items_per_page: Number(e.target.value) })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value={8}>8</option>
                        <option value={12}>12</option>
                        <option value={16}>16</option>
                        <option value={24}>24</option>
                        <option value={48}>48</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Alapértelmezett rendezés</Label>
                      <select value={settings.product_default_sort || "newest"} onChange={e => setSettings({ ...settings, product_default_sort: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="newest">Legújabb</option>
                        <option value="price_asc">Ár: növekvő</option>
                        <option value="price_desc">Ár: csökkenő</option>
                        <option value="name_asc">Név: A-Z</option>
                        <option value="popular">Legnépszerűbb</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Termékkártya elemek</h3>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Gyors nézet gomb</span>
                      <p className="text-xs text-muted-foreground">Terméklista nézetben gyors előnézet popup</p>
                    </div>
                    <input type="checkbox" checked={settings.product_quick_view_enabled} onChange={e => setSettings({ ...settings, product_quick_view_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Készlet jelző badge</span>
                      <p className="text-xs text-muted-foreground">"Készleten" / "Elfogyott" jelzés megjelenítése</p>
                    </div>
                    <input type="checkbox" checked={settings.product_show_stock_badge} onChange={e => setSettings({ ...settings, product_show_stock_badge: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Kedvezmény badge</span>
                      <p className="text-xs text-muted-foreground">"- X%" kedvezmény jelzés a terméken</p>
                    </div>
                    <input type="checkbox" checked={settings.product_show_discount_badge} onChange={e => setSettings({ ...settings, product_show_discount_badge: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                </div>
              </div>
            )}

            {/* ─── Analytics Integration ─── */}
            {settingsSection === "analytics" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analitika integráció
                  </h3>
                  <p className="text-xs text-muted-foreground">Tracking kódok és analitikai szolgáltatások beállítása.</p>

                  <label className="flex items-center justify-between border border-border/50 p-3">
                    <div>
                      <span className="text-xs font-bold">Analitika engedélyezve</span>
                      <p className="text-[10px] text-muted-foreground">Globális kapcsoló az összes tracking kódhoz</p>
                    </div>
                    <input type="checkbox" checked={settings.analytics_enabled ?? true} onChange={e => setSettings({ ...settings, analytics_enabled: e.target.checked } as any)} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Tracking ID-k</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Google Tag Manager ID</Label>
                      <Input value={settings.analytics_gtm_id || ""} onChange={e => setSettings({ ...settings, analytics_gtm_id: e.target.value } as any)} className="mt-1" placeholder="GTM-XXXXXXX" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Google Analytics ID</Label>
                      <Input value={settings.seo_google_analytics_id || ""} onChange={e => setSettings({ ...settings, seo_google_analytics_id: e.target.value } as any)} className="mt-1" placeholder="G-XXXXXXXXXX" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Meta Pixel ID</Label>
                      <Input value={settings.analytics_meta_pixel_id || ""} onChange={e => setSettings({ ...settings, analytics_meta_pixel_id: e.target.value } as any)} className="mt-1" placeholder="123456789012345" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">TikTok Pixel ID</Label>
                      <Input value={settings.analytics_tiktok_pixel_id || ""} onChange={e => setSettings({ ...settings, analytics_tiktok_pixel_id: e.target.value } as any)} className="mt-1" placeholder="XXXXXXXXXXXXXXXX" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Facebook Conversions API Token</Label>
                    <Input value={settings.analytics_fb_conversions_token || ""} onChange={e => setSettings({ ...settings, analytics_fb_conversions_token: e.target.value } as any)} className="mt-1" placeholder="EAAxxxxxxx..." />
                    <p className="text-[10px] text-muted-foreground mt-1">Server-side tracking a pontosabb konverziókövetéshez.</p>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Egyedi tracking kódok</h3>
                  <p className="text-xs text-muted-foreground">Tetszőleges script kód beillesztése a &lt;head&gt; vagy &lt;body&gt; részbe.</p>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Egyedi kód — &lt;head&gt;</Label>
                    <Textarea value={settings.analytics_custom_head_code || ""} onChange={e => setSettings({ ...settings, analytics_custom_head_code: e.target.value } as any)} className="mt-1 rounded-none min-h-[80px] text-xs font-mono" placeholder="<!-- Ide kerül a head-be illesztendő kód -->" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Egyedi kód — &lt;body&gt; vége</Label>
                    <Textarea value={settings.analytics_custom_body_code || ""} onChange={e => setSettings({ ...settings, analytics_custom_body_code: e.target.value } as any)} className="mt-1 rounded-none min-h-[80px] text-xs font-mono" placeholder="<!-- Ide kerül a body végére illesztendő kód -->" />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Registration Settings ─── */}
            {settingsSection === "registration" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Regisztráció beállítások
                  </h3>
                  <p className="text-xs text-muted-foreground">Szabd testre a regisztrációs űrlapot és a kötelező mezőket.</p>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Név kötelező</span>
                        <p className="text-xs text-muted-foreground">Teljes név megadása regisztrációkor</p>
                      </div>
                      <input type="checkbox" checked={settings.reg_require_name} onChange={e => setSettings({ ...settings, reg_require_name: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Telefonszám kötelező</span>
                        <p className="text-xs text-muted-foreground">Telefonszám megadása regisztrációkor</p>
                      </div>
                      <input type="checkbox" checked={settings.reg_require_phone} onChange={e => setSettings({ ...settings, reg_require_phone: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Cím kötelező</span>
                        <p className="text-xs text-muted-foreground">Szállítási cím megadása regisztrációkor</p>
                      </div>
                      <input type="checkbox" checked={settings.reg_require_address} onChange={e => setSettings({ ...settings, reg_require_address: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">ÁSZF elfogadás kötelező</span>
                        <p className="text-xs text-muted-foreground">Regisztrációnál kötelezően el kell fogadni az ÁSZF-et</p>
                      </div>
                      <input type="checkbox" checked={settings.reg_terms_required} onChange={e => setSettings({ ...settings, reg_terms_required: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Social login (Google, Facebook)</span>
                        <p className="text-xs text-muted-foreground">Közösségi média fiókkal való bejelentkezés engedélyezése</p>
                      </div>
                      <input type="checkbox" checked={settings.reg_social_login_enabled} onChange={e => setSettings({ ...settings, reg_social_login_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Üdvözlő üzenet</h3>
                  <p className="text-xs text-muted-foreground">Ez az üzenet jelenik meg a sikeres regisztráció után.</p>
                  <Textarea value={settings.reg_welcome_message || ""} onChange={e => setSettings({ ...settings, reg_welcome_message: e.target.value })} className="rounded-none min-h-[80px]" />
                </div>
              </div>
            )}

            {/* ─── Payment Config Settings ─── */}
            {settingsSection === "payment_config" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Fizetési módok kezelése
                  </h3>
                  <p className="text-xs text-muted-foreground">Bővített fizetési opciók: átutalás, részletfizetés, minimális rendelési összeg.</p>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-accent" />
                      <div>
                        <span className="text-sm font-semibold text-foreground">Banki átutalás</span>
                        <p className="text-xs text-muted-foreground">Előre utalás bankszámlára</p>
                      </div>
                    </div>
                    <input type="checkbox" checked={settings.payment_transfer_enabled} onChange={e => setSettings({ ...settings, payment_transfer_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.payment_transfer_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bank neve</Label>
                        <Input value={settings.payment_transfer_bank_name || ""} onChange={e => setSettings({ ...settings, payment_transfer_bank_name: e.target.value })} className="mt-1" placeholder="pl. OTP Bank" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">IBAN / Számlaszám</Label>
                        <Input value={settings.payment_transfer_iban || ""} onChange={e => setSettings({ ...settings, payment_transfer_iban: e.target.value })} className="mt-1" placeholder="HU12 1234 5678 9012 3456 7890 1234" />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Részletfizetés</span>
                      <p className="text-xs text-muted-foreground">Engedélyezd a részletfizetési opciót</p>
                    </div>
                    <input type="checkbox" checked={settings.payment_installment_enabled} onChange={e => setSettings({ ...settings, payment_installment_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.payment_installment_enabled && (
                    <div className="pt-2 border-t border-dashed">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Részletek száma (hónap)</Label>
                      <select value={settings.payment_installment_months} onChange={e => setSettings({ ...settings, payment_installment_months: Number(e.target.value) })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value={3}>3 hónap</option>
                        <option value={6}>6 hónap</option>
                        <option value={10}>10 hónap</option>
                        <option value={12}>12 hónap</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Minimális rendelési összeg</h3>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Minimum összeg (Ft)</Label>
                    <Input type="number" value={settings.payment_min_order_amount} onChange={e => setSettings({ ...settings, payment_min_order_amount: Number(e.target.value) })} className="mt-1" min={0} placeholder="0" />
                    <p className="text-[10px] text-muted-foreground mt-1">Ha 0, nincs minimális rendelési összeg.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Shipping Zones Settings ─── */}
            {settingsSection === "shipping_zones" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Szállítási zónák
                  </h3>
                  <p className="text-xs text-muted-foreground">Különböző régiókhoz eltérő szállítási díjak és kiszállítási idők.</p>

                  {(Array.isArray(settings.shipping_zones) ? settings.shipping_zones : []).map((zone: any, i: number) => (
                    <div key={i} className="border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{zone.name || `Zóna ${i + 1}`}</span>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={zone.is_active} onChange={e => {
                              const zones = [...(settings.shipping_zones || [])];
                              zones[i] = { ...zones[i], is_active: e.target.checked };
                              setSettings({ ...settings, shipping_zones: zones });
                            }} className="h-4 w-4 accent-accent" />
                            Aktív
                          </label>
                          <Button size="sm" variant="ghost" onClick={() => {
                            const zones = [...(settings.shipping_zones || [])];
                            zones.splice(i, 1);
                            setSettings({ ...settings, shipping_zones: zones });
                          }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Zóna neve</Label>
                          <Input value={zone.name} onChange={e => {
                            const zones = [...(settings.shipping_zones || [])];
                            zones[i] = { ...zones[i], name: e.target.value };
                            setSettings({ ...settings, shipping_zones: zones });
                          }} className="mt-1" placeholder="pl. Budapest" />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Régiók (vessző elválasztva)</Label>
                          <Input value={zone.regions} onChange={e => {
                            const zones = [...(settings.shipping_zones || [])];
                            zones[i] = { ...zones[i], regions: e.target.value };
                            setSettings({ ...settings, shipping_zones: zones });
                          }} className="mt-1" placeholder="pl. 1011, 1012, 1013" />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szállítási díj (Ft)</Label>
                          <Input type="number" value={zone.fee} onChange={e => {
                            const zones = [...(settings.shipping_zones || [])];
                            zones[i] = { ...zones[i], fee: Number(e.target.value) };
                            setSettings({ ...settings, shipping_zones: zones });
                          }} className="mt-1" min={0} />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kiszállítási idő (nap)</Label>
                          <Input type="number" value={zone.delivery_days} onChange={e => {
                            const zones = [...(settings.shipping_zones || [])];
                            zones[i] = { ...zones[i], delivery_days: Number(e.target.value) };
                            setSettings({ ...settings, shipping_zones: zones });
                          }} className="mt-1" min={0} />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" onClick={() => {
                    const zones = [...(settings.shipping_zones || [])];
                    zones.push({ name: "", regions: "", fee: 0, delivery_days: 3, is_active: true });
                    setSettings({ ...settings, shipping_zones: zones });
                  }} className="w-full">
                    <Plus className="h-4 w-4 mr-2" /> Új zóna hozzáadása
                  </Button>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Szállítási alapértékek</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Alapértelmezett szállítási díj (Ft)</Label>
                      <Input type="number" value={settings.shipping_default_cost} onChange={e => setSettings({ ...settings, shipping_default_cost: Number(e.target.value) })} className="mt-1" min={0} />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ingyenes szállítás limit (Ft)</Label>
                      <Input type="number" value={settings.shipping_free_limit} onChange={e => setSettings({ ...settings, shipping_free_limit: Number(e.target.value) })} className="mt-1" min={0} />
                      <p className="text-[10px] text-muted-foreground mt-1">E felett ingyenes a szállítás. 0 = nincs ingyenes szállítás.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {settingsSection === "stock_alerts" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Raktárkészlet riasztások
                  </h3>
                  <p className="text-xs text-muted-foreground">Automatikus riasztások és megjelenítési opciók a készletkezeléshez.</p>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Készlet riasztások engedélyezése</span>
                      <p className="text-xs text-muted-foreground">E-mail értesítés alacsony készlet esetén</p>
                    </div>
                    <input type="checkbox" checked={settings.stock_alert_enabled} onChange={e => setSettings({ ...settings, stock_alert_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Alacsony készlet küszöbérték (db)</Label>
                      <Input type="number" value={settings.stock_alert_threshold} onChange={e => setSettings({ ...settings, stock_alert_threshold: Number(e.target.value) })} className="mt-1" min={0} />
                      <p className="text-[10px] text-muted-foreground mt-1">Ennyi darab alatt riasztás jelenik meg.</p>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Régi küszöbérték (kompatibilitás)</Label>
                      <Input type="number" value={settings.low_stock_threshold} onChange={e => setSettings({ ...settings, low_stock_threshold: Number(e.target.value) })} className="mt-1" min={0} />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Riasztási e-mail cím</Label>
                    <Input value={settings.stock_alert_email || ""} onChange={e => setSettings({ ...settings, stock_alert_email: e.target.value })} className="mt-1" placeholder="admin@webshop.hu" />
                    <p className="text-[10px] text-muted-foreground mt-1">Erre az e-mail címre küldünk értesítést alacsony készlet esetén.</p>
                  </div>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Készleten kívüli termékek elrejtése</span>
                      <p className="text-xs text-muted-foreground">0 készletű termékek automatikus elrejtése a boltból</p>
                    </div>
                    <input type="checkbox" checked={settings.auto_hide_out_of_stock} onChange={e => setSettings({ ...settings, auto_hide_out_of_stock: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Automatikus újrarendelés</span>
                      <p className="text-xs text-muted-foreground">Küszöbérték alatt automatikus beszerzési javaslat</p>
                    </div>
                    <input type="checkbox" checked={settings.stock_auto_reorder_enabled} onChange={e => setSettings({ ...settings, stock_auto_reorder_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.stock_auto_reorder_enabled && (
                    <div className="pt-2 border-t border-dashed">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Újrarendelési küszöb (db)</Label>
                      <Input type="number" value={settings.stock_auto_reorder_threshold} onChange={e => setSettings({ ...settings, stock_auto_reorder_threshold: Number(e.target.value) })} className="mt-1" min={0} />
                    </div>
                  )}

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Maradék darabszám megjelenítése</span>
                      <p className="text-xs text-muted-foreground">"Már csak X db!" felirat a terméklapon</p>
                    </div>
                    <input type="checkbox" checked={settings.stock_show_remaining_count} onChange={e => setSettings({ ...settings, stock_show_remaining_count: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Elérhetőségi szöveg</span>
                      <p className="text-xs text-muted-foreground">"Készleten" / "Elfogyott" szöveg megjelenítése</p>
                    </div>
                    <input type="checkbox" checked={settings.stock_show_availability_text} onChange={e => setSettings({ ...settings, stock_show_availability_text: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                </div>
              </div>
            )}

            {/* ─── Appearance Custom Settings ─── */}
            {settingsSection === "appearance_custom" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Megjelenés testreszabás
                  </h3>
                  <p className="text-xs text-muted-foreground">Haladó vizuális beállítások a webshop kinézetéhez.</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Termékkártya stílus</Label>
                      <select value={settings.appearance_product_card_style || "default"} onChange={e => setSettings({ ...settings, appearance_product_card_style: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="default">Alapértelmezett</option>
                        <option value="minimal">Minimalista</option>
                        <option value="detailed">Részletes</option>
                        <option value="card_shadow">Árnyékos kártya</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Header stílus</Label>
                      <select value={settings.appearance_header_style || "default"} onChange={e => setSettings({ ...settings, appearance_header_style: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="default">Alapértelmezett</option>
                        <option value="centered">Középre igazított</option>
                        <option value="minimal">Minimalista</option>
                        <option value="mega">Mega header</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Footer stílus</Label>
                      <select value={settings.appearance_footer_style || "default"} onChange={e => setSettings({ ...settings, appearance_footer_style: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                        <option value="default">Alapértelmezett</option>
                        <option value="minimal">Minimalista</option>
                        <option value="expanded">Bővített</option>
                        <option value="columns">Többoszlopos</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Hirdetősáv (Announcement Bar)</h3>
                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Hirdetősáv engedélyezése</span>
                      <p className="text-xs text-muted-foreground">Megjelenítés az oldal tetején</p>
                    </div>
                    <input type="checkbox" checked={settings.appearance_announcement_bar_enabled} onChange={e => setSettings({ ...settings, appearance_announcement_bar_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.appearance_announcement_bar_enabled && (
                    <div className="space-y-3 pt-2 border-t border-dashed">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Hirdetősáv szöveg</Label>
                        <Input value={settings.appearance_announcement_bar_text || ""} onChange={e => setSettings({ ...settings, appearance_announcement_bar_text: e.target.value })} className="mt-1" placeholder="pl. 🔥 Ingyenes szállítás 15.000 Ft felett!" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Háttérszín</Label>
                        <div className="flex items-center gap-3 mt-1">
                          <input type="color" value={settings.appearance_announcement_bar_bg_color || "#000000"} onChange={e => setSettings({ ...settings, appearance_announcement_bar_bg_color: e.target.value })} className="h-10 w-10 cursor-pointer border border-input" />
                          <Input value={settings.appearance_announcement_bar_bg_color || "#000000"} onChange={e => setSettings({ ...settings, appearance_announcement_bar_bg_color: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Coupon Settings ─── */}
            {settingsSection === "coupon_settings" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Kuponok / kedvezmények beállítások
                  </h3>
                  <p className="text-xs text-muted-foreground">Automatikus kedvezmények és kuponszabályok konfigurálása.</p>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Automatikus kupon alkalmazás</span>
                      <p className="text-xs text-muted-foreground">Ha aktív kupon van, automatikusan alkalmazza a kosárban</p>
                    </div>
                    <input type="checkbox" checked={settings.coupon_auto_apply_enabled} onChange={e => setSettings({ ...settings, coupon_auto_apply_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Kuponok halmozhatók</span>
                      <p className="text-xs text-muted-foreground">Több kupon egyidejű használatának engedélyezése</p>
                    </div>
                    <input type="checkbox" checked={settings.coupon_stackable} onChange={e => setSettings({ ...settings, coupon_stackable: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max. felhasználás / felhasználó</Label>
                    <Input type="number" value={settings.coupon_max_per_user} onChange={e => setSettings({ ...settings, coupon_max_per_user: Number(e.target.value) })} className="mt-1" min={1} />
                    <p className="text-[10px] text-muted-foreground mt-1">Hányszor használhat egy felhasználó egy kupont.</p>
                  </div>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Első rendelés kedvezmény</span>
                      <p className="text-xs text-muted-foreground">Automatikus kedvezmény az első vásárlásra</p>
                    </div>
                    <input type="checkbox" checked={settings.coupon_first_order_discount} onChange={e => setSettings({ ...settings, coupon_first_order_discount: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.coupon_first_order_discount && (
                    <div className="pt-2 border-t border-dashed">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Első rendelés kedvezmény (%)</Label>
                      <Input type="number" value={settings.coupon_first_order_value} onChange={e => setSettings({ ...settings, coupon_first_order_value: Number(e.target.value) })} className="mt-1" min={0} max={100} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Product Tags / Filters ─── */}
            {settingsSection === "product_tags" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Termék címkék / szűrők
                  </h3>
                  <p className="text-xs text-muted-foreground">Egyedi címkék és szűrési opciók a termékkatalógushoz.</p>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider">Aktív szűrők</h4>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Szín szűrő</span>
                        <p className="text-xs text-muted-foreground">Szűrés szín alapján a boltban</p>
                      </div>
                      <input type="checkbox" checked={settings.product_filter_by_color} onChange={e => setSettings({ ...settings, product_filter_by_color: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Méret szűrő</span>
                        <p className="text-xs text-muted-foreground">Szűrés méret alapján a boltban</p>
                      </div>
                      <input type="checkbox" checked={settings.product_filter_by_size} onChange={e => setSettings({ ...settings, product_filter_by_size: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Ár szűrő</span>
                        <p className="text-xs text-muted-foreground">Szűrés ártartomány alapján</p>
                      </div>
                      <input type="checkbox" checked={settings.product_filter_by_price} onChange={e => setSettings({ ...settings, product_filter_by_price: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Anyag szűrő</span>
                        <p className="text-xs text-muted-foreground">Szűrés anyag alapján (pamut, poliészter, stb.)</p>
                      </div>
                      <input type="checkbox" checked={settings.product_filter_by_material} onChange={e => setSettings({ ...settings, product_filter_by_material: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-dashed">
                    <h4 className="text-xs font-bold uppercase tracking-wider">Egyedi címkék</h4>
                    {(settings.product_tags || []).map((tag: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 border p-3">
                        <input type="color" value={tag.color || "#000000"} onChange={e => {
                          const tags = [...(settings.product_tags || [])];
                          tags[i] = { ...tags[i], color: e.target.value };
                          setSettings({ ...settings, product_tags: tags });
                        }} className="h-8 w-8 cursor-pointer border border-input" />
                        <Input value={tag.name} onChange={e => {
                          const tags = [...(settings.product_tags || [])];
                          tags[i] = { ...tags[i], name: e.target.value };
                          setSettings({ ...settings, product_tags: tags });
                        }} className="flex-1" placeholder="Címke neve" />
                        <Button variant="ghost" size="sm" onClick={() => {
                          const tags = [...(settings.product_tags || [])];
                          tags.splice(i, 1);
                          setSettings({ ...settings, product_tags: tags });
                        }}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => {
                      const tags = [...(settings.product_tags || [])];
                      tags.push({ name: "", color: "#000000" });
                      setSettings({ ...settings, product_tags: tags });
                    }} className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Új címke hozzáadása
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── User Notifications ─── */}
            {settingsSection === "user_notifications" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Felhasználói értesítések
                  </h3>
                  <p className="text-xs text-muted-foreground">Push és SMS értesítések beállítása a vásárlóknak.</p>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Push értesítések</span>
                      <p className="text-xs text-muted-foreground">Böngésző push értesítések engedélyezése</p>
                    </div>
                    <input type="checkbox" checked={settings.notif_push_enabled} onChange={e => setSettings({ ...settings, notif_push_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.notif_push_enabled && (
                    <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Promóciós push</span>
                        <p className="text-xs text-muted-foreground">Kedvezmények és akciók push értesítésben</p>
                      </div>
                      <input type="checkbox" checked={settings.notif_promo_push} onChange={e => setSettings({ ...settings, notif_promo_push: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                    </label>
                  )}

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">SMS értesítések</span>
                      <p className="text-xs text-muted-foreground">SMS küldés rendelési eseményekről</p>
                    </div>
                    <input type="checkbox" checked={settings.notif_sms_enabled} onChange={e => setSettings({ ...settings, notif_sms_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.notif_sms_enabled && (
                    <div className="space-y-3 pt-2 border-t border-dashed">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">SMS szolgáltató</Label>
                        <select value={settings.notif_sms_provider || "none"} onChange={e => setSettings({ ...settings, notif_sms_provider: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                          <option value="none">Nincs kiválasztva</option>
                          <option value="twilio">Twilio</option>
                          <option value="nexmo">Vonage (Nexmo)</option>
                          <option value="custom">Egyedi API</option>
                        </select>
                      </div>
                      <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                        <div>
                          <span className="text-sm font-semibold text-foreground">Rendelés státusz SMS</span>
                          <p className="text-xs text-muted-foreground">SMS küldés státuszváltozáskor</p>
                        </div>
                        <input type="checkbox" checked={settings.notif_order_status_sms} onChange={e => setSettings({ ...settings, notif_order_status_sms: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Order Workflow ─── */}
            {settingsSection === "order_workflow" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Rendelés munkafolyamat
                  </h3>
                  <p className="text-xs text-muted-foreground">Rendelési folyamat automatizálása és testreszabása.</p>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Automatikus rendelés-visszaigazolás</span>
                      <p className="text-xs text-muted-foreground">Rendelés automatikus elfogadása beérkezéskor</p>
                    </div>
                    <input type="checkbox" checked={settings.order_auto_confirm} onChange={e => setSettings({ ...settings, order_auto_confirm: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Automatikus törlés (óra)</Label>
                    <Input type="number" value={settings.order_auto_cancel_hours} onChange={e => setSettings({ ...settings, order_auto_cancel_hours: Number(e.target.value) })} className="mt-1" min={0} />
                    <p className="text-[10px] text-muted-foreground mt-1">Ennyi óra inaktivitás után automatikusan törli a fizetetlen rendelést. 0 = kikapcsolva.</p>
                  </div>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Fizetési bizonylat kötelező</span>
                      <p className="text-xs text-muted-foreground">Átutalásos fizetésnél bizonylat feltöltése szükséges</p>
                    </div>
                    <input type="checkbox" checked={settings.order_require_payment_proof} onChange={e => setSettings({ ...settings, order_require_payment_proof: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                </div>

                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Munkafolyamat lépések</h3>
                  <p className="text-xs text-muted-foreground">Definiáld a rendelés státuszainak sorrendjét és az automatikus e-mail küldést.</p>

                  {(settings.order_workflow_steps || []).map((step: any, i: number) => (
                    <div key={i} className="border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">#{i + 1}</span>
                        <Button variant="ghost" size="sm" onClick={() => {
                          const steps = [...(settings.order_workflow_steps || [])];
                          steps.splice(i, 1);
                          setSettings({ ...settings, order_workflow_steps: steps });
                        }}><X className="h-4 w-4" /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kulcs (angol)</Label>
                          <Input value={step.key} onChange={e => {
                            const steps = [...(settings.order_workflow_steps || [])];
                            steps[i] = { ...steps[i], key: e.target.value };
                            setSettings({ ...settings, order_workflow_steps: steps });
                          }} className="mt-1" placeholder="pl. processing" />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Megjelenítendő név</Label>
                          <Input value={step.label} onChange={e => {
                            const steps = [...(settings.order_workflow_steps || [])];
                            steps[i] = { ...steps[i], label: e.target.value };
                            setSettings({ ...settings, order_workflow_steps: steps });
                          }} className="mt-1" placeholder="pl. Feldolgozás" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={step.auto_email} onChange={e => {
                          const steps = [...(settings.order_workflow_steps || [])];
                          steps[i] = { ...steps[i], auto_email: e.target.checked };
                          setSettings({ ...settings, order_workflow_steps: steps });
                        }} className="h-4 w-4 accent-accent" />
                        <span className="text-xs text-muted-foreground">Automatikus e-mail küldés ennél a lépésnél</span>
                      </label>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" onClick={() => {
                    const steps = [...(settings.order_workflow_steps || [])];
                    steps.push({ key: "", label: "", auto_email: false });
                    setSettings({ ...settings, order_workflow_steps: steps });
                  }} className="w-full">
                    <Plus className="h-4 w-4 mr-2" /> Új lépés hozzáadása
                  </Button>
                </div>
              </div>
            )}

            {/* ─── Compare Settings ─── */}
            {settingsSection === "compare_settings" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Termék összehasonlítás
                  </h3>
                  <p className="text-xs text-muted-foreground">Termékek egymás melletti összehasonlításának beállításai.</p>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Összehasonlítás engedélyezése</span>
                      <p className="text-xs text-muted-foreground">Vásárlók összehasonlíthatják a termékeket</p>
                    </div>
                    <input type="checkbox" checked={settings.compare_enabled} onChange={e => setSettings({ ...settings, compare_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.compare_enabled && (
                    <>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max. összehasonlítható termékek</Label>
                        <Input type="number" value={settings.compare_max_products} onChange={e => setSettings({ ...settings, compare_max_products: Number(e.target.value) })} className="mt-1" min={2} max={10} />
                      </div>

                      <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                        <div>
                          <span className="text-sm font-semibold text-foreground">Csak különbségek mutatása</span>
                          <p className="text-xs text-muted-foreground">Alapból csak az eltérő tulajdonságok jelenjenek meg</p>
                        </div>
                        <input type="checkbox" checked={settings.compare_show_differences_only} onChange={e => setSettings({ ...settings, compare_show_differences_only: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ─── Return Rules ─── */}
            {settingsSection === "return_rules" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Visszáru szabályok
                  </h3>
                  <p className="text-xs text-muted-foreground">Visszaküldési és visszatérítési szabályok konfigurálása.</p>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Automatikus jóváhagyás</span>
                      <p className="text-xs text-muted-foreground">Visszáru kérelmek automatikus elfogadása</p>
                    </div>
                    <input type="checkbox" checked={settings.return_auto_approve} onChange={e => setSettings({ ...settings, return_auto_approve: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Visszaküldési határidő (nap)</Label>
                    <Input type="number" value={settings.return_deadline_days} onChange={e => setSettings({ ...settings, return_deadline_days: Number(e.target.value) })} className="mt-1" min={0} />
                    <p className="text-[10px] text-muted-foreground mt-1">Hány napon belül küldhet vissza terméket a vásárló.</p>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Visszatérítés módja</Label>
                    <select value={settings.return_refund_method || "original"} onChange={e => setSettings({ ...settings, return_refund_method: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                      <option value="original">Eredeti fizetési módra</option>
                      <option value="store_credit">Bolt kredit</option>
                      <option value="exchange">Csere</option>
                    </select>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-dashed">
                    <h4 className="text-xs font-bold uppercase tracking-wider">Visszaküldési okok</h4>
                    {(settings.return_reasons || []).map((reason: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input value={reason} onChange={e => {
                          const reasons = [...(settings.return_reasons || [])];
                          reasons[i] = e.target.value;
                          setSettings({ ...settings, return_reasons: reasons });
                        }} className="flex-1" />
                        <Button variant="ghost" size="sm" onClick={() => {
                          const reasons = [...(settings.return_reasons || [])];
                          reasons.splice(i, 1);
                          setSettings({ ...settings, return_reasons: reasons });
                        }}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => {
                      const reasons = [...(settings.return_reasons || [])];
                      reasons.push("");
                      setSettings({ ...settings, return_reasons: reasons });
                    }} className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Új ok hozzáadása
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Gift Card Settings ─── */}
            {settingsSection === "giftcard_settings" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Ajándékkártyák beállítás
                  </h3>
                  <p className="text-xs text-muted-foreground">Ajándékkártya rendszer konfigurálása.</p>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Ajándékkártyák engedélyezése</span>
                      <p className="text-xs text-muted-foreground">Vásárlók vásárolhatnak és beválthatnak ajándékkártyákat</p>
                    </div>
                    <input type="checkbox" checked={settings.giftcard_enabled} onChange={e => setSettings({ ...settings, giftcard_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  {settings.giftcard_enabled && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Minimum összeg (Ft)</Label>
                          <Input type="number" value={settings.giftcard_min_amount} onChange={e => setSettings({ ...settings, giftcard_min_amount: Number(e.target.value) })} className="mt-1" min={0} />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Maximum összeg (Ft)</Label>
                          <Input type="number" value={settings.giftcard_max_amount} onChange={e => setSettings({ ...settings, giftcard_max_amount: Number(e.target.value) })} className="mt-1" min={0} />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lejárati idő (hónap)</Label>
                        <Input type="number" value={settings.giftcard_expiry_months} onChange={e => setSettings({ ...settings, giftcard_expiry_months: Number(e.target.value) })} className="mt-1" min={1} />
                      </div>

                      <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                        <div>
                          <span className="text-sm font-semibold text-foreground">Egyedi design engedélyezése</span>
                          <p className="text-xs text-muted-foreground">Vásárlók választhatnak kártya designt</p>
                        </div>
                        <input type="checkbox" checked={settings.giftcard_custom_design} onChange={e => setSettings({ ...settings, giftcard_custom_design: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ─── i18n Settings ─── */}
            {settingsSection === "i18n_settings" && (
              <div className="space-y-4">
                <div className="border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Többnyelvűség kezelés
                  </h3>
                  <p className="text-xs text-muted-foreground">Nyelvi beállítások és fordítási opciók.</p>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Alapértelmezett nyelv</Label>
                    <select value={settings.i18n_default_language || "hu"} onChange={e => setSettings({ ...settings, i18n_default_language: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 py-2 text-sm">
                      <option value="hu">Magyar</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                      <option value="ro">Română</option>
                      <option value="sk">Slovenčina</option>
                      <option value="hr">Hrvatski</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider">Támogatott nyelvek</h4>
                    {(settings.i18n_supported_languages || ["hu"]).map((lang: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <select value={lang} onChange={e => {
                          const langs = [...(settings.i18n_supported_languages || [])];
                          langs[i] = e.target.value;
                          setSettings({ ...settings, i18n_supported_languages: langs });
                        }} className="flex h-10 flex-1 border border-input bg-background px-3 py-2 text-sm">
                          <option value="hu">Magyar</option>
                          <option value="en">English</option>
                          <option value="de">Deutsch</option>
                          <option value="ro">Română</option>
                          <option value="sk">Slovenčina</option>
                          <option value="hr">Hrvatski</option>
                        </select>
                        <Button variant="ghost" size="sm" onClick={() => {
                          const langs = [...(settings.i18n_supported_languages || [])];
                          langs.splice(i, 1);
                          setSettings({ ...settings, i18n_supported_languages: langs });
                        }}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => {
                      const langs = [...(settings.i18n_supported_languages || [])];
                      langs.push("en");
                      setSettings({ ...settings, i18n_supported_languages: langs });
                    }} className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Nyelv hozzáadása
                    </Button>
                  </div>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Nyelvválasztó megjelenítése</span>
                      <p className="text-xs text-muted-foreground">Nyelvi váltó gomb a header-ben</p>
                    </div>
                    <input type="checkbox" checked={settings.i18n_show_switcher} onChange={e => setSettings({ ...settings, i18n_show_switcher: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>

                  <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-foreground">Automatikus fordítás</span>
                      <p className="text-xs text-muted-foreground">Termékleírások automatikus fordítása AI segítségével</p>
                    </div>
                    <input type="checkbox" checked={settings.i18n_auto_translate} onChange={e => setSettings({ ...settings, i18n_auto_translate: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
                  </label>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
      <AdminAiAssistant />

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <AdminOrderDetail
          order={orders.find(o => o.id === selectedOrderId)!}
          onClose={() => setSelectedOrderId(null)}
          onUpdate={() => { fetchOrders(); setSelectedOrderId(null); }}
        />
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <AdminUserProfile
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

// ─── Helpers ───
const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    pending: "text-yellow-500 border-yellow-500/30",
    processing: "text-blue-400 border-blue-400/30",
    packed: "text-orange-400 border-orange-400/30",
    shipped: "text-purple-400 border-purple-400/30",
    delivered: "text-green-400 border-green-400/30",
    cancelled: "text-destructive border-destructive/30",
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${colors[status] || "text-muted-foreground"}`}>
      {statusLabel(status)}
    </span>
  );
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: "Függőben",
    processing: "Feldolgozás",
    packed: "Csomagolva",
    shipped: "Elküldve",
    delivered: "Kézbesítve",
    cancelled: "Törölve",
  };
  return map[s] || s;
};

const procurementStatusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: "Beszerzésre vár",
    ordered: "Megrendelve",
    shipped: "Szállítás alatt",
    received: "Megérkezett",
    delivered: "Átadva",
  };
  return map[s] || s;
};

const ProcurementBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    pending: "text-yellow-500 border-yellow-500/30",
    ordered: "text-blue-400 border-blue-400/30",
    shipped: "text-purple-400 border-purple-400/30",
    received: "text-green-400 border-green-400/30",
    delivered: "text-green-500 border-green-500/30",
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${colors[status] || "text-muted-foreground"}`}>
      {procurementStatusLabel(status)}
    </span>
  );
};

export default Admin;
