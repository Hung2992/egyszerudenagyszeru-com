-- AEGIS: lezárjuk a nyilvános képtárak listázását (a nyilvános fájl-URL-ek továbbra is működnek)
DROP POLICY IF EXISTS "Anyone can read product images storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access on product-images" ON storage.objects;
DROP POLICY IF EXISTS "Read individual product images" ON storage.objects;
DROP POLICY IF EXISTS "public read backgrounds" ON storage.objects;

-- AEGIS incidensek: DETECT -> ISOLATE -> REVOKE -> PRESERVE LOGS
CREATE TABLE public.aegis_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('leak_isolate','attack_wave','stop_storm')),
  severity text NOT NULL CHECK (severity IN ('high','critical')),
  action_taken text NOT NULL,
  event_count int NOT NULL,
  findings text[] NOT NULL DEFAULT '{}',
  preserved_events jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution text
);
CREATE INDEX aegis_incidents_open_idx ON public.aegis_incidents(agent, kind) WHERE status = 'open';
GRANT SELECT ON public.aegis_incidents TO authenticated;
GRANT ALL ON public.aegis_incidents TO service_role;
ALTER TABLE public.aegis_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read aegis incidents" ON public.aegis_incidents FOR SELECT TO authenticated USING (public.empyrean_is_admin());

-- az incidens tartalma (bizonyíték) utólag nem írható át, csak lezárható
CREATE OR REPLACE FUNCTION public.aegis_incident_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'AEGIS: incidens nem törölhető'; END IF;
  IF OLD.status = 'resolved' THEN RAISE EXCEPTION 'AEGIS: lezárt incidens nem módosítható'; END IF;
  IF NEW.agent IS DISTINCT FROM OLD.agent OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.event_count IS DISTINCT FROM OLD.event_count
     OR NEW.findings IS DISTINCT FROM OLD.findings OR NEW.preserved_events IS DISTINCT FROM OLD.preserved_events
     OR NEW.opened_at IS DISTINCT FROM OLD.opened_at OR NEW.action_taken IS DISTINCT FROM OLD.action_taken THEN
    RAISE EXCEPTION 'AEGIS: az incidens bizonyítéka nem módosítható';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER aegis_incident_guard BEFORE UPDATE OR DELETE ON public.aegis_incidents FOR EACH ROW EXECUTE FUNCTION public.aegis_incident_guard();

-- automatikus észlelés minden AEGIS-eseménynél
CREATE OR REPLACE FUNCTION public.aegis_detect()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; f text[]; ev jsonb; cur text;
BEGIN
  IF NEW.source IN ('workforce','*') OR NEW.stage IN ('workforce','webhook') THEN RETURN NEW; END IF;

  -- 1) Szivárgás: az ügynök kimenete 10 percen belül 3-szor kitakarandó adatot tartalmazott -> automatikus ISOLATE
  IF NEW.stage = 'output' AND NEW.action = 'redacted' THEN
    SELECT count(*), array_agg(DISTINCT x) INTO n, f
      FROM aegis_events e LEFT JOIN LATERAL unnest(e.findings) x ON true
     WHERE e.source = NEW.source AND e.stage = 'output' AND e.action = 'redacted' AND e.created_at > now() - interval '10 minutes';
    SELECT count(*) INTO n FROM aegis_events WHERE source = NEW.source AND stage = 'output' AND action = 'redacted' AND created_at > now() - interval '10 minutes';
    IF n >= 3 AND NOT EXISTS (SELECT 1 FROM aegis_incidents WHERE agent = NEW.source AND kind = 'leak_isolate' AND status = 'open') THEN
      SELECT state INTO cur FROM aegis_agent_controls WHERE agent = NEW.source;
      IF coalesce(cur,'active') IN ('active','paused') THEN
        INSERT INTO aegis_agent_controls(agent, state, reason, updated_by, updated_at)
        VALUES (NEW.source, 'isolated', 'AEGIS automatikus elkülönítés: ismételt adatszivárgás a kimenetben', NULL, now())
        ON CONFLICT (agent) DO UPDATE SET state = 'isolated', reason = EXCLUDED.reason, updated_by = NULL, updated_at = now();
      END IF;
      SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC), '[]') INTO ev FROM (
        SELECT id, source, stage, action, findings, created_at FROM aegis_events WHERE source = NEW.source AND created_at > now() - interval '1 hour' ORDER BY created_at DESC LIMIT 50) e;
      INSERT INTO aegis_incidents(agent, kind, severity, action_taken, event_count, findings, preserved_events)
      VALUES (NEW.source, 'leak_isolate', 'critical', CASE WHEN coalesce(cur,'active') IN ('active','paused') THEN 'isolated' ELSE 'already_' || cur END, n, coalesce(f,'{}'), ev);
      INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
      VALUES (NULL, 'aegis', 'auto_isolate', NEW.source, jsonb_build_object('events', n, 'findings', f, 'from', coalesce(cur,'active')));
      INSERT INTO admin_notifications(type, title, message, data)
      VALUES ('aegis_incident', 'AEGIS: AI-segéd automatikusan elkülönítve', NEW.source || ' kimenete 10 percen belül ' || n || '-szor tartalmazott kitakarandó adatot. Az AEGIS elkülönítette; újraindítás csak indoklással.', jsonb_build_object('agent', NEW.source, 'kind', 'leak_isolate'));
    END IF;
  END IF;

  -- 2) Támadási hullám: 10 percen belül 10+ blokkolt bemenet. Nem állítjuk le a segédet (különben a támadó leállíthatná), csak riasztunk.
  IF NEW.stage = 'input' AND NEW.action = 'blocked' THEN
    SELECT count(*) INTO n FROM aegis_events WHERE source = NEW.source AND stage = 'input' AND action = 'blocked' AND created_at > now() - interval '10 minutes';
    IF n >= 10 AND NOT EXISTS (SELECT 1 FROM aegis_incidents WHERE agent = NEW.source AND kind = 'attack_wave' AND status = 'open' AND opened_at > now() - interval '1 hour') THEN
      SELECT array_agg(DISTINCT x) INTO f FROM aegis_events e, unnest(e.findings) x WHERE e.source = NEW.source AND e.stage = 'input' AND e.created_at > now() - interval '10 minutes';
      SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC), '[]') INTO ev FROM (
        SELECT id, source, stage, action, findings, created_at FROM aegis_events WHERE source = NEW.source AND created_at > now() - interval '1 hour' ORDER BY created_at DESC LIMIT 50) e;
      INSERT INTO aegis_incidents(agent, kind, severity, action_taken, event_count, findings, preserved_events)
      VALUES (NEW.source, 'attack_wave', 'high', 'alerted', n, coalesce(f,'{}'), ev);
      INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
      VALUES (NULL, 'aegis', 'attack_wave', NEW.source, jsonb_build_object('events', n, 'findings', f));
      INSERT INTO admin_notifications(type, title, message, data)
      VALUES ('aegis_incident', 'AEGIS: támadási hullám', NEW.source || ' felé 10 percen belül ' || n || ' veszélyes kérés érkezett. Mindet elutasítottuk.', jsonb_build_object('agent', NEW.source, 'kind', 'attack_wave'));
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER aegis_detect AFTER INSERT ON public.aegis_events FOR EACH ROW EXECUTE FUNCTION public.aegis_detect();

-- incidens lezárása: részletes indoklás, opcionális újraindítás
CREATE OR REPLACE FUNCTION public.aegis_resolve_incident(_id uuid, _resolution text, _reactivate boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inc aegis_incidents%ROWTYPE;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF char_length(coalesce(trim(_resolution),'')) < 20 THEN RAISE EXCEPTION 'AEGIS: az incidens lezárásához részletes indoklás kell (min. 20 karakter)'; END IF;
  SELECT * INTO inc FROM aegis_incidents WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'nincs ilyen incidens'; END IF;
  IF inc.status <> 'open' THEN RAISE EXCEPTION 'AEGIS: az incidens már le van zárva'; END IF;
  UPDATE aegis_incidents SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid(), resolution = left(_resolution, 1000) WHERE id = _id;
  IF _reactivate AND inc.kind = 'leak_isolate' THEN
    UPDATE aegis_agent_controls SET state = 'active', reason = 'Incidens lezárva: ' || left(_resolution, 400), updated_by = auth.uid(), updated_at = now()
     WHERE agent = inc.agent AND state = 'isolated';
  END IF;
  INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
  VALUES (auth.uid(), 'aegis', 'incident_resolved', inc.agent, jsonb_build_object('incident', _id, 'kind', inc.kind, 'reactivated', _reactivate AND inc.kind = 'leak_isolate', 'resolution', left(_resolution, 500)));
END $$;
REVOKE ALL ON FUNCTION public.aegis_detect(), public.aegis_incident_guard(), public.aegis_resolve_incident(uuid,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aegis_resolve_incident(uuid,text,boolean) TO authenticated;