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
      f := array_append(f, r.code::text);
      IF r.code LIKE 'block:%' AND coalesce(_t,'') ~* r.re THEN raw_block := true; END IF;
    END IF;
  END LOOP;
  IF public.aegis_has_card(_t) OR coalesce(_t,'') ~* '\mcvv\M|\mcvc\M' THEN f := array_append(f, 'block:card_data'::text); raw_block := true; END IF;
  IF EXISTS (SELECT 1 FROM unnest(f) x WHERE x LIKE 'block:%') AND NOT raw_block THEN f := array_append(f, 'block:obfuscation'::text); END IF;
  RETURN f;
END $$;
REVOKE ALL ON FUNCTION public.aegis_scan(text) FROM PUBLIC, anon, authenticated;