CREATE TABLE public.social_publish_permissions(user_id uuid NOT NULL, mode text NOT NULL CHECK(mode IN ('test','live')), granted_by uuid NOT NULL, granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, PRIMARY KEY(user_id,mode));
GRANT SELECT ON public.social_publish_permissions TO authenticated;
GRANT ALL ON public.social_publish_permissions TO service_role;
ALTER TABLE public.social_publish_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_permission_read ON public.social_publish_permissions FOR SELECT TO authenticated USING(public.empyrean_is_admin());
ALTER TABLE public.social_publish_queue ADD COLUMN test_only boolean NOT NULL DEFAULT false, ADD COLUMN execution_actor uuid;
CREATE OR REPLACE FUNCTION public.social_has_permission(_user uuid,_mode text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce(public.has_role(_user,'admin') AND EXISTS(SELECT 1 FROM public.social_publish_permissions WHERE user_id=_user AND mode=_mode AND revoked_at IS NULL),false) $$;
REVOKE ALL ON FUNCTION public.social_has_permission(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_has_permission(uuid,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.social_set_permission(_user uuid,_mode text,_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.empyrean_is_admin() OR _mode NOT IN ('test','live') OR NOT public.has_role(_user,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 INSERT INTO public.social_publish_permissions(user_id,mode,granted_by,revoked_at) VALUES(_user,_mode,auth.uid(),CASE WHEN _enabled THEN NULL ELSE now() END) ON CONFLICT(user_id,mode) DO UPDATE SET granted_by=auth.uid(),granted_at=now(),revoked_at=CASE WHEN _enabled THEN NULL ELSE now() END;
 INSERT INTO public.empyrean_audit_log(actor_id,agent_slug,action,target,detail) VALUES(auth.uid(),'social-publisher','publication_permission',_user::text,jsonb_build_object('mode',_mode,'enabled',_enabled));
 END $$;
REVOKE ALL ON FUNCTION public.social_set_permission(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_set_permission(uuid,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.social_permission_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND (NEW.test_only IS DISTINCT FROM OLD.test_only OR NEW.execution_actor IS DISTINCT FROM OLD.execution_actor) AND current_setting('app.social_governance',true) IS DISTINCT FROM 'rpc' THEN RAISE EXCEPTION 'social_controlled_rpc_required'; END IF;
 IF TG_OP='UPDATE' AND NEW.approved_by IS DISTINCT FROM OLD.approved_by AND NEW.approved_by IS NOT NULL AND NOT public.social_has_permission(NEW.approved_by,CASE WHEN NEW.test_only THEN 'test' ELSE 'live' END) THEN RAISE EXCEPTION 'publication_permission_required'; END IF;
 IF NEW.status='processing' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
 IF NEW.test_only THEN RAISE EXCEPTION 'test_content_cannot_publish'; END IF;
 IF NOT public.social_has_permission(NEW.execution_actor,'live') OR NOT public.social_has_permission(NEW.approved_by,'live') THEN RAISE EXCEPTION 'publication_permission_required'; END IF;
 END IF; RETURN NEW;
 END $$;
CREATE TRIGGER social_z_permission_guard BEFORE INSERT OR UPDATE ON public.social_publish_queue FOR EACH ROW EXECUTE FUNCTION public.social_permission_guard();
CREATE OR REPLACE FUNCTION public.social_event_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE q public.social_publish_queue; s public.social_auto_publish_settings; tags text[]; t text; BEGIN
 IF NEW.queue_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO q FROM public.social_publish_queue WHERE id=NEW.queue_id;
 SELECT * INTO s FROM public.social_auto_publish_settings LIMIT 1;
 tags:=coalesce(q.hashtags,'{}')||coalesce(s.default_hashtags,'{}');
 SELECT string_agg(CASE WHEN x LIKE '#%' THEN x ELSE '#'||x END,' ' ORDER BY ord) INTO t FROM unnest(tags) WITH ORDINALITY AS a(x,ord) WHERE x<>'';
 NEW.payload:=NEW.payload || jsonb_build_object('content',q.content,'rendered_content',left(q.content||CASE WHEN t IS NULL THEN '' ELSE E'\n\n'||t END,2200),'media_urls',q.media_urls,'hashtags',tags,'scheduled_at',q.scheduled_at,'version',q.version,'test_only',q.test_only,'executor',coalesce(NEW.payload->>'actor',q.execution_actor::text,q.approved_by::text),'recorded_at',NEW.created_at);
 RETURN NEW;
 END $$;
CREATE TRIGGER social_event_exact_snapshot BEFORE INSERT ON public.social_publish_events FOR EACH ROW EXECUTE FUNCTION public.social_event_snapshot();
CREATE OR REPLACE FUNCTION public.social_dispatch_claim(_id uuid,_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE q public.social_publish_queue; r jsonb; BEGIN
 SELECT * INTO q FROM public.social_publish_queue WHERE id=_id FOR UPDATE;
 IF q.id IS NULL THEN RETURN jsonb_build_object('allowed',false,'reason','not_found'); END IF;
 IF q.test_only THEN r:=jsonb_build_object('allowed',false,'reason','test_content_cannot_publish');
 ELSIF NOT public.social_has_permission(_actor,'live') THEN r:=jsonb_build_object('allowed',false,'reason','publication_permission_required');
 ELSE
 PERFORM set_config('app.social_governance','rpc',true);
 UPDATE public.social_publish_queue SET execution_actor=_actor WHERE id=_id;
 r:=public.social_claim(_id);
 END IF;
 INSERT INTO public.social_publish_events(queue_id,event_type,platform,payload) VALUES(_id,'publication_attempt',q.platform,r||jsonb_build_object('actor',_actor));
 RETURN r;
 END $$;
REVOKE ALL ON FUNCTION public.social_dispatch_claim(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.social_dispatch_claim(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.social_authorized_preflight(_id uuid,_token uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.social_preflight(_id,_token) AND EXISTS(SELECT 1 FROM public.social_publish_queue WHERE id=_id AND NOT test_only AND public.social_has_permission(execution_actor,'live') AND public.social_has_permission(approved_by,'live')) $$;
REVOKE ALL ON FUNCTION public.social_authorized_preflight(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.social_authorized_preflight(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.social_test_run(_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE q public.social_publish_queue; reason text; BEGIN
 IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO q FROM public.social_publish_queue WHERE id=_id FOR UPDATE;
 IF q.id IS NULL OR NOT q.test_only THEN RAISE EXCEPTION 'test_only_required'; END IF;
 IF NOT public.social_has_permission(auth.uid(),'test') THEN reason:='publication_permission_required';
 ELSIF q.status<>'pending' THEN reason:='not_pending';
 ELSIF q.approval_hash IS NULL OR q.approval_hash<>public.social_payload_hash(q) OR q.approval_expires_at IS NULL OR q.approval_expires_at<=now() OR NOT public.social_has_permission(q.approved_by,'test') THEN reason:='approval_required';
 ELSIF public.aegis_agent_allowed('social-publisher')<>'active' OR NOT EXISTS(SELECT 1 FROM public.empyrean_emergency_controls WHERE scope='global' AND NOT paused AND NOT read_only) OR EXISTS(SELECT 1 FROM public.empyrean_emergency_controls WHERE scope IN ('marketing','social-publisher',q.platform,'campaign:'||q.campaign_id::text) AND (paused OR read_only)) THEN reason:='aegis_stopped';
 ELSIF cardinality(public.aegis_scan(q.content))>0 THEN reason:='aegis_review_required';
 ELSE reason:='test_passed'; END IF;
 INSERT INTO public.social_publish_events(queue_id,event_type,platform,payload) VALUES(_id,'test_publication_attempt',q.platform,jsonb_build_object('actor',auth.uid(),'result',reason,'external_calls',0));
 RETURN jsonb_build_object('ok',reason='test_passed','result',reason,'external_calls',0,'mode','test');
 END $$;
REVOKE ALL ON FUNCTION public.social_test_run(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_test_run(uuid) TO authenticated;