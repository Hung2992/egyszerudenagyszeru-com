CREATE OR REPLACE FUNCTION public.social_content_catalog() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF; RETURN coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
SELECT 'product'::text source,p.id,p.name title,p.description body,p.price::numeric price,'Egyszerű de Nagyszerű'::text store,NULL::uuid partner_id,'https://egyszerudenagyszeru.com/product/'||p.id::text url,CASE WHEN p.is_active THEN 'active' ELSE 'inactive' END state, p.is_active AND p.name !~* '(QA|TESZT)' eligible FROM public.shop_products p
UNION ALL SELECT 'partner_product',p.id,p.title,p.description,p.price_huf,s.display_name,p.partner_id,'https://egyszerudenagyszeru.com/b/'||s.slug||'/termek/'||p.slug,p.status,p.status='active' AND s.is_published AND p.title !~* '(QA|TESZT)' FROM public.partner_products p JOIN public.partner_storefronts s ON s.partner_id=p.partner_id
UNION ALL SELECT 'campaign',c.id,c.name,c.content,NULL::numeric,'Egyszerű de Nagyszerű',NULL::uuid,NULL::text,c.status,c.status NOT IN ('cancelled','archived') FROM public.marketing_campaigns c
UNION ALL SELECT 'partner_campaign',c.id,c.title,c.body,NULL::numeric,s.display_name,c.partner_id,c.cta_url,c.status,s.is_published AND c.status NOT IN ('cancelled','archived') FROM public.partner_marketing_campaigns c JOIN public.partner_storefronts s ON s.partner_id=c.partner_id
UNION ALL SELECT 'page',p.id,p.title,p.content_html,NULL::numeric,s.display_name,p.partner_id,'https://egyszerudenagyszeru.com/b/'||s.slug||'/oldal/'||p.slug,CASE WHEN p.is_published THEN 'published' ELSE 'draft' END,p.is_published AND s.is_published FROM public.partner_pages p JOIN public.partner_storefronts s ON s.partner_id=p.partner_id
) x),'[]'::jsonb); END $$;
REVOKE ALL ON FUNCTION public.social_content_catalog() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_content_catalog() TO authenticated;
CREATE OR REPLACE FUNCTION public.social_prepare_slot(_slot uuid,_source text,_ref uuid,_content text,_video text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s public.social_plan_slots; qid uuid; c text; item jsonb; BEGIN
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
 IF _video IS NOT NULL AND (length(_video)>2048 OR _video !~ '^https://[^/[:space:]]+/.+') THEN RAISE EXCEPTION 'https_video_required'; END IF;
 IF s.platform='tiktok' AND nullif(_video,'') IS NULL THEN RAISE EXCEPTION 'tiktok_video_required'; END IF;
 c:=trim(_content);
 IF cardinality(public.aegis_scan(c))>0 OR public.aegis_has_card(c) THEN RAISE EXCEPTION 'social_aegis_review_required'; END IF;
 INSERT INTO public.social_publish_queue(platform,content,media_urls,media_type,scheduled_at,source,source_ref,campaign_id,created_by,autopilot,requires_approval,test_only)
 VALUES(s.platform,c,CASE WHEN _video IS NULL THEN '{}'::text[] ELSE ARRAY[_video] END,CASE WHEN _video IS NULL THEN 'text' ELSE 'video' END,((s.day+time '12:00') AT TIME ZONE 'Europe/Budapest'),'monthly_'||_source,_ref,CASE WHEN _source='campaign' THEN _ref ELSE NULL END,auth.uid(),false,true,false) RETURNING id INTO qid;
 UPDATE public.social_plan_slots SET queue_id=qid WHERE id=s.id;
 INSERT INTO public.social_publish_events(queue_id,event_type,platform,payload) VALUES(qid,'source_selected',s.platform,jsonb_build_object('actor',auth.uid(),'source_type',_source,'source_id',_ref,'source_store',item->>'store','source_partner',item->>'partner_id','source_title',item->>'title','source_url',item->>'url'));
 RETURN qid; END $$;