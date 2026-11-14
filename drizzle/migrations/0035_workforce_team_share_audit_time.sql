CREATE OR REPLACE FUNCTION public.workforce_team_share(_source text, _target text, _title text, _content text, _plan uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k uuid := gen_random_uuid(); findings text[]; payload jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF public.aegis_agent_allowed('workforce-assistant') <> 'active' THEN RAISE EXCEPTION 'AEGIS: az asszisztens leállítva'; END IF;
 IF _source IS NULL OR _source !~ '^(0[1-9]|1[0-9]|20)$' OR (_target IS NOT NULL AND (_target !~ '^(0[1-9]|1[0-9]|20)$' OR _target = _source)) THEN RAISE EXCEPTION 'Érvénytelen munkatárs'; END IF;
 IF length(trim(coalesce(_title,''))) NOT BETWEEN 3 AND 120 OR length(trim(coalesce(_content,''))) NOT BETWEEN 10 AND 4000 THEN RAISE EXCEPTION 'Hiányzó vagy túl hosszú adat'; END IF;
 IF _plan IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workforce_plans WHERE id = _plan) THEN RAISE EXCEPTION 'Nincs ilyen terv'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':team-share',0));
 IF (SELECT count(*) FROM empyrean_audit_log WHERE actor_id = auth.uid() AND action = 'team_share' AND at > now() - interval '1 minute') >= 20 THEN RAISE EXCEPTION 'Túl sok megosztás, várj egy percet'; END IF;
 findings := public.aegis_scan(_title || ' ' || _content);
 IF EXISTS(SELECT 1 FROM unnest(findings) f WHERE f LIKE 'block:%') THEN RAISE EXCEPTION 'AEGIS: ez az adat nem osztható meg'; END IF;
 payload := jsonb_build_object('title', trim(_title), 'content', trim(_content), 'source', _source, 'target', _target, 'plan_id', _plan, 'confirmed_by', auth.uid(), 'kind', CASE WHEN _target IS NULL THEN 'knowledge' ELSE 'handoff' END);
 INSERT INTO ai_agent_bus_context(namespace,key,value,produced_by) VALUES('workforce-team', k::text,payload,'workforce:' || _source);
 INSERT INTO ai_agent_bus_events(event_type,source_agent,target_agent,payload,correlation_id) VALUES('workforce.team.shared','workforce:' || _source, CASE WHEN _target IS NOT NULL THEN 'workforce:' || _target END,payload,k);
 INSERT INTO empyrean_audit_log(actor_id,agent_slug,action,target,detail) VALUES(auth.uid(),'workforce-assistant','team_share',k::text,payload);
 RETURN k;
END $$;
REVOKE ALL ON FUNCTION public.workforce_team_share(text,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workforce_team_share(text,text,text,text,uuid) TO authenticated;