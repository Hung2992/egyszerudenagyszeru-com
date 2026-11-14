ALTER TABLE public.social_publish_queue ADD COLUMN IF NOT EXISTS approval_hash text, ADD COLUMN IF NOT EXISTS approval_expires_at timestamptz, ADD COLUMN IF NOT EXISTS execution_token uuid, ADD COLUMN IF NOT EXISTS execution_started_at timestamptz;
CREATE OR REPLACE FUNCTION public.social_payload_hash(_q public.social_publish_queue) RETURNS text LANGUAGE sql STABLE SET search_path=public AS $$ SELECT encode(extensions.digest(convert_to(jsonb_build_object('platform',_q.platform,'content',_q.content,'media',_q.media_urls,'type',_q.media_type,'hashtags',_q.hashtags,'campaign',_q.campaign_id,'version',_q.version,'schedule',_q.scheduled_at,'settings',(SELECT jsonb_build_object('facebook',facebook_page_id,'instagram',instagram_business_id,'hashtags',default_hashtags) FROM public.social_auto_publish_settings LIMIT 1))::text,'UTF8'),'sha256'),'hex') $$;
CREATE OR REPLACE FUNCTION public.social_queue_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'social_use_cancel_not_delete'; END IF;
 IF TG_OP='INSERT' THEN
 NEW.requires_approval:=true; NEW.approved_by:=NULL; NEW.approved_at:=NULL; NEW.approval_hash:=NULL; NEW.approval_expires_at:=NULL; NEW.execution_token:=NULL; NEW.execution_started_at:=NULL;
 IF NEW.status <> 'pending' THEN RAISE EXCEPTION 'social_initial_state_pending'; END IF;
 ELSE
 IF current_setting('app.social_governance',true) IS DISTINCT FROM 'rpc' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at OR NEW.approval_hash IS DISTINCT FROM OLD.approval_hash OR NEW.approval_expires_at IS DISTINCT FROM OLD.approval_expires_at OR NEW.execution_token IS DISTINCT FROM OLD.execution_token OR NEW.execution_started_at IS DISTINCT FROM OLD.execution_started_at OR NEW.external_post_id IS DISTINCT FROM OLD.external_post_id OR NEW.external_permalink IS DISTINCT FROM OLD.external_permalink OR NEW.published_at IS DISTINCT FROM OLD.published_at) THEN RAISE EXCEPTION 'social_controlled_rpc_required'; END IF;
 IF ROW(NEW.platform,NEW.content,NEW.media_urls,NEW.media_type,NEW.hashtags,NEW.campaign_id,NEW.version,NEW.scheduled_at) IS DISTINCT FROM ROW(OLD.platform,OLD.content,OLD.media_urls,OLD.media_type,OLD.hashtags,OLD.campaign_id,OLD.version,OLD.scheduled_at) THEN
 IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'social_executed_payload_immutable'; END IF;
 NEW.approved_by:=NULL; NEW.approved_at:=NULL; NEW.approval_hash:=NULL; NEW.approval_expires_at:=NULL;
 END IF;
 NEW.requires_approval:=true;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER social_governance_guard BEFORE INSERT OR UPDATE OR DELETE ON public.social_publish_queue FOR EACH ROW EXECUTE FUNCTION public.social_queue_guard();
CREATE TRIGGER social_events_append_only BEFORE UPDATE OR DELETE ON public.social_publish_events FOR EACH ROW EXECUTE FUNCTION public.aegis_append_only();
CREATE OR REPLACE FUNCTION public.social_approve(_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE q public.social_publish_queue; BEGIN
 IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO q FROM public.social_publish_queue WHERE id=_id FOR UPDATE;
 IF q.id IS NULL OR q.status <> 'pending' THEN RAISE EXCEPTION 'social_not_pending'; END IF;
 IF cardinality(public.aegis_scan(q.content)) > 0 THEN RAISE EXCEPTION 'social_aegis_review_required'; END IF;
 PERFORM set_config('app.social_governance','rpc',true);
 UPDATE public.social_publish_queue SET approved_by=auth.uid(),approved_at=now(),approval_expires_at=now()+interval '72 hours',approval_hash=public.social_payload_hash(q) WHERE id=_id;
 INSERT INTO public.social_publish_events(queue_id,event_type,platform,payload) VALUES(_id,'approved',q.platform,jsonb_build_object('actor',auth.uid(),'payload_hash',public.social_payload_hash(q),'expires_at',now()+interval '72 hours'));
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.social_approve(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_approve(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.social_cancel(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE q public.social_publish_queue; BEGIN
 IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO q FROM public.social_publish_queue WHERE id=_id FOR UPDATE;
 IF q.id IS NULL OR q.status NOT IN ('pending','failed') THEN RAISE EXCEPTION 'social_cannot_cancel_dispatched'; END IF;
 PERFORM set_config('app.social_governance','rpc',true);
 UPDATE public.social_publish_queue SET status='cancelled',approval_hash=NULL WHERE id=_id;
 INSERT INTO public.social_publish_events(queue_id,event_type,platform,payload) VALUES(_id,'cancelled',q.platform,jsonb_build_object('actor',auth.uid()));
END $$;
REVOKE ALL ON FUNCTION public.social_cancel(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_cancel(uuid) TO authenticated;