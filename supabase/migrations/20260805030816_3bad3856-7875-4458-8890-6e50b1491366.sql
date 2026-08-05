CREATE TABLE public.partner_ai_build_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  session_id uuid,
  label text NOT NULL DEFAULT 'AI módosítás',
  before_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_fields text[] NOT NULL DEFAULT '{}',
  quality_score integer,
  restored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pabs_partner ON public.partner_ai_build_snapshots(partner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_ai_build_snapshots TO authenticated;
GRANT ALL ON public.partner_ai_build_snapshots TO service_role;

ALTER TABLE public.partner_ai_build_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner manages own build snapshots"
ON public.partner_ai_build_snapshots FOR ALL TO authenticated
USING (public.owns_partner(partner_id))
WITH CHECK (public.owns_partner(partner_id));

CREATE TABLE public.ai_build_playbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type text NOT NULL,
  request_summary text NOT NULL,
  winning_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_score integer NOT NULL,
  quality_tier text,
  lessons text[] NOT NULL DEFAULT '{}',
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_playbook_type_score ON public.ai_build_playbook(project_type, quality_score DESC);

GRANT SELECT ON public.ai_build_playbook TO authenticated;
GRANT ALL ON public.ai_build_playbook TO service_role;

ALTER TABLE public.ai_build_playbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read playbook"
ON public.ai_build_playbook FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins manage playbook"
ON public.ai_build_playbook FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));