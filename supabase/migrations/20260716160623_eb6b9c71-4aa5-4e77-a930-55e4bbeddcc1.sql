
CREATE TABLE public.partner_recruitment_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  tone TEXT NOT NULL DEFAULT 'lelkes, magabiztos, magyar KKV-barát',
  target_audience TEXT NOT NULL DEFAULT 'Magyar KKV tulajdonosok, streetwear/divat márkák, kézműves készítők, dropshipperek, akik saját webshopot szeretnének költségek nélkül',
  value_props TEXT NOT NULL DEFAULT 'Ingyenes saját webshop • Egyedi domain • AI marketing eszközök • 0% havidíj • Automatikus szállítás • QR-kódok, szórólapok, e-mail kampányok',
  custom_instructions TEXT DEFAULT '',
  posts_per_run INT NOT NULL DEFAULT 3,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_recruitment_agent_config TO authenticated;
GRANT ALL ON public.partner_recruitment_agent_config TO service_role;
ALTER TABLE public.partner_recruitment_agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage recruitment config" ON public.partner_recruitment_agent_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.partner_recruitment_agent_config (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

CREATE TABLE public.partner_recruitment_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','tiktok')),
  title TEXT,
  body TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  cta TEXT,
  image_prompt TEXT,
  image_url TEXT,
  video_script TEXT,
  hook TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','published','discarded')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  generated_by UUID REFERENCES auth.users(id),
  angle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_recruitment_posts TO authenticated;
GRANT ALL ON public.partner_recruitment_posts TO service_role;
ALTER TABLE public.partner_recruitment_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage recruitment posts" ON public.partner_recruitment_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_prp_platform_status ON public.partner_recruitment_posts(platform, status, created_at DESC);
