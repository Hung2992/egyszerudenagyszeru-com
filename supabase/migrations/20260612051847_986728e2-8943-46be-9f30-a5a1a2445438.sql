
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS welcome20_cron_token text;

UPDATE public.store_settings
SET welcome20_cron_token = encode(gen_random_bytes(24), 'hex')
WHERE welcome20_cron_token IS NULL OR welcome20_cron_token = '';
