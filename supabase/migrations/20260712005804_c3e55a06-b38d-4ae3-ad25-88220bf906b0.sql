-- Belső cron konfiguráció (admin-only)
CREATE TABLE IF NOT EXISTS public.internal_cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_cron_config TO service_role;
ALTER TABLE public.internal_cron_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only service role" ON public.internal_cron_config
  FOR ALL USING (false) WITH CHECK (false);

-- Idempotens: régi feladatok törlése
DO $$ BEGIN PERFORM cron.unschedule('poll-shipment-status-15min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('sync-pickup-points-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'poll-shipment-status-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/poll-shipment-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', COALESCE((SELECT value FROM public.internal_cron_config WHERE key = 'shipment_cron_secret'), '')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'sync-pickup-points-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/sync-pickup-points',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', COALESCE((SELECT value FROM public.internal_cron_config WHERE key = 'shipment_cron_secret'), '')
    ),
    body := '{}'::jsonb
  );
  $$
);