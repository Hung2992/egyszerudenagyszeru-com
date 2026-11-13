DROP POLICY IF EXISTS "anyone read presets" ON public.tts_voice_presets;
CREATE POLICY "admin read presets" ON public.tts_voice_presets FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "TTS modellek nyilvánosan olvashatók" ON public.tts_models;
CREATE POLICY "admin read tts models" ON public.tts_models FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS vs_insert_all ON public.voice_shopping_queries;
CREATE POLICY vs_insert_own ON public.voice_shopping_queries FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.empyrean_seo_audit(_limit integer DEFAULT 100)
RETURNS TABLE(product_id uuid, title text, description text, category text, tags text[], issues text[], score integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  WITH x AS (
    SELECT p.id, p.title, p.description, p.category, p.tags,
      array_remove(ARRAY[
        CASE WHEN length(coalesce(p.title,'')) < 20 THEN 'title_short' END,
        CASE WHEN length(coalesce(p.title,'')) > 70 THEN 'title_long' END,
        CASE WHEN length(coalesce(p.description,'')) < 120 THEN 'description_short' END,
        CASE WHEN coalesce(p.category,'') = '' THEN 'category_missing' END,
        CASE WHEN coalesce(array_length(p.tags,1),0) = 0 THEN 'tags_missing' END,
        CASE WHEN coalesce(jsonb_array_length(CASE WHEN jsonb_typeof(p.images)='array' THEN p.images ELSE '[]'::jsonb END),0) = 0 THEN 'image_missing' END
      ], NULL) AS iss
    FROM public.partner_products p WHERE p.status = 'active'
  )
  SELECT x.id, x.title, x.description, x.category, x.tags, x.iss, greatest(0, 100 - 17*coalesce(array_length(x.iss,1),0))
  FROM x WHERE coalesce(array_length(x.iss,1),0) > 0
  ORDER BY array_length(x.iss,1) DESC LIMIT greatest(1, least(_limit, 500));
END $$;

CREATE OR REPLACE FUNCTION public.empyrean_security_posture()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'generated_at', now(),
    'public_tables', (SELECT count(*) FROM pg_tables WHERE schemaname='public'),
    'tables_without_rls', (SELECT coalesce(jsonb_agg(tablename),'[]') FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity),
    'open_read_policies', (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND cmd IN ('SELECT','ALL') AND qual='true'),
    'open_write_policies', (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND with_check='true'),
    'definer_without_search_path', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.prosecdef AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%')),
    'emergency_paused', (SELECT coalesce(bool_or(paused),false) FROM public.empyrean_emergency_controls),
    'unverified_executions', (SELECT count(*) FROM public.empyrean_actions WHERE state IN ('EXECUTING','EXECUTED','REQUIRES_REVIEW'))
  );
END $$;
REVOKE ALL ON FUNCTION public.empyrean_seo_audit(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.empyrean_security_posture() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.empyrean_seo_audit(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.empyrean_security_posture() TO authenticated;