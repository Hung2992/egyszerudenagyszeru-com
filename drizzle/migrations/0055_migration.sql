CREATE OR REPLACE FUNCTION public.social_prepare_slot(_slot uuid, _source text, _ref uuid, _content text, _video text DEFAULT NULL::text, _image text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE s public.social_plan_slots; qid uuid; c text; item jsonb; m text; BEGIN
 IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO s FROM public.social_plan_slots WHERE id=_slot FOR UPDATE;
 IF s.id IS NULL THEN RAISE EXCEPTION 'slot_not_found'; END IF;
 IF s.queue_id IS NOT NULL THEN RETURN s.queue_id; END IF;
 IF _source IS NULL OR _source NOT IN ('product','partner_product','campaign','partner_campaign','page','manual') OR _content IS NULL OR length(trim(_content))<1 OR length(_content)>20000 THEN RAISE EXCEPTION 'invalid_content'; END IF;
 IF s.day < (now() AT TIME ZONE 'Europe/Budapest')::date THEN RAISE EXCEPTION 'past_slot'; END IF;
 IF _source<>'manual' THEN
 SELECT v INTO item FROM jsonb_array_elements(public.social_content_catalog()) v WHERE v->>'source'=_source AND v->>'id'=_ref::text;
 IF item IS NULL OR coalesce((item->>'eligible')::boolean,false)=false THEN RAISE EXCEPTION 'source_not_publishable'; END IF;
 END IF;
 _video:=nullif(trim(_video),''); _image:=nullif(trim(_image),'');
 IF _video IS NOT NULL AND _image IS NOT NULL THEN RAISE EXCEPTION 'one_media_only'; END IF;
 IF coalesce(_video,_image) IS NOT NULL AND (length(coalesce(_video,_image))>2048 OR coalesce(_video,_image) !~ '^https://[^/[:space:]]+/.+') THEN RAISE EXCEPTION 'https_media_required'; END IF;
 IF s.platform='tiktok' AND _video IS NULL THEN RAISE EXCEPTION 'tiktok_video_required'; END IF;
 IF s.platform IN ('facebook','linkedin') AND _video IS NOT NULL THEN RAISE EXCEPTION 'video_not_supported_on_platform'; END IF;
 IF s.platform='linkedin' AND _image IS NOT NULL THEN RAISE EXCEPTION 'linkedin_text_only'; END IF;
 m:=CASE WHEN _video IS NOT NULL THEN 'video' WHEN _image IS NOT NULL THEN 'image' ELSE 'text' END;
 c:=trim(_content);
 IF cardinality(public.aegis_scan(c))>0 OR public.aegis_has_card(c) THEN RAISE EXCEPTION 'social_aegis_review_required'; END IF;
 INSERT INTO public.social_publish_queue(platform,content,media_urls,media_type,scheduled_at,source,source_ref,campaign_id,created_by,autopilot,requires_approval,test_only)
 VALUES(s.platform,c,CASE WHEN m='text' THEN '{}'::text[] ELSE ARRAY[coalesce(_video,_image)] END,m,((s.day+time '12:00') AT TIME ZONE 'Europe/Budapest'),'monthly_'||_source,_ref,CASE WHEN _source='campaign' THEN _ref ELSE NULL END,auth.uid(),false,true,false) RETURNING id INTO qid;
 UPDATE public.social_plan_slots SET queue_id=qid WHERE id=s.id;
 INSERT INTO public.social_publish_events(queue_id,event_type,platform,payload) VALUES(qid,'source_selected',s.platform,jsonb_build_object('actor',auth.uid(),'source_type',_source,'source_id',_ref,'source_store',item->>'store','source_partner',item->>'partner_id','source_title',item->>'title','source_url',item->>'url'));
 RETURN qid; END $function$;
DROP FUNCTION IF EXISTS public.social_prepare_slot(uuid,text,uuid,text,text);
REVOKE ALL ON FUNCTION public.social_prepare_slot(uuid,text,uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.social_prepare_slot(uuid,text,uuid,text,text,text) TO authenticated;