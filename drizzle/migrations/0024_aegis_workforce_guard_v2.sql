-- AEGIS WORKFORCE őr v2: álcázás-felismerés, minden mező ellenőrzése, tartalomhoz kötött jóváhagyás

CREATE OR REPLACE FUNCTION public.aegis_variants(_t text)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE nz text; folded text; leet text; joined text; out text[]; m text[]; d text;
BEGIN
  nz := regexp_replace(coalesce(_t,''), '[\u200B\u200C\u200D\u2060\uFEFF\u00AD]', '', 'g');
  folded := normalize(nz, NFKC);
  leet := translate(lower(folded), '013457@$', 'oieastas');
  joined := leet;
  FOR m IN SELECT regexp_matches(leet, '((?:\m\w\M[ ._*-]+){3,}\w\M)', 'g') LOOP
    joined := replace(joined, m[1], regexp_replace(m[1], '[ ._*-]+', '', 'g'));
  END LOOP;
  out := ARRAY[nz, folded, leet, joined];
  FOR m IN SELECT regexp_matches(nz, '([A-Za-z0-9+/]{24,}={0,2})', 'g') LOOP
    BEGIN
      d := convert_from(decode(m[1], 'base64'), 'UTF8');
      IF d ~ '^[[:print:][:space:]]+$' THEN out := out || d; END IF;
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
  RETURN out;
END $$;

-- csak Luhn-érvényes kártyaszám számít kártyaadatnak (dátumok, rendelésszámok nem)
CREATE OR REPLACE FUNCTION public.aegis_has_card(_t text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE m text[]; dg text; s int; n int; i int; L int;
BEGIN
  FOR m IN SELECT regexp_matches(coalesce(_t,''), '((?:\d[ -]?){13,19})', 'g') LOOP
    dg := regexp_replace(m[1], '\D', '', 'g'); L := length(dg);
    IF L BETWEEN 13 AND 19 THEN
      s := 0;
      FOR i IN 0..L-1 LOOP
        n := substr(dg, L - i, 1)::int;
        IF i % 2 = 1 THEN n := n * 2; IF n > 9 THEN n := n - 9; END IF; END IF;
        s := s + n;
      END LOOP;
      IF s % 10 = 0 THEN RETURN true; END IF;
    END IF;
  END LOOP;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.aegis_scan(_t text)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE vs text[] := public.aegis_variants(_t); f text[] := '{}'; r record; raw_block boolean := false;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('block:prompt_injection', '(ignore|disregard|forget|hagyd figyelmen kívül|felejtsd el|ne vedd figyelembe).{0,40}(instruction|rules|utasítás|szabály)|jailbreak|szűrők nélkül|korlátok nélkül|developer mode|fejlesztői mód'),
    ('block:prompt_exfiltration', 'system prompt|rendszerprompt|(reveal|show|print|repeat|mutasd meg|írd ki|add ki|ismételd meg).{0,40}(rejtett utasítás|hidden instruction)'),
    ('block:credential', '(service[_ ]?role|api[_ -]?kulcs|api[_ -]?key|jelszav|jelszó|password|secret|\.env|titkos kulcs|eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_)'),
    ('block:privilege', '(adj|tegyél|legyen|grant|make me).{0,30}(admin|szuperadmin|super admin)|rls.{0,20}(kikapcs|töröl|disable)|bypass'),
    ('block:self_permission', '(saját|magad|magának|önmag)\w*.{0,30}(jogosultság|jogkör|engedély|permission)|(jogosultság|jogkör|engedély|permission)\w*.{0,30}(saját magá|önmag|magadnak)'),
    ('block:audit_tamper', '\m(napló\w*|audit\w*|logs?)\M.{0,30}(töröl|kikapcs|átír|delete|disable|wipe)|(töröl|kikapcs|delete|disable|wipe)\w*.{0,30}\m(napló\w*|audit\w*|logs?)\M'),
    ('block:security_bypass', 'aegis.{0,30}(kikapcs|megkerül|disable|bypass|gyengít)|(kikapcs|megkerül|disable|gyengít)\w*.{0,30}(aegis|biztonsági|vészleállít|security)|vészleállítás.{0,20}(kikapcs|felold)'),
    ('block:ssrf', '(localhost|127\.0\.0\.1|169\.254\.|metadata\.google|0\.0\.0\.0|\[::1\])'),
    ('block:destructive_sql', 'drop\s+(table|schema|database)|truncate\s+table|delete\s+from\s+\w+\s*(;|$)'),
    ('warn:permanent_delete', '(végleges|visszavonhatatlan|permanent)\w*.{0,20}(töröl|delete)'),
    ('warn:mass_change', '(mind(en|et)|összes).{0,30}(töröl|felülír|átír)'),
    ('warn:money', '(utal|visszatérít|kifizet|refund|ár(at|ak) (módosít|átír|emel|csökkent))'),
    ('warn:external_comm', '(küld|kiküld|publikál|élesít|send|publish)\w*.{0,30}(e-?mail|sms|hírlevel|ügyfel|vásárló|élesbe|nyilvános)')
  ) v(code, re) LOOP
    IF EXISTS (SELECT 1 FROM unnest(vs) x WHERE x ~* r.re) THEN
      f := f || r.code;
      IF r.code LIKE 'block:%' AND coalesce(_t,'') ~* r.re THEN raw_block := true; END IF;
    END IF;
  END LOOP;
  IF public.aegis_has_card(_t) OR coalesce(_t,'') ~* '\mcvv\M|\mcvc\M' THEN f := f || 'block:card_data'; raw_block := true; END IF;
  -- csak álcázva (leetspeak, láthatatlan karakter, széthúzás, base64) lett veszélyes -> külön jelölés
  IF EXISTS (SELECT 1 FROM unnest(f) x WHERE x LIKE 'block:%') AND NOT raw_block THEN f := f || 'block:obfuscation'; END IF;
  RETURN f;
END $$;

CREATE OR REPLACE FUNCTION public.aegis_risk_floor(_f text[], _risk text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _risk = 'red' OR 'warn:money' = ANY(_f) OR 'warn:permanent_delete' = ANY(_f) THEN 'red'
    WHEN _risk = 'yellow' OR 'warn:mass_change' = ANY(_f) OR 'warn:external_comm' = ANY(_f) THEN 'yellow'
    ELSE 'green' END
$$;

-- terv: cél + felelős ellenőrzése, a kockázat csak felfelé módosulhat
CREATE OR REPLACE FUNCTION public.workforce_guard_plan()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE f text[] := public.aegis_scan(coalesce(NEW.goal,'') || E'\n' || coalesce(NEW.owner,''));
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(f) x WHERE x LIKE 'block:%') THEN
    RAISE EXCEPTION 'AEGIS blokk: %', array_to_string(f, ', '); END IF;
  NEW.risk := public.aegis_risk_floor(f, NEW.risk);
  NEW.plan := NEW.plan || jsonb_build_object('aegis', to_jsonb(f));
  RETURN NEW;
END $$;

-- lépések: minden szövegmező ellenőrzése (eddig csak a cél volt), csak tervezet állapotban vehetők fel
CREATE OR REPLACE FUNCTION public.workforce_guard_step()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE f text[]; st text; rk text;
BEGIN
  SELECT status, risk INTO st, rk FROM workforce_plans WHERE id = NEW.plan_id;
  IF st IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'AEGIS: jóváhagyott tervhez nem adható új lépés'; END IF;
  f := public.aegis_scan(concat_ws(E'\n', NEW.phase, NEW.owner, NEW.reviewer, NEW.task, NEW.evidence));
  IF EXISTS (SELECT 1 FROM unnest(f) x WHERE x LIKE 'block:%') THEN
    RAISE EXCEPTION 'AEGIS blokk a(z) % lépésben: %', NEW.idx + 1, array_to_string(f, ', '); END IF;
  IF public.aegis_risk_floor(f, rk) <> rk THEN
    UPDATE workforce_plans SET risk = public.aegis_risk_floor(f, rk), plan = plan || jsonb_build_object('aegis_steps', to_jsonb(f)) WHERE id = NEW.plan_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS workforce_guard_step ON public.workforce_plan_steps;
CREATE TRIGGER workforce_guard_step BEFORE INSERT ON public.workforce_plan_steps FOR EACH ROW EXECUTE FUNCTION public.workforce_guard_step();

-- a mentett tartalom változtathatatlan; a kockázat nem csökkenthető
CREATE OR REPLACE FUNCTION public.workforce_plan_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE o int := CASE OLD.risk WHEN 'red' THEN 2 WHEN 'yellow' THEN 1 ELSE 0 END;
        n int := CASE NEW.risk WHEN 'red' THEN 2 WHEN 'yellow' THEN 1 ELSE 0 END;
BEGIN
  IF NEW.goal IS DISTINCT FROM OLD.goal OR NEW.owner IS DISTINCT FROM OLD.owner OR NEW.due_date IS DISTINCT FROM OLD.due_date
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'AEGIS: a munkaterv tartalma mentés után nem módosítható'; END IF;
  IF n < o THEN RAISE EXCEPTION 'AEGIS: a kockázati szint nem csökkenthető'; END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan AND OLD.status <> 'draft' THEN RAISE EXCEPTION 'AEGIS: jóváhagyott terv tartalma nem módosítható'; END IF;
  IF NEW.payload_hash IS DISTINCT FROM OLD.payload_hash AND NEW.approved_at IS NOT DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'AEGIS: a jóváhagyási ujjlenyomat csak jóváhagyáskor állítható'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.workforce_step_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id OR NEW.idx IS DISTINCT FROM OLD.idx OR NEW.phase IS DISTINCT FROM OLD.phase
     OR NEW.owner IS DISTINCT FROM OLD.owner OR NEW.reviewer IS DISTINCT FROM OLD.reviewer OR NEW.task IS DISTINCT FROM OLD.task
     OR NEW.evidence IS DISTINCT FROM OLD.evidence OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    RAISE EXCEPTION 'AEGIS: a lépés tartalma mentés után nem módosítható'; END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.workforce_plans ADD COLUMN IF NOT EXISTS payload_hash text;

CREATE OR REPLACE FUNCTION public.workforce_payload_hash(_plan uuid)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT encode(sha256(convert_to(
    p.goal || '|' || p.risk || '|' || p.owner || '|' || coalesce(p.due_date::text,'') || '|' ||
    coalesce((SELECT string_agg(concat_ws('§', s.idx, s.phase, s.owner, s.reviewer, s.task, s.evidence, s.due_date), '¶' ORDER BY s.idx)
              FROM workforce_plan_steps s WHERE s.plan_id = p.id), ''), 'UTF8')), 'hex')
  FROM workforce_plans p WHERE p.id = _plan
$$;

-- már jóváhagyott tervek: a mostani tartalomhoz kötjük (backfill az új oszlophoz, a trigger előtt)
UPDATE public.workforce_plans SET payload_hash = public.workforce_payload_hash(id) WHERE status IN ('approved','in_progress') AND payload_hash IS NULL;

DROP TRIGGER IF EXISTS workforce_plan_immutable ON public.workforce_plans;
CREATE TRIGGER workforce_plan_immutable BEFORE UPDATE ON public.workforce_plans FOR EACH ROW EXECUTE FUNCTION public.workforce_plan_immutable();
DROP TRIGGER IF EXISTS workforce_step_immutable ON public.workforce_plan_steps;
CREATE TRIGGER workforce_step_immutable BEFORE UPDATE ON public.workforce_plan_steps FOR EACH ROW EXECUTE FUNCTION public.workforce_step_immutable();

-- jóváhagyás: újraellenőrzés a legfrissebb AEGIS-szabályokkal + tartalom-ujjlenyomat rögzítése
CREATE OR REPLACE FUNCTION public.workforce_set_status(_plan uuid, _status text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur text; rk text; f text[]; h text;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT status, risk INTO cur, rk FROM workforce_plans WHERE id = _plan FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'nincs ilyen terv'; END IF;
  IF NOT ((cur = 'draft' AND _status IN ('approved','cancelled')) OR (cur IN ('approved','in_progress') AND _status = 'cancelled')) THEN
    RAISE EXCEPTION 'tiltott állapotváltás: % → %', cur, _status; END IF;
  IF _status = 'approved' THEN
    SELECT public.aegis_scan(p.goal || E'\n' || p.owner || E'\n' || coalesce(string_agg(concat_ws(E'\n', s.phase, s.owner, s.reviewer, s.task, s.evidence), E'\n'), ''))
      INTO f FROM workforce_plans p LEFT JOIN workforce_plan_steps s ON s.plan_id = p.id WHERE p.id = _plan GROUP BY p.goal, p.owner;
    IF EXISTS (SELECT 1 FROM unnest(f) x WHERE x LIKE 'block:%') THEN
      INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (_plan, 'aegis_blocked', auth.uid(), jsonb_build_object('phase', 'approval', 'findings', to_jsonb(f)));
      RETURN;
    END IF;
    IF public.aegis_risk_floor(f, rk) <> rk THEN rk := public.aegis_risk_floor(f, rk); UPDATE workforce_plans SET risk = rk WHERE id = _plan; END IF;
    IF rk = 'red' AND char_length(coalesce(trim(_note),'')) < 10 THEN
      RAISE EXCEPTION 'AEGIS: piros kockázatú tervhez írásos indoklás kell (min. 10 karakter)'; END IF;
    h := public.workforce_payload_hash(_plan);
  END IF;
  UPDATE workforce_plans SET status = _status, updated_at = now(),
    approved_by = CASE WHEN _status='approved' THEN auth.uid() ELSE approved_by END,
    approved_at = CASE WHEN _status='approved' THEN now() ELSE approved_at END,
    approval_expires_at = CASE WHEN _status='approved' THEN now() + interval '72 hours' ELSE approval_expires_at END,
    payload_hash = CASE WHEN _status='approved' THEN h ELSE payload_hash END
  WHERE id = _plan;
  INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (_plan, _status, auth.uid(),
    jsonb_build_object('from', cur, 'note', left(_note, 500), 'risk', rk, 'payload_hash', h, 'aegis', to_jsonb(coalesce(f, '{}'))));
END $$;

CREATE OR REPLACE FUNCTION public.workforce_reapprove(_plan uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p workforce_plans;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO p FROM workforce_plans WHERE id = _plan FOR UPDATE;
  IF p.status <> 'approved' OR p.approval_expires_at IS NULL OR p.approval_expires_at > now() THEN RAISE EXCEPTION 'csak lejárt jóváhagyás újítható meg'; END IF;
  IF p.payload_hash IS DISTINCT FROM public.workforce_payload_hash(_plan) THEN
    RAISE EXCEPTION 'AEGIS: a terv tartalma a jóváhagyás óta megváltozott — új tervet kell készíteni'; END IF;
  IF p.risk = 'red' AND char_length(coalesce(trim(_note),'')) < 10 THEN RAISE EXCEPTION 'AEGIS: piros tervhez indoklás kell'; END IF;
  UPDATE workforce_plans SET approved_by = auth.uid(), approved_at = now(), approval_expires_at = now() + interval '72 hours', updated_at = now() WHERE id = _plan;
  INSERT INTO workforce_audit(plan_id, action, actor, detail) VALUES (_plan, 'reapproved', auth.uid(), jsonb_build_object('note', left(_note, 500), 'payload_hash', p.payload_hash));
END $$;

-- végrehajtás: ha a tartalom eltér a jóváhagyottól, az AEGIS leállítja a tervet
CREATE OR REPLACE FUNCTION public.workforce_execute_step(_step uuid, _confirmed boolean, _ok boolean, _result text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st workforce_plan_steps; p workforce_plans; blockers int; remaining int; f text[]; recent int; strikes int; h text;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM empyrean_emergency_controls WHERE scope = 'global' AND (paused OR read_only)) THEN
    RAISE EXCEPTION 'AEGIS: vészleállítás aktív — végrehajtás tiltva'; END IF;
  SELECT count(*) INTO strikes FROM workforce_audit WHERE actor = auth.uid() AND action IN ('aegis_blocked','aegis_tamper') AND created_at > now() - interval '10 minutes';
  IF strikes >= 3 THEN RAISE EXCEPTION 'AEGIS: 3 blokkolt kísérlet 10 percen belül — végrehajtás 10 percre zárolva'; END IF;
  SELECT count(*) INTO recent FROM workforce_audit WHERE actor = auth.uid() AND action IN ('step_done','step_failed') AND created_at > now() - interval '1 minute';
  IF recent >= 20 THEN RAISE EXCEPTION 'AEGIS: túl sok végrehajtás percenként (max. 20)'; END IF;
  IF _confirmed IS NOT TRUE THEN RAISE EXCEPTION 'megerősítés nélkül nem hajtható végre'; END IF;
  IF char_length(coalesce(trim(_result),'')) < 3 THEN RAISE EXCEPTION 'eredmény/bizonyíték kötelező'; END IF;
  SELECT * INTO st FROM workforce_plan_steps WHERE id = _step FOR UPDATE;
  IF st.id IS NULL THEN RAISE EXCEPTION 'nincs ilyen lépés'; END IF;
  f := public.aegis_scan(_result);
  IF EXISTS (SELECT 1 FROM unnest(f) x WHERE x LIKE 'block:%') THEN
    INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail)
    VALUES (st.plan_id, _step, 'aegis_blocked', auth.uid(), jsonb_build_object('phase', st.phase, 'findings', to_jsonb(f)));
    RETURN 'aegis_blocked';
  END IF;
  SELECT * INTO p FROM workforce_plans WHERE id = st.plan_id FOR UPDATE;
  IF p.status NOT IN ('approved','in_progress') THEN RAISE EXCEPTION 'a terv nincs jóváhagyva (%)', p.status; END IF;
  IF p.status = 'approved' AND p.approval_expires_at IS NOT NULL AND p.approval_expires_at < now() THEN
    RAISE EXCEPTION 'AEGIS: a jóváhagyás lejárt — újítsd meg'; END IF;
  h := public.workforce_payload_hash(p.id);
  IF p.payload_hash IS NULL OR p.payload_hash <> h THEN
    UPDATE workforce_plans SET status = 'cancelled', updated_at = now() WHERE id = p.id;
    INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail)
    VALUES (p.id, _step, 'aegis_tamper', auth.uid(), jsonb_build_object('phase', st.phase, 'findings', jsonb_build_array('payload_tamper'), 'approved_hash', p.payload_hash, 'current_hash', h));
    RETURN 'aegis_tamper';
  END IF;
  IF st.status = 'done' THEN RAISE EXCEPTION 'a lépés már kész (ismételt végrehajtás tiltva)'; END IF;
  SELECT count(*) INTO blockers FROM workforce_plan_steps WHERE plan_id = st.plan_id AND idx < st.idx AND status <> 'done';
  IF blockers > 0 THEN RAISE EXCEPTION 'előbb az előző lépéseket kell befejezni'; END IF;
  UPDATE workforce_plan_steps SET status = CASE WHEN _ok THEN 'done' ELSE 'failed' END, result = left(_result, 2000), executed_by = auth.uid(), executed_at = now() WHERE id = _step;
  SELECT count(*) INTO remaining FROM workforce_plan_steps WHERE plan_id = st.plan_id AND status <> 'done';
  UPDATE workforce_plans SET status = CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END, updated_at = now() WHERE id = st.plan_id;
  INSERT INTO workforce_audit(plan_id, step_id, action, actor, detail) VALUES (st.plan_id, _step, CASE WHEN _ok THEN 'step_done' ELSE 'step_failed' END, auth.uid(), jsonb_build_object('phase', st.phase, 'result', left(_result, 500), 'aegis', to_jsonb(f), 'payload_hash', h));
  IF remaining = 0 THEN INSERT INTO workforce_audit(plan_id, action, actor) VALUES (st.plan_id, 'done', auth.uid()); END IF;
  RETURN CASE WHEN remaining = 0 THEN 'done' ELSE 'in_progress' END;
END $$;

CREATE OR REPLACE FUNCTION public.aegis_log_workforce()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.action IN ('aegis_blocked','aegis_tamper') THEN
    INSERT INTO aegis_events(source, stage, action, findings)
    VALUES ('workforce', 'workforce', 'blocked', ARRAY(SELECT jsonb_array_elements_text(coalesce(NEW.detail->'findings','[]'))));
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.aegis_variants(text), public.aegis_has_card(text), public.aegis_scan(text), public.aegis_risk_floor(text[], text),
  public.workforce_guard_step(), public.workforce_plan_immutable(), public.workforce_step_immutable(), public.workforce_payload_hash(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workforce_set_status(uuid,text,text), public.workforce_reapprove(uuid,text), public.workforce_execute_step(uuid,boolean,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workforce_set_status(uuid,text,text), public.workforce_reapprove(uuid,text), public.workforce_execute_step(uuid,boolean,boolean,text) TO authenticated;