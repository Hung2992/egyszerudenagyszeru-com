CREATE TABLE public.platform_build_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  session_id UUID,
  project_type TEXT,
  metric_type TEXT NOT NULL DEFAULT 'ai_build',
  is_first_pass BOOLEAN NOT NULL DEFAULT false,
  quality_score INTEGER,
  qa_passed BOOLEAN,
  applied BOOLEAN NOT NULL DEFAULT false,
  duration_ms INTEGER,
  patch_fields INTEGER NOT NULL DEFAULT 0,
  ai_calls INTEGER NOT NULL DEFAULT 0,
  ai_tokens INTEGER NOT NULL DEFAULT 0,
  ai_cost_credits NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pbm_created ON public.platform_build_metrics (created_at DESC);
CREATE INDEX idx_pbm_partner ON public.platform_build_metrics (partner_id, created_at DESC);

GRANT SELECT, INSERT ON public.platform_build_metrics TO authenticated;
GRANT ALL ON public.platform_build_metrics TO service_role;
ALTER TABLE public.platform_build_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metrics_insert_authenticated" ON public.platform_build_metrics
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "metrics_select_own_partner" ON public.platform_build_metrics
  FOR SELECT TO authenticated USING (
    partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid())
  );
CREATE POLICY "metrics_admin_all" ON public.platform_build_metrics
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.pilot_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  brand_name TEXT,
  contact_email TEXT,
  cohort TEXT NOT NULL DEFAULT 'pilot-1',
  status TEXT NOT NULL DEFAULT 'invited',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_live_at TIMESTAMPTZ,
  churned_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  feedback_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pilot_partner ON public.pilot_partners (partner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilot_partners TO authenticated;
GRANT ALL ON public.pilot_partners TO service_role;
ALTER TABLE public.pilot_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pilot_admin_all" ON public.pilot_partners
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pilot_partners_updated_at BEFORE UPDATE ON public.pilot_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();