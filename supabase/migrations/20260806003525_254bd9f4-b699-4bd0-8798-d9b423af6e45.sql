-- ============ 1) AI WORKFLOW BUILDER ============
CREATE TABLE public.partner_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  natural_language text,
  trigger_event text NOT NULL,
  trigger_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  run_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_workflows TO authenticated;
GRANT ALL ON public.partner_workflows TO service_role;
ALTER TABLE public.partner_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner own workflows" ON public.partner_workflows FOR ALL TO authenticated
  USING (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_partner_workflows_trigger ON public.partner_workflows(trigger_event) WHERE is_active;
CREATE INDEX idx_partner_workflows_partner ON public.partner_workflows(partner_id);

CREATE TABLE public.partner_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.partner_workflows(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,
  trigger_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  step_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'running',
  error text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_workflow_runs TO authenticated;
GRANT ALL ON public.partner_workflow_runs TO service_role;
ALTER TABLE public.partner_workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner view own workflow runs" ON public.partner_workflow_runs FOR SELECT TO authenticated
  USING (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_workflow_runs_wf ON public.partner_workflow_runs(workflow_id, created_at DESC);

-- ============ 2) A/B TESZTELÉS BŐVÍTÉS ============
ALTER TABLE public.partner_ab_tests
  ADD COLUMN IF NOT EXISTS storefront_id uuid,
  ADD COLUMN IF NOT EXISTS test_type text NOT NULL DEFAULT 'hero',
  ADD COLUMN IF NOT EXISTS target_field text,
  ADD COLUMN IF NOT EXISTS variant_a_impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variant_b_impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variant_a_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variant_b_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS traffic_split integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS auto_apply boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_sample_size integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_recommendation text,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE public.partner_ab_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.partner_ab_tests(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  variant text NOT NULL,
  event_type text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  session_id text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_ab_events TO authenticated;
GRANT INSERT ON public.partner_ab_events TO anon, authenticated;
GRANT ALL ON public.partner_ab_events TO service_role;
ALTER TABLE public.partner_ab_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log ab events" ON public.partner_ab_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Partner view own ab events" ON public.partner_ab_events FOR SELECT TO authenticated
  USING (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_ab_events_test ON public.partner_ab_events(test_id, created_at DESC);

-- ============ 3) PLUGIN RENDSZER ============
CREATE TABLE public.ai_plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  industry text,
  icon text DEFAULT 'Puzzle',
  version text NOT NULL DEFAULT '1.0.0',
  author_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  author_name text,
  config_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  seed_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  agent_prompt text,
  workflow_templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  is_public boolean NOT NULL DEFAULT false,
  install_count integer NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_plugins TO authenticated;
GRANT ALL ON public.ai_plugins TO service_role;
ALTER TABLE public.ai_plugins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view approved plugins" ON public.ai_plugins FOR SELECT TO authenticated
  USING ((is_public AND status = 'approved')
     OR author_partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid())
     OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Author can create plugin" ON public.ai_plugins FOR INSERT TO authenticated
  WITH CHECK (author_partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Author can update own plugin" ON public.ai_plugins FOR UPDATE TO authenticated
  USING (author_partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (author_partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can delete plugin" ON public.ai_plugins FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- csak admin publikálhat
CREATE OR REPLACE FUNCTION public.enforce_plugin_publish_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.status = 'approved' OR NEW.is_public) AND NOT public.has_role(auth.uid(),'admin') THEN
    IF (OLD IS NULL) OR (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.is_public IS DISTINCT FROM NEW.is_public) THEN
      RAISE EXCEPTION 'Csak admin publikálhat plugint';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_ai_plugins_publish BEFORE INSERT OR UPDATE ON public.ai_plugins
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plugin_publish_admin();

CREATE TABLE public.partner_plugin_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  plugin_id uuid NOT NULL REFERENCES public.ai_plugins(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  installed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, plugin_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_plugin_installs TO authenticated;
GRANT ALL ON public.partner_plugin_installs TO service_role;
ALTER TABLE public.partner_plugin_installs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner own plugin installs" ON public.partner_plugin_installs FOR ALL TO authenticated
  USING (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_partner_workflows_updated BEFORE UPDATE ON public.partner_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partner_plugin_installs_updated BEFORE UPDATE ON public.partner_plugin_installs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();