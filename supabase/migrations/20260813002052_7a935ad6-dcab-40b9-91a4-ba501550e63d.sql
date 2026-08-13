INSERT INTO public.internal_cron_config (key, value)
VALUES ('internal_function_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  s text;
BEGIN
  SELECT value INTO s FROM public.internal_cron_config WHERE key = 'internal_function_secret';

  BEGIN PERFORM cron.unschedule('ai-agent-bus-sync-every-minute'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule(
    'ai-agent-bus-sync-every-minute',
    '* * * * *',
    format($f$
      SELECT net.http_post(
        url:='https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/ai-agent-bus-sync',
        headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
        body:='{"triggered_by":"cron"}'::jsonb
      ) AS request_id;
    $f$, s)
  );

  BEGIN PERFORM cron.unschedule('launch-automation-5min'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule(
    'launch-automation-5min',
    '*/5 * * * *',
    format($f$
      SELECT net.http_post(
        url:='https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/launch-automation',
        headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
        body:='{"trigger":"cron"}'::jsonb
      ) AS request_id;
    $f$, s)
  );
END $$;