
CREATE OR REPLACE FUNCTION public.dispatch_comm_webhooks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  SELECT value INTO v_secret FROM public.internal_cron_config WHERE key = 'internal_function_secret';
  IF v_secret IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.comm_webhook_deliveries
    WHERE status IN ('queued','retry') AND next_retry_at <= now()
  ) THEN RETURN; END IF;

  v_url := 'https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/comm-webhook-dispatch';
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Secret', v_secret),
    body := '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.comm_webhook_wake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.dispatch_comm_webhooks();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comm_webhook_wake ON public.comm_webhook_deliveries;
CREATE TRIGGER trg_comm_webhook_wake
AFTER INSERT ON public.comm_webhook_deliveries
FOR EACH ROW EXECUTE FUNCTION public.comm_webhook_wake();

REVOKE EXECUTE ON FUNCTION public.dispatch_comm_webhooks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.comm_webhook_wake() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('comm-webhook-retry-hourly', '7 * * * *', $$SELECT public.dispatch_comm_webhooks();$$);
