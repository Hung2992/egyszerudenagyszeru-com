-- lovable-cron-fallback-reviewed: 288 runs/day; időzített automatizmus-emailek (pl. 3 órás elhagyott kosár, 24 órás követő) pontos kézbesítéséhez szükséges, eseményvezérelve nem késleltethető
CREATE TABLE IF NOT EXISTS public.marketing_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  phone text,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'subscribed',
  user_id uuid,
  partner_id uuid,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_contacts TO authenticated;
GRANT ALL ON public.marketing_contacts TO service_role;
ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing_contacts" ON public.marketing_contacts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  segment text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'draft',
  provider_status text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing_campaigns" ON public.marketing_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.marketing_campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.marketing_contacts(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending_provider',
  provider text,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaign_sends TO authenticated;
GRANT ALL ON public.marketing_campaign_sends TO service_role;
ALTER TABLE public.marketing_campaign_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing_campaign_sends" ON public.marketing_campaign_sends
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.marketing_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  template_name text NOT NULL,
  delay_minutes integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_automations TO authenticated;
GRANT ALL ON public.marketing_automations TO service_role;
ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing_automations" ON public.marketing_automations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.marketing_automations (key, name, description, trigger_type, template_name, delay_minutes, active)
VALUES
  ('welcome_signup', 'Üdvözlő email regisztráció után', 'Regisztrációkor automatikus üdvözlő üzenet.', 'signup', 'welcome', 0, true),
  ('purchase_followup', 'Vásárlás utáni követő email', 'Rendelés leadása után 24 órával köszönő és visszajelzés-kérő email.', 'purchase', 'purchase-followup', 1440, true),
  ('abandoned_cart', 'Elhagyott kosár emlékeztető', 'Ha 3 órája van termék a kosárban rendelés nélkül.', 'abandoned_cart', 'abandoned-cart', 180, false)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.marketing_automation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_key text NOT NULL,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_automation_queue TO authenticated;
GRANT ALL ON public.marketing_automation_queue TO service_role;
ALTER TABLE public.marketing_automation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing_automation_queue" ON public.marketing_automation_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_marketing_queue_due ON public.marketing_automation_queue (status, send_at);

CREATE TABLE IF NOT EXISTS public.marketing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.marketing_events TO authenticated;
GRANT ALL ON public.marketing_events TO service_role;
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read marketing_events" ON public.marketing_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.marketing_sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending_provider',
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.marketing_sms_log TO authenticated;
GRANT ALL ON public.marketing_sms_log TO service_role;
ALTER TABLE public.marketing_sms_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read marketing_sms_log" ON public.marketing_sms_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.enqueue_marketing_automation(
  p_key text, p_email text, p_data jsonb, p_idem text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a record;
BEGIN
  SELECT * INTO a FROM public.marketing_automations WHERE key = p_key AND active = true;
  IF NOT FOUND THEN RETURN; END IF;
  IF p_email IS NULL OR p_email = '' THEN RETURN; END IF;
  INSERT INTO public.marketing_automation_queue
    (automation_key, template_name, recipient_email, template_data, send_at, idempotency_key)
  VALUES
    (p_key, a.template_name, lower(p_email), COALESCE(p_data, '{}'::jsonb),
     now() + make_interval(mins => a.delay_minutes), p_idem)
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketing_on_profile_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    INSERT INTO public.marketing_contacts (email, name, phone, source, user_id)
    VALUES (lower(NEW.email), NEW.display_name, NEW.phone, 'signup', NEW.user_id)
    ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = now();
    PERFORM public.enqueue_marketing_automation(
      'welcome_signup', NEW.email,
      jsonb_build_object('name', COALESCE(NEW.display_name, '')),
      'welcome-' || COALESCE(NEW.user_id::text, NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_on_profile ON public.profiles;
CREATE TRIGGER trg_marketing_on_profile AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.marketing_on_profile_insert();

CREATE OR REPLACE FUNCTION public.marketing_on_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  v_email := NEW.customer_email;
  IF v_email IS NULL OR v_email = '' THEN RETURN NEW; END IF;
  INSERT INTO public.marketing_contacts (email, name, phone, source, user_id)
  VALUES (lower(v_email), NEW.shipping_name, NEW.shipping_phone, 'purchase', NEW.user_id)
  ON CONFLICT (email) DO UPDATE SET updated_at = now();
  PERFORM public.enqueue_marketing_automation(
    'purchase_followup', v_email,
    jsonb_build_object('name', COALESCE(NEW.shipping_name, ''), 'order_id', NEW.id::text, 'total', NEW.total_amount),
    'purchase-' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_on_order ON public.orders;
CREATE TRIGGER trg_marketing_on_order AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.marketing_on_order_insert();

DO $$ BEGIN PERFORM cron.unschedule('marketing-automation-worker-5min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
INSERT INTO public.internal_cron_config (key, value)
VALUES ('internal_function_secret', gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;

SELECT cron.schedule(
  'marketing-automation-worker-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/marketing-automation-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', COALESCE((SELECT value FROM public.internal_cron_config WHERE key = 'internal_function_secret'), '')
    ),
    body := '{}'::jsonb
  );
  $$
);