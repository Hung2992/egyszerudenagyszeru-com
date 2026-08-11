CREATE TABLE public.ai_agent_marketplace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL,
  description text,
  system_prompt text,
  model text,
  category text,
  industry text,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_monthly numeric DEFAULT 0,
  is_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending_review',
  author_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  install_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_agent_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  marketplace_agent_id uuid NOT NULL REFERENCES public.ai_agent_marketplace(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  installed_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (partner_id, marketplace_agent_id)
);

CREATE TABLE public.ai_agent_memory_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL,
  feature_key text NOT NULL,
  feature_value text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_count integer NOT NULL DEFAULT 1,
  success_score numeric,
  confidence numeric,
  source_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (signal_type, feature_key, feature_value)
);

CREATE TABLE public.partner_memory_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  consented_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (partner_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_marketplace TO authenticated;
GRANT ALL ON public.ai_agent_marketplace TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_installs TO authenticated;
GRANT ALL ON public.ai_agent_installs TO service_role;
GRANT SELECT ON public.ai_agent_memory_signals TO authenticated;
GRANT ALL ON public.ai_agent_memory_signals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_memory_consent TO authenticated;
GRANT ALL ON public.partner_memory_consent TO service_role;

ALTER TABLE public.ai_agent_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_memory_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_memory_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketplace agents visible to everyone when approved" ON public.ai_agent_marketplace FOR SELECT USING (status = 'approved' AND is_public = true);
CREATE POLICY "Partners can see their own submitted agents" ON public.ai_agent_marketplace FOR SELECT USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = ai_agent_marketplace.author_partner_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins can see all marketplace agents" ON public.ai_agent_marketplace FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners can submit their own agents" ON public.ai_agent_marketplace FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = ai_agent_marketplace.author_partner_id AND p.user_id = auth.uid()));
CREATE POLICY "Authors can update their own pending agents" ON public.ai_agent_marketplace FOR UPDATE USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = ai_agent_marketplace.author_partner_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = ai_agent_marketplace.author_partner_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins can update all marketplace agents" ON public.ai_agent_marketplace FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete marketplace agents" ON public.ai_agent_marketplace FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners manage their own agent installs" ON public.ai_agent_installs FOR ALL USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = ai_agent_installs.partner_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = ai_agent_installs.partner_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins manage all agent installs" ON public.ai_agent_installs FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read aggregate memory signals" ON public.ai_agent_memory_signals FOR SELECT USING (true);
CREATE POLICY "Admins can write memory signals" ON public.ai_agent_memory_signals FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners manage their own memory consent" ON public.partner_memory_consent FOR ALL USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_memory_consent.partner_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_memory_consent.partner_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins can read all memory consent" ON public.partner_memory_consent FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_agent_marketplace_updated_at BEFORE UPDATE ON public.ai_agent_marketplace FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_agent_installs_updated_at BEFORE UPDATE ON public.ai_agent_installs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_agent_memory_signals_updated_at BEFORE UPDATE ON public.ai_agent_memory_signals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partner_memory_consent_updated_at BEFORE UPDATE ON public.partner_memory_consent FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();