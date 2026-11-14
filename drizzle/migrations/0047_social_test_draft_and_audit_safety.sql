CREATE OR REPLACE FUNCTION public.social_safety_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' AND NEW.created_by IS DISTINCT FROM auth.uid() AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'social_creator_mismatch'; END IF;
 IF TG_OP='UPDATE' AND NEW.test_only IS DISTINCT FROM OLD.test_only THEN RAISE EXCEPTION 'social_mode_immutable'; END IF;
 IF TG_OP='UPDATE' AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'social_creator_immutable'; END IF;
 IF TG_OP='INSERT' OR NEW.content IS DISTINCT FROM OLD.content THEN
 IF cardinality(public.aegis_scan(NEW.content))>0 OR public.aegis_has_card(NEW.content) THEN RAISE EXCEPTION 'social_aegis_review_required'; END IF;
 END IF; RETURN NEW;
 END $$;
CREATE TRIGGER social_a_safety_guard BEFORE INSERT OR UPDATE ON public.social_publish_queue FOR EACH ROW EXECUTE FUNCTION public.social_safety_guard();
CREATE OR REPLACE FUNCTION public.social_record_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.social_publish_events(queue_id,event_type,platform,payload) VALUES(NEW.id,'draft_created',NEW.platform,jsonb_build_object('actor',NEW.created_by)); RETURN NEW; END $$;
CREATE TRIGGER social_created_audit AFTER INSERT ON public.social_publish_queue FOR EACH ROW EXECUTE FUNCTION public.social_record_created();