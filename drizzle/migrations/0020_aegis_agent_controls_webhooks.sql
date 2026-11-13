CREATE TABLE public.aegis_agent_controls (
  agent text PRIMARY KEY CHECK (char_length(agent) BETWEEN 1 AND 80),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','paused','isolated','revoked','killed')),
  reason text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aegis_agent_controls TO authenticated;
GRANT ALL ON public.aegis_agent_controls TO service_role;
ALTER TABLE public.aegis_agent_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read agent controls" ON public.aegis_agent_controls FOR SELECT TO authenticated USING (public.empyrean_is_admin());

CREATE TABLE public.aegis_webhook_replay (
  digest text PRIMARY KEY,
  source text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.aegis_webhook_replay TO service_role;
ALTER TABLE public.aegis_webhook_replay ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.aegis_events DROP CONSTRAINT IF EXISTS aegis_events_stage_check;
ALTER TABLE public.aegis_events ADD CONSTRAINT aegis_events_stage_check CHECK (stage IN ('input','output','workforce','agent','webhook'));

-- '*' = GLOBAL STOP for all AI agents
CREATE OR REPLACE FUNCTION public.aegis_set_agent_state(_agent text, _state text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur text;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _state NOT IN ('active','paused','isolated','revoked','killed') THEN RAISE EXCEPTION 'ismeretlen állapot'; END IF;
  IF char_length(coalesce(trim(_reason),'')) < 5 THEN RAISE EXCEPTION 'AEGIS: indoklás kötelező (min. 5 karakter)'; END IF;
  SELECT state INTO cur FROM aegis_agent_controls WHERE agent = _agent FOR UPDATE;
  IF cur = 'killed' AND _state = 'active' AND char_length(trim(_reason)) < 20 THEN
    RAISE EXCEPTION 'AEGIS: leállított ügynök újraindításához részletes indoklás kell (min. 20 karakter)'; END IF;
  INSERT INTO aegis_agent_controls(agent, state, reason, updated_by, updated_at) VALUES (_agent, _state, left(_reason, 500), auth.uid(), now())
  ON CONFLICT (agent) DO UPDATE SET state = EXCLUDED.state, reason = EXCLUDED.reason, updated_by = EXCLUDED.updated_by, updated_at = now();
  INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
  VALUES (auth.uid(), 'aegis', 'agent_state', _agent, jsonb_build_object('from', coalesce(cur,'active'), 'to', _state, 'reason', left(_reason, 500)));
END $$;

-- service-role check used by every AI call
CREATE OR REPLACE FUNCTION public.aegis_agent_allowed(_agent text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT 'global:' || state FROM aegis_agent_controls WHERE agent = '*' AND state <> 'active'),
    (SELECT state FROM aegis_agent_controls WHERE agent = _agent AND state <> 'active'),
    'active')
$$;

CREATE OR REPLACE FUNCTION public.aegis_webhook_seen(_digest text, _source text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM aegis_webhook_replay WHERE received_at < now() - interval '7 days';
  INSERT INTO aegis_webhook_replay(digest, source) VALUES (_digest, _source);
  RETURN false;
EXCEPTION WHEN unique_violation THEN RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.aegis_set_agent_state(text,text,text), public.aegis_agent_allowed(text), public.aegis_webhook_seen(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aegis_set_agent_state(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aegis_agent_allowed(text), public.aegis_webhook_seen(text,text) TO service_role;