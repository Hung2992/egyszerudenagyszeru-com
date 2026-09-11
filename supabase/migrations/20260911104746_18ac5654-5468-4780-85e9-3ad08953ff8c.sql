CREATE TABLE IF NOT EXISTS public.messaging_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messaging_templates TO authenticated;
GRANT ALL ON public.messaging_templates TO service_role;
ALTER TABLE public.messaging_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage messaging templates" ON public.messaging_templates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.messaging_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  to_address text NOT NULL,
  template_key text,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider text,
  provider_message_id text,
  error text,
  partner_id uuid,
  related_type text,
  related_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.messaging_outbox TO authenticated;
GRANT ALL ON public.messaging_outbox TO service_role;
ALTER TABLE public.messaging_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read outbox" ON public.messaging_outbox
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "partners read own outbox" ON public.messaging_outbox
  FOR SELECT TO authenticated USING (
    partner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.partners p WHERE p.id = messaging_outbox.partner_id AND p.user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_messaging_outbox_status_sendat ON public.messaging_outbox (status, send_at);

CREATE TRIGGER trg_messaging_templates_updated BEFORE UPDATE ON public.messaging_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_messaging_outbox_updated BEFORE UPDATE ON public.messaging_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.partner_email_blasts
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS excerpt text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS published_on_site boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_blast_slug ON public.partner_email_blasts (partner_id, slug) WHERE slug IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_email_blasts TO authenticated;
GRANT SELECT ON public.partner_email_blasts TO anon;
GRANT ALL ON public.partner_email_blasts TO service_role;

DROP POLICY IF EXISTS "partners manage own blasts" ON public.partner_email_blasts;
CREATE POLICY "partners manage own blasts" ON public.partner_email_blasts
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_email_blasts.partner_id AND p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_email_blasts.partner_id AND p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );
DROP POLICY IF EXISTS "public read published blasts" ON public.partner_email_blasts;
CREATE POLICY "public read published blasts" ON public.partner_email_blasts
  FOR SELECT TO anon, authenticated USING (published_on_site = true);

INSERT INTO public.messaging_templates (key, name, channel, body, variables) VALUES
  ('order_confirmed','Rendelés visszaigazolás','sms','Szia {{name}}! Rendelésedet ({{order_number}}) sikeresen fogadtuk. Köszönjük! - Egyszerű de Nagyszerű','["name","order_number"]'::jsonb),
  ('order_shipped','Csomag úton','whatsapp','Úton van a csomagod 🚚 Követés: {{tracking_url}}','["tracking_url"]'::jsonb),
  ('booking_confirmed','Foglalás visszaigazolás','sms','Foglalásod rögzítve: {{service}} – {{date}} {{time}}.','["service","date","time"]'::jsonb),
  ('booking_reminder','Foglalás emlékeztető','sms','Emlékeztető: holnap {{time}} időpontod van ({{service}}).','["service","time"]'::jsonb)
ON CONFLICT (key) DO NOTHING;