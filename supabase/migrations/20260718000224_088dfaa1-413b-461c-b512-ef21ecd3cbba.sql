
-- ============================================================
-- Partner Acquisition Engine — data model
-- ============================================================

-- 1) Kampányok
CREATE TABLE public.partner_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | paused | completed
  goal TEXT,                             -- pl. "500 divatmárka 30 nap alatt"
  target_categories TEXT[] NOT NULL DEFAULT '{}',   -- ruha, elektronika, kozmetika...
  target_countries TEXT[] NOT NULL DEFAULT '{}',
  target_languages TEXT[] NOT NULL DEFAULT '{}',
  partner_type TEXT,                     -- brand | reseller | manufacturer | creator
  channels TEXT[] NOT NULL DEFAULT '{}', -- email | instagram | tiktok | linkedin | facebook
  offer JSONB NOT NULL DEFAULT '{}'::jsonb, -- {commission, tools, marketing_support...}
  ideal_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,   -- AI generated strategy
  daily_target INT NOT NULL DEFAULT 20,
  start_date DATE,
  end_date DATE,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_campaigns TO authenticated;
GRANT ALL ON public.partner_campaigns TO service_role;
ALTER TABLE public.partner_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns admin all" ON public.partner_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Leadek (potenciális partnerek)
CREATE TABLE public.partner_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.partner_campaigns(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  website TEXT,
  category TEXT,
  country TEXT,
  language TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  discovered_via TEXT,                   -- ai_search | manual | import | referral
  ai_score NUMERIC(4,2) DEFAULT 0,       -- 0-100 fit score
  ai_notes TEXT,
  ai_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'found',
    -- found | analyzed | outreached | responded | negotiating | partner | rejected | dead
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_contacted_at TIMESTAMPTZ,
  converted_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, website)
);
CREATE INDEX idx_partner_leads_status ON public.partner_leads(status);
CREATE INDEX idx_partner_leads_campaign ON public.partner_leads(campaign_id);
CREATE INDEX idx_partner_leads_score ON public.partner_leads(ai_score DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_leads TO authenticated;
GRANT ALL ON public.partner_leads TO service_role;
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads admin all" ON public.partner_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Megkeresések (outreach)
CREATE TABLE public.partner_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.partner_leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.partner_campaigns(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,                 -- email | instagram_dm | linkedin | tiktok_dm | facebook
  subject TEXT,
  message TEXT NOT NULL,
  variant TEXT,                          -- aggressive | premium | tech | startup
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | queued | sent | delivered | opened | replied | bounced | failed
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_text TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  ai_model TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partner_outreach_lead ON public.partner_outreach(lead_id);
CREATE INDEX idx_partner_outreach_status ON public.partner_outreach(status);
CREATE INDEX idx_partner_outreach_channel ON public.partner_outreach(channel);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_outreach TO authenticated;
GRANT ALL ON public.partner_outreach TO service_role;
ALTER TABLE public.partner_outreach ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach admin all" ON public.partner_outreach
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) AI insight / learning loop
CREATE TABLE public.partner_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.partner_campaigns(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,                   -- campaign | channel | category | message_variant | global
  scope_key TEXT,                        -- pl. "instagram", "fashion", "aggressive"
  metric TEXT NOT NULL,                  -- response_rate | conversion_rate | open_rate | reply_time
  value NUMERIC,
  sample_size INT DEFAULT 0,
  recommendation TEXT,
  confidence NUMERIC(4,3) DEFAULT 0,
  applied BOOLEAN NOT NULL DEFAULT false,
  observed_from TIMESTAMPTZ,
  observed_to TIMESTAMPTZ,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partner_ai_insights_scope ON public.partner_ai_insights(scope, scope_key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_ai_insights TO authenticated;
GRANT ALL ON public.partner_ai_insights TO service_role;
ALTER TABLE public.partner_ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai insights admin all" ON public.partner_ai_insights
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Lead státusz history (audit)
CREATE TABLE public.partner_lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.partner_leads(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_status_history_lead ON public.partner_lead_status_history(lead_id);
GRANT SELECT, INSERT ON public.partner_lead_status_history TO authenticated;
GRANT ALL ON public.partner_lead_status_history TO service_role;
ALTER TABLE public.partner_lead_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead history admin read" ON public.partner_lead_status_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lead history admin insert" ON public.partner_lead_status_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger a state history-ra
CREATE OR REPLACE FUNCTION public.partner_leads_track_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.partner_lead_status_history (lead_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_partner_leads_status
  AFTER UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.partner_leads_track_status();

-- updated_at triggerek
CREATE TRIGGER trg_partner_campaigns_updated
  BEFORE UPDATE ON public.partner_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partner_leads_updated
  BEFORE UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partner_outreach_updated
  BEFORE UPDATE ON public.partner_outreach
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
