CREATE TABLE public.partner_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  content_html text NOT NULL DEFAULT '',
  meta_title text,
  meta_description text,
  is_published boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, slug)
);
GRANT SELECT ON public.partner_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_pages TO authenticated;
GRANT ALL ON public.partner_pages TO service_role;
ALTER TABLE public.partner_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published pages" ON public.partner_pages FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "partner manage own pages" ON public.partner_pages FOR ALL TO authenticated USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())) WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
CREATE POLICY "admin manage all pages" ON public.partner_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.partner_pages_touch() RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER partner_pages_updated_at BEFORE UPDATE ON public.partner_pages FOR EACH ROW EXECUTE FUNCTION public.partner_pages_touch();