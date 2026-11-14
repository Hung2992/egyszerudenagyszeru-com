ALTER TABLE public.social_auto_publish_settings ADD COLUMN linkedin_enabled boolean NOT NULL DEFAULT false, ADD COLUMN daily_limit_linkedin integer NOT NULL DEFAULT 1, ADD COLUMN linkedin_member_id text, ADD COLUMN tiktok_open_id text;
ALTER TABLE public.social_publish_queue DROP CONSTRAINT social_publish_queue_platform_check;
ALTER TABLE public.social_publish_queue ADD CONSTRAINT social_publish_queue_platform_check CHECK(platform IN ('facebook','instagram','tiktok','linkedin'));
CREATE TABLE public.social_month_plans(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), month date NOT NULL UNIQUE CHECK(extract(day FROM month)=1), created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.social_month_plans TO authenticated;
GRANT ALL ON public.social_month_plans TO service_role;
ALTER TABLE public.social_month_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_month_read ON public.social_month_plans FOR SELECT TO authenticated USING(public.empyrean_is_admin());
CREATE TABLE public.social_plan_slots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES public.social_month_plans(id), day date NOT NULL, platform text NOT NULL CHECK(platform IN ('facebook','tiktok','linkedin')), topic text NOT NULL, queue_id uuid UNIQUE REFERENCES public.social_publish_queue(id), UNIQUE(plan_id,day,platform));
GRANT SELECT ON public.social_plan_slots TO authenticated;
GRANT ALL ON public.social_plan_slots TO service_role;
ALTER TABLE public.social_plan_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_slot_read ON public.social_plan_slots FOR SELECT TO authenticated USING(public.empyrean_is_admin());
CREATE OR REPLACE FUNCTION public.social_create_month(_month date) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE pid uuid; d date; p text; BEGIN
 IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF _month IS NULL OR extract(day FROM _month)<>1 OR _month < date_trunc('month',now() AT TIME ZONE 'Europe/Budapest')::date OR _month > (date_trunc('month',now() AT TIME ZONE 'Europe/Budapest')+interval '12 months')::date THEN RAISE EXCEPTION 'invalid_month'; END IF;
 INSERT INTO public.social_month_plans(month,created_by) VALUES(_month,auth.uid()) ON CONFLICT(month) DO NOTHING;
 SELECT id INTO pid FROM public.social_month_plans WHERE month=_month;
 FOR d IN SELECT generate_series(_month::timestamp,(_month+interval '1 month - 1 day')::timestamp,interval '1 day')::date LOOP
 FOREACH p IN ARRAY ARRAY['facebook','tiktok','linkedin'] LOOP
 INSERT INTO public.social_plan_slots(plan_id,day,platform,topic) VALUES(pid,d,p,CASE extract(isodow FROM d)::int WHEN 1 THEN 'Termékbemutató' WHEN 2 THEN 'Termék részletei' WHEN 3 THEN 'Kampánybemutató' WHEN 4 THEN 'Stílus és használat' WHEN 5 THEN 'Webshop kínálata' WHEN 6 THEN 'Márkatörténet' ELSE 'Heti összegzés' END) ON CONFLICT(plan_id,day,platform) DO NOTHING;
 END LOOP; END LOOP;
 INSERT INTO public.empyrean_audit_log(actor_id,agent_slug,action,target,detail) VALUES(auth.uid(),'social-publisher','monthly_plan',pid::text,jsonb_build_object('month',_month,'platforms',ARRAY['facebook','tiktok','linkedin'],'daily_posts_per_platform',1)); RETURN pid; END $$;
REVOKE ALL ON FUNCTION public.social_create_month(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_create_month(date) TO authenticated;
CREATE OR REPLACE FUNCTION public.social_prepare_slot(_slot uuid,_source text,_ref uuid,_content text,_video text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s public.social_plan_slots; qid uuid; c text; BEGIN
 IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO s FROM public.social_plan_slots WHERE id=_slot FOR UPDATE;
 IF s.id IS NULL THEN RAISE EXCEPTION 'slot_not_found'; END IF;
 IF s.queue_id IS NOT NULL THEN RETURN s.queue_id; END IF;
 IF _source NOT IN ('product','campaign','manual') OR _content IS NULL OR length(trim(_content))<1 OR length(_content)>20000 THEN RAISE EXCEPTION 'invalid_content'; END IF;
 IF s.day < (now() AT TIME ZONE 'Europe/Budapest')::date THEN RAISE EXCEPTION 'past_slot'; END IF;
 IF _source='product' AND NOT EXISTS(SELECT 1 FROM public.shop_products WHERE id=_ref AND is_active) THEN RAISE EXCEPTION 'product_not_available'; END IF;
 IF _source='campaign' AND NOT EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE id=_ref) THEN RAISE EXCEPTION 'campaign_not_found'; END IF;
 IF _video IS NOT NULL AND (length(_video)>2048 OR _video !~ '^https://[^/[:space:]]+/.+') THEN RAISE EXCEPTION 'https_video_required'; END IF;
 IF s.platform='tiktok' AND nullif(_video,'') IS NULL THEN RAISE EXCEPTION 'tiktok_video_required'; END IF;
 c:=trim(_content);
 IF cardinality(public.aegis_scan(c))>0 OR public.aegis_has_card(c) THEN RAISE EXCEPTION 'social_aegis_review_required'; END IF;
 INSERT INTO public.social_publish_queue(platform,content,media_urls,media_type,scheduled_at,source,source_ref,campaign_id,created_by,autopilot,requires_approval,test_only)
 VALUES(s.platform,c,CASE WHEN _video IS NULL THEN '{}'::text[] ELSE ARRAY[_video] END,CASE WHEN _video IS NULL THEN 'text' ELSE 'video' END,((s.day+time '12:00') AT TIME ZONE 'Europe/Budapest'),'monthly_'||_source,_ref,CASE WHEN _source='campaign' THEN _ref ELSE NULL END,auth.uid(),false,true,false) RETURNING id INTO qid;
 UPDATE public.social_plan_slots SET queue_id=qid WHERE id=s.id;
 RETURN qid; END $$;
REVOKE ALL ON FUNCTION public.social_prepare_slot(uuid,text,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_prepare_slot(uuid,text,uuid,text,text) TO authenticated;
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
 IF s.id IS NULL OR NOT (CASE q.platform WHEN 'facebook' THEN s.facebook_enabled WHEN 'instagram' THEN s.instagram_enabled WHEN 'tiktok' THEN s.tiktok_enabled WHEN 'linkedin' THEN s.linkedin_enabled ELSE false END) THEN RETURN jsonb_build_object('allowed',false,'reason','platform_disabled'); END IF;
 hr:=extract(hour FROM now() AT TIME ZONE 'Europe/Budapest');
 IF (s.quiet_hours_start<s.quiet_hours_end AND hr>=s.quiet_hours_start AND hr<s.quiet_hours_end) OR (s.quiet_hours_start>s.quiet_hours_end AND (hr>=s.quiet_hours_start OR hr<s.quiet_hours_end)) THEN RETURN jsonb_build_object('allowed',false,'reason','quiet_hours'); END IF;
 IF q.scheduled_at>now() THEN RETURN jsonb_build_object('allowed',false,'reason','not_due'); END IF;
 lim:=CASE q.platform WHEN 'facebook' THEN s.daily_limit_facebook WHEN 'instagram' THEN s.daily_limit_instagram WHEN 'tiktok' THEN s.daily_limit_tiktok WHEN 'linkedin' THEN s.daily_limit_linkedin ELSE 0 END;
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
 SELECT EXISTS(SELECT 1 FROM public.social_publish_queue q WHERE q.id=_id AND q.execution_token=_token AND q.status='processing' AND q.approval_hash=public.social_payload_hash(q) AND q.approval_expires_at>now() AND public.has_role(q.approved_by,'admin') AND public.aegis_agent_allowed('social-publisher')='active' AND EXISTS(SELECT 1 FROM public.empyrean_emergency_controls WHERE scope='global' AND NOT paused AND NOT read_only) AND NOT EXISTS(SELECT 1 FROM public.empyrean_emergency_controls WHERE scope IN ('marketing','social-publisher',q.platform,'campaign:'||q.campaign_id::text) AND (paused OR read_only)) AND EXISTS(SELECT 1 FROM public.social_auto_publish_settings s WHERE CASE q.platform WHEN 'facebook' THEN s.facebook_enabled WHEN 'instagram' THEN s.instagram_enabled WHEN 'tiktok' THEN s.tiktok_enabled WHEN 'linkedin' THEN s.linkedin_enabled ELSE false END))
$$;
REVOKE ALL ON FUNCTION public.social_preflight(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.social_preflight(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.social_payload_hash(_q public.social_publish_queue) RETURNS text LANGUAGE sql STABLE SET search_path=public AS $$ SELECT encode(extensions.digest(convert_to(jsonb_build_object('platform',_q.platform,'content',_q.content,'media',_q.media_urls,'type',_q.media_type,'hashtags',_q.hashtags,'campaign',_q.campaign_id,'version',_q.version,'schedule',_q.scheduled_at,'settings',(SELECT jsonb_build_object('facebook',facebook_page_id,'instagram',instagram_business_id,'linkedin',linkedin_member_id,'tiktok',tiktok_open_id,'hashtags',default_hashtags) FROM public.social_auto_publish_settings LIMIT 1))::text,'UTF8'),'sha256'),'hex') $$;