-- lovable-cron-fallback-reviewed: 24 runs/day; hourly retry backstop only for failed/queued messages, sending itself is event-driven on enqueue
INSERT INTO public.messaging_templates (key, name, channel, body, active)
VALUES ('order_shipped_sms', 'Csomag úton (SMS)', 'sms', 'Szia {{name}}! Feladtuk a csomagod ({{order_number}}) 🚚 Követés: {{tracking_url}}', true)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dispatch_messaging_outbox()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/messaging-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', COALESCE((SELECT value FROM public.internal_cron_config WHERE key = 'internal_function_secret'), '')
    ),
    body := '{"action":"dispatch"}'::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispatch_messaging_outbox() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.messaging_outbox_wake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'queued' THEN
    PERFORM public.dispatch_messaging_outbox();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.messaging_outbox_wake() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_messaging_outbox_wake ON public.messaging_outbox;
CREATE TRIGGER trg_messaging_outbox_wake
AFTER INSERT ON public.messaging_outbox
FOR EACH ROW EXECUTE FUNCTION public.messaging_outbox_wake();

CREATE OR REPLACE FUNCTION public.notify_order_shipped_messaging()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_tpl record;
  v_body text;
  v_url text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF lower(NEW.status) NOT IN ('shipped', 'feladva', 'uton', 'in_transit') THEN
    RETURN NEW;
  END IF;

  v_phone := regexp_replace(COALESCE(NEW.shipping_phone, ''), '[^0-9+]', '', 'g');
  IF length(v_phone) < 9 THEN
    RETURN NEW;
  END IF;

  v_url := 'https://egyszerudenagyszeru.com/csomagkovetes?order=' || NEW.id::text;

  FOR v_tpl IN
    SELECT channel, body FROM public.messaging_templates
    WHERE active AND key IN ('order_shipped', 'order_shipped_sms')
  LOOP
    v_body := replace(v_tpl.body, '{{name}}', COALESCE(NEW.shipping_name, ''));
    v_body := replace(v_body, '{{order_number}}', left(NEW.id::text, 8));
    v_body := replace(v_body, '{{tracking_url}}', v_url);

    INSERT INTO public.messaging_outbox (channel, to_address, template_key, body, related_type, related_id, status)
    VALUES (v_tpl.channel, v_phone, 'order_shipped', v_body, 'order', NEW.id, 'queued');
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_order_shipped_messaging() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_order_shipped_messaging ON public.orders;
CREATE TRIGGER trg_order_shipped_messaging
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_shipped_messaging();

DO $$ BEGIN PERFORM cron.unschedule('messaging-dispatch-retry-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'messaging-dispatch-retry-hourly',
  '7 * * * *',
  $$
  SELECT public.dispatch_messaging_outbox()
  WHERE EXISTS (
    SELECT 1 FROM public.messaging_outbox
    WHERE status IN ('queued', 'no_provider') AND attempts < 5
  );
  $$
);