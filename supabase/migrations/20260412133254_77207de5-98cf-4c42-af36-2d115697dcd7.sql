ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS ab_testing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ab_tests jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS flash_sale_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flash_sale_rules jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_reward_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reward_points integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS review_reward_photo_bonus integer DEFAULT 25,
  ADD COLUMN IF NOT EXISTS ticketing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ticketing_auto_assign boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ticketing_priorities jsonb DEFAULT '["alacsony","közepes","magas","sürgős"]'::jsonb,
  ADD COLUMN IF NOT EXISTS ticketing_sla_hours integer DEFAULT 24;