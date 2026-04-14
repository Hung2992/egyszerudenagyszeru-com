
-- E-mail automatizációk
CREATE TABLE public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'welcome',
  delay_minutes INTEGER DEFAULT 0,
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email automations" ON public.email_automations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- API kulcsok
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_preview TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read'],
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage api keys" ON public.api_keys FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Webhookok
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['order.created'],
  secret TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage webhooks" ON public.webhooks FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Termék GYIK
CREATE TABLE public.product_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  question TEXT NOT NULL,
  answer TEXT,
  is_approved BOOLEAN DEFAULT false,
  asked_by UUID,
  answered_by UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved faqs" ON public.product_faqs FOR SELECT USING (is_approved = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can ask questions" ON public.product_faqs FOR INSERT WITH CHECK (auth.uid() = asked_by);
CREATE POLICY "Admins manage faqs" ON public.product_faqs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Tudásbázis cikkek
CREATE TABLE public.knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'general',
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published articles" ON public.knowledge_base_articles FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage articles" ON public.knowledge_base_articles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
