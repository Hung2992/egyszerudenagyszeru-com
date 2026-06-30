
-- ============ CAMPAIGNS (AI generated content) ============
CREATE TABLE public.partner_marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.partner_products(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('facebook','instagram','tiktok','whatsapp','email','generic')),
  title text,
  body text NOT NULL,
  hashtags text[] DEFAULT '{}',
  image_urls text[] DEFAULT '{}',
  cta_text text,
  cta_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','scheduled','sent','archived')),
  scheduled_at timestamptz,
  ai_model text,
  ai_prompt text,
  performance jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pmc_partner ON public.partner_marketing_campaigns(partner_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_marketing_campaigns TO authenticated;
GRANT ALL ON public.partner_marketing_campaigns TO service_role;
ALTER TABLE public.partner_marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner own campaigns" ON public.partner_marketing_campaigns FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- ============ SHARE LINKS (short trackable URLs) ============
CREATE TABLE public.partner_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  target_url text NOT NULL,
  product_id uuid REFERENCES public.partner_products(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.partner_marketing_campaigns(id) ON DELETE SET NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  label text,
  click_count integer NOT NULL DEFAULT 0,
  conversion_count integer NOT NULL DEFAULT 0,
  last_clicked_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_psl_partner ON public.partner_share_links(partner_id, created_at DESC);
CREATE INDEX idx_psl_code ON public.partner_share_links(code);
GRANT SELECT ON public.partner_share_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_share_links TO authenticated;
GRANT ALL ON public.partner_share_links TO service_role;
ALTER TABLE public.partner_share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active share links" ON public.partner_share_links FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Partner manage own share links" ON public.partner_share_links FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- ============ SHARE CLICKS LOG ============
CREATE TABLE public.partner_share_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id uuid NOT NULL REFERENCES public.partner_share_links(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  source text,
  referrer text,
  user_agent text,
  country text,
  device_type text,
  converted boolean DEFAULT false
);
CREATE INDEX idx_psc_link ON public.partner_share_clicks(share_link_id, clicked_at DESC);
CREATE INDEX idx_psc_partner ON public.partner_share_clicks(partner_id, clicked_at DESC);
GRANT INSERT ON public.partner_share_clicks TO anon, authenticated;
GRANT SELECT ON public.partner_share_clicks TO authenticated;
GRANT ALL ON public.partner_share_clicks TO service_role;
ALTER TABLE public.partner_share_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log clicks" ON public.partner_share_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Partner read own clicks" ON public.partner_share_clicks FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- ============ A/B TESTS ============
CREATE TABLE public.partner_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  variant_a jsonb NOT NULL,
  variant_b jsonb NOT NULL,
  variant_a_clicks integer NOT NULL DEFAULT 0,
  variant_b_clicks integer NOT NULL DEFAULT 0,
  variant_a_conversions integer NOT NULL DEFAULT 0,
  variant_b_conversions integer NOT NULL DEFAULT 0,
  winner text CHECK (winner IN ('a','b','tie',NULL)),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_ab_tests TO authenticated;
GRANT ALL ON public.partner_ab_tests TO service_role;
ALTER TABLE public.partner_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner own ab tests" ON public.partner_ab_tests FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- ============ CO-BRANDED LANDING PAGES ============
CREATE TABLE public.partner_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  slug text NOT NULL,
  product_id uuid REFERENCES public.partner_products(id) ON DELETE CASCADE,
  headline text NOT NULL,
  subheadline text,
  body_html text,
  hero_image_url text,
  partner_photo_url text,
  partner_quote text,
  cta_text text DEFAULT 'Megnézem',
  cta_url text,
  theme_color text DEFAULT '#000000',
  view_count integer NOT NULL DEFAULT 0,
  conversion_count integer NOT NULL DEFAULT 0,
  is_live_shopping boolean DEFAULT false,
  live_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, slug)
);
CREATE INDEX idx_plp_partner ON public.partner_landing_pages(partner_id);
GRANT SELECT ON public.partner_landing_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_landing_pages TO authenticated;
GRANT ALL ON public.partner_landing_pages TO service_role;
ALTER TABLE public.partner_landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active landings" ON public.partner_landing_pages FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Partner manage own landings" ON public.partner_landing_pages FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- ============ EMAIL SUBSCRIBERS ============
CREATE TABLE public.partner_email_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  source text,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_email_subscribers TO authenticated;
GRANT INSERT ON public.partner_email_subscribers TO anon;
GRANT ALL ON public.partner_email_subscribers TO service_role;
ALTER TABLE public.partner_email_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone subscribe" ON public.partner_email_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Partner own subscribers" ON public.partner_email_subscribers FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Partner manage own subscribers" ON public.partner_email_subscribers FOR UPDATE TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Partner delete own subscribers" ON public.partner_email_subscribers FOR DELETE TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- ============ EMAIL BLASTS ============
CREATE TABLE public.partner_email_blasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body_html text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  open_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_email_blasts TO authenticated;
GRANT ALL ON public.partner_email_blasts TO service_role;
ALTER TABLE public.partner_email_blasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner own blasts" ON public.partner_email_blasts FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- ============ UPDATED_AT triggers ============
CREATE TRIGGER trg_pmc_updated BEFORE UPDATE ON public.partner_marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plp_updated BEFORE UPDATE ON public.partner_landing_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPER FUNCTION: short code generator ============
CREATE OR REPLACE FUNCTION public.generate_share_code() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, 1 + floor(random()*length(chars))::int, 1);
  END LOOP;
  RETURN result;
END $$;
