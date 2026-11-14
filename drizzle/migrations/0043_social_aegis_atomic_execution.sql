CREATE OR REPLACE FUNCTION public.social_claim(_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.social_publish_queue; s public.social_auto_publish_settings; hr int; lim int; used int; tok uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('social_publish_gate'));
 SELECT * INTO q FROM public.social_publish_queue WHERE id=_id FOR UPDATE;
 IF q.id IS NULL OR q.status <> 'pending' THEN RETURN jsonb_build_object('allowed',false,'reason','not_pending'); END IF;
 IF public.aegis_agent_allowed('social-publisher') <> 'active' OR NOT EXISTS(SELECT 1 FROM public.empyrean_emergency_controls WHERE scope='global' AND NOT paused AND NOT read_only) OR EXISTS(SELECT 1 FROM public.empyrean_emergency_controls WHERE scope IN ('marketing','social-publisher',q.platform,'campaign:'||q.campaign_id::text) AND (paused OR read_only)) THEN RETURN jsonb_build_object('allowed',false,'reason','aegis_stopped'); END IF;
 IF q.approved_by IS NULL OR q.approval_hash IS NULL OR q.approval_expires_at IS NULL OR q.approval_expires_at<=now() OR q.approval_hash<>public.social_payload_hash(q) OR NOT public.has_role(q.approved_by,'admin') THEN RETURN jsonb_build_object('allowed',false,'reason','approval_required'); END IF;
 IF cardinality(public.aegis_scan(q.content)) > 0 THEN RETURN jsonb_build_object('allowed',false,'reason','aegis_review_required'); END IF;
 SELECT * INTO s FROM public.social_auto_publish_settings LIMIT 1 FOR UPDATE;
 IF s.id IS NULL OR NOT (CASE q.platform WHEN 'facebook' THEN s.facebook_enabled WHEN 'instagram' THEN s.instagram_enabled WHEN 'tiktok' THEN s.tiktok_enabled ELSE false END) THEN RETURN jsonb_build_object('allowed',false,'reason','platform_disabled'); END IF;
 hr:=extract(hour FROM now() AT TIME ZONE 'Europe/Budapest');
 IF (s.quiet_hours_start<s.quiet_hours_end AND hr>=s.quiet_hours_start AND hr<s.quiet_hours_end) OR (s.quiet_hours_start>s.quiet_hours_end AND (hr>=s.quiet_hours_start OR hr<s.quiet_hours_end)) THEN RETURN jsonb_build_object('allowed',false,'reason','quiet_hours'); END IF;
 IF q.scheduled_at>now() THEN RETURN jsonb_build_object('allowed',false,'reason','not_due'); END IF;
 lim:=CASE q.platform WHEN 'facebook' THEN s.daily_limit_facebook WHEN 'instagram' THEN s.daily_limit_instagram WHEN 'tiktok' THEN s.daily_limit_tiktok ELSE 0 END;
 SELECT count(*) INTO used FROM public.social_publish_events WHERE platform=q.platform AND event_type='execution_claimed' AND created_at >= (date_trunc('day',now() AT TIME ZONE 'Europe/Budapest') AT TIME ZONE 'Europe/Budapest');
 IF used>=coalesce(lim,0) THEN RETURN jsonb_build_object('allowed',false,'reason','daily_limit'); END IF;
 tok:=gen_random_uuid(); PERFORM set_config('app.social_governance','rpc',true);
 UPDATE public.social_publish_queue SET status='processing',execution_token=tok,execution_started_at=now() WHERE id=_id;
 INSERT INTO public.social_publish_events(queue_id,event_type,platform,payload) VALUES(_id,'execution_claimed',q.platform,jsonb_build_object('payload_hash',q.approval_hash));
 RETURN jsonb_build_object('allowed',true,'token',tok);
END $$;
REVOKE ALL ON FUNCTION public.social_claim(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.social_claim(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.social_preflight(_id uuid,_token uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.social_publish_queue q WHERE q.id=_id AND q.execution_token=_token AND q.status='processing' AND q.approval_hash=public.social_payload_hash(q) AND q.approval_expires_at>now() AND public.has_role(q.approved_by,'admin') AND public.aegis_agent_allowed('social-publisher')='active' AND EXISTS(SELECT 1 FROM public.empyrean_emergency_controls WHERE scope='global' AND NOT paused AND NOT read_only) AND NOT EXISTS(SELECT 1 FROM public.empyrean_emergency_controls WHERE scope IN ('marketing','social-publisher',q.platform,'campaign:'||q.campaign_id::text) AND (paused OR read_only)) AND EXISTS(SELECT 1 FROM public.social_auto_publish_settings s WHERE CASE q.platform WHEN 'facebook' THEN s.facebook_enabled WHEN 'instagram' THEN s.instagram_enabled WHEN 'tiktok' THEN s.tiktok_enabled ELSE false END))
$$;
REVOKE ALL ON FUNCTION public.social_preflight(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.social_preflight(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.social_finish(_id uuid,_token uuid,_state text,_external_id text DEFAULT NULL,_permalink text DEFAULT NULL,_error text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.social_publish_queue;
BEGIN
 SELECT * INTO q FROM public.social_publish_queue WHERE id=_id FOR UPDATE;
 IF q.id IS NULL OR q.execution_token IS DISTINCT FROM _token OR q.status <> 'processing' THEN RAISE EXCEPTION 'social_execution_mismatch'; END IF;
 IF _state NOT IN ('published','processing','failed') OR (_state IN ('published','processing') AND nullif(_external_id,'') IS NULL) THEN RAISE EXCEPTION 'social_invalid_receipt'; END IF;
 PERFORM set_config('app.social_governance','rpc',true);
 UPDATE public.social_publish_queue SET status=_state,external_post_id=_external_id,external_permalink=_permalink,published_at=CASE WHEN _state='published' THEN now() ELSE NULL END,error_message=left(_error,500) WHERE id=_id;
 INSERT INTO public.social_publish_events(queue_id,event_type,platform,payload) VALUES(_id,CASE _state WHEN 'published' THEN 'provider_confirmed' WHEN 'processing' THEN 'provider_accepted' ELSE 'manual_reconciliation_required' END,q.platform,jsonb_build_object('external_id',_external_id,'permalink',_permalink,'error',left(_error,500)));
END $$;
REVOKE ALL ON FUNCTION public.social_finish(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.social_finish(uuid,uuid,text,text,text,text) TO service_role;