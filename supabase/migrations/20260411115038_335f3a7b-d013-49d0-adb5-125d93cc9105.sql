
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS reply_to_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sender_name text DEFAULT NULL;
