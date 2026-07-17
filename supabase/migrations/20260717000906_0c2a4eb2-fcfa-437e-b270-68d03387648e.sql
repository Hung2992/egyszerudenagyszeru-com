-- 1. AI Agents registry
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  emoji TEXT,
  role TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  model TEXT DEFAULT 'google/gemini-2.5-flash',
  autonomy_level TEXT NOT NULL DEFAULT 'aggressive' CHECK (autonomy_level IN ('conservative', 'balanced', 'aggressive')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  schedule_cron TEXT,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage AI agents" ON public.ai_agents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. AI Agent Tasks
CREATE TABLE public.ai_agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug TEXT NOT NULL,
  assigned_by TEXT,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'needs_approval', 'approved', 'rejected')),
  priority INTEGER NOT NULL DEFAULT 5,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  auto_executed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cost_credits NUMERIC(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_agent_tasks_status ON public.ai_agent_tasks(status, priority DESC, created_at DESC);
CREATE INDEX idx_ai_agent_tasks_agent ON public.ai_agent_tasks(agent_slug, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_tasks TO authenticated;
GRANT ALL ON public.ai_agent_tasks TO service_role;
ALTER TABLE public.ai_agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent tasks" ON public.ai_agent_tasks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. AI Agent Runs (execution log)
CREATE TABLE public.ai_agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug TEXT NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'cron',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  tasks_created INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_credits NUMERIC(10, 4) NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_agent_runs_agent ON public.ai_agent_runs(agent_slug, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_runs TO authenticated;
GRANT ALL ON public.ai_agent_runs TO service_role;
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view agent runs" ON public.ai_agent_runs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Cross-agent events (agent-to-agent communication)
CREATE TABLE public.ai_agent_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_agent TEXT NOT NULL,
  to_agent TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_agent_events_unprocessed ON public.ai_agent_events(processed, created_at) WHERE processed = false;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_events TO authenticated;
GRANT ALL ON public.ai_agent_events TO service_role;
ALTER TABLE public.ai_agent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view agent events" ON public.ai_agent_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Morning Briefings
CREATE TABLE public.ai_agent_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_date DATE NOT NULL DEFAULT CURRENT_DATE,
  headline TEXT,
  summary TEXT,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  pending_approvals INTEGER NOT NULL DEFAULT 0,
  read_by_admin BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_agent_briefings_date ON public.ai_agent_briefings(brief_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_briefings TO authenticated;
GRANT ALL ON public.ai_agent_briefings TO service_role;
ALTER TABLE public.ai_agent_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view briefings" ON public.ai_agent_briefings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger
CREATE OR REPLACE FUNCTION public.update_ai_agent_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ai_agents_updated BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_agent_timestamp();
CREATE TRIGGER trg_ai_agent_tasks_updated BEFORE UPDATE ON public.ai_agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_agent_timestamp();

-- Seed the 8 agents
INSERT INTO public.ai_agents (slug, name, emoji, role, description, autonomy_level, schedule_cron, capabilities) VALUES
('ceo', 'AI CEO', '🧠', 'orchestrator',
  'Figyeli az egész webshopot, dönt a prioritásokról, feladatokat oszt ki a többi AI-nak, éjszakai briefinget készít.',
  'aggressive', '0 2 * * *',
  '["prioritize", "delegate", "morning_brief", "cross_agent_coordination"]'::jsonb),
('marketing', 'AI Marketing', '📈', 'marketing',
  'Facebook/Instagram/TikTok/Google tartalmak, kampánytervezés, SEO, hirdetési szövegek, képek és videók.',
  'aggressive', '0 3 * * *',
  '["social_posts", "seo_optimization", "campaign_planning", "ad_copy", "image_generation"]'::jsonb),
('partner', 'AI Partner', '🤝', 'partner_acquisition',
  'Új partnereket keres, elemzi a cégeket, megkereső leveleket készít, követi a válaszokat.',
  'aggressive', '0 4 * * *',
  '["company_research", "outreach_emails", "lead_scoring", "follow_up"]'::jsonb),
('sales', 'AI Sales', '🛒', 'sales',
  'Figyeli a kosárelhagyást, kuponokat ajánl, upsell/cross-sell, konverzió elemzés.',
  'aggressive', '*/30 * * * *',
  '["abandoned_cart", "coupon_suggestions", "upsell", "cross_sell", "conversion_analysis"]'::jsonb),
('inventory', 'AI Inventory', '📦', 'inventory',
  'Készletfigyelés, automatikus rendelési javaslatok, fogyási előrejelzés (30/60/90 nap).',
  'aggressive', '0 5 * * *',
  '["stock_monitoring", "reorder_suggestions", "demand_forecast", "dead_stock_detection"]'::jsonb),
('finance', 'AI Finance', '💰', 'finance',
  'Bevételek, profit, költségek, pénzügyi riportok, anomália-detektálás.',
  'aggressive', '0 6 * * *',
  '["revenue_report", "profit_analysis", "cost_tracking", "anomaly_detection", "forecast"]'::jsonb),
('security', 'AI Security', '🛡️', 'security',
  'Csalásfigyelés, gyanús rendelések, botok felismerése, biztonsági események.',
  'aggressive', '*/15 * * * *',
  '["fraud_detection", "bot_detection", "security_events", "suspicious_orders"]'::jsonb),
('support', 'AI Support', '🎧', 'customer_support',
  'Ügyfélszolgálat, rendeléskövetés, visszaküldések, GYIK auto-válaszok.',
  'aggressive', '*/10 * * * *',
  '["order_tracking", "returns_handling", "faq_answers", "ticket_triage"]'::jsonb);
