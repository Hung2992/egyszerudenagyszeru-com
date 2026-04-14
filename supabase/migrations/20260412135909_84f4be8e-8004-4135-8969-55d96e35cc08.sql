ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS gdpr_cookie_consent_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gdpr_data_retention_days integer DEFAULT 365,
  ADD COLUMN IF NOT EXISTS gdpr_privacy_policy_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS api_webhooks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS api_key_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_maintenance_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_cache_version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS social_media_integrations jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_auto_posting boolean DEFAULT false;