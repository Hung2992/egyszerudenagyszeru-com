CREATE TABLE public.partner_ai_builder_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Új beszélgetés',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_ai_builder_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.partner_ai_builder_sessions(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL DEFAULT '',
  agent_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  patch jsonb,
  applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_brand_memory (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pab_messages_session ON public.partner_ai_builder_messages(session_id, created_at);
CREATE INDEX idx_pab_sessions_partner ON public.partner_ai_builder_sessions(partner_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_ai_builder_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_ai_builder_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_brand_memory TO authenticated;
GRANT ALL ON public.partner_ai_builder_sessions TO service_role;
GRANT ALL ON public.partner_ai_builder_messages TO service_role;
GRANT ALL ON public.partner_brand_memory TO service_role;

ALTER TABLE public.partner_ai_builder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ai_builder_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_brand_memory ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_partner(_partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = _partner_id AND p.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "Partner manages own builder sessions"
ON public.partner_ai_builder_sessions FOR ALL TO authenticated
USING (public.owns_partner(partner_id))
WITH CHECK (public.owns_partner(partner_id));

CREATE POLICY "Partner manages own builder messages"
ON public.partner_ai_builder_messages FOR ALL TO authenticated
USING (public.owns_partner(partner_id))
WITH CHECK (public.owns_partner(partner_id));

CREATE POLICY "Partner manages own brand memory"
ON public.partner_brand_memory FOR ALL TO authenticated
USING (public.owns_partner(partner_id))
WITH CHECK (public.owns_partner(partner_id));