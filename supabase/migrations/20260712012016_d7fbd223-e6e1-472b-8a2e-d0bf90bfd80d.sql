
ALTER FUNCTION public.generate_share_code() SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- page_views: bound size / require session_id
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views" ON public.page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL);

-- admin_notifications: only admins may insert
DROP POLICY IF EXISTS "Anyone authenticated can insert notifications" ON public.admin_notifications;
CREATE POLICY "Only admins insert notifications" ON public.admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- partner_storefront_versions
DROP POLICY IF EXISTS "service inserts versions" ON public.partner_storefront_versions;
DROP POLICY IF EXISTS "admin updates versions" ON public.partner_storefront_versions;
CREATE POLICY "Admins or owners insert versions" ON public.partner_storefront_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.partner_storefronts s
      JOIN public.partners p ON p.id = s.partner_id
      WHERE s.id = partner_storefront_versions.storefront_id
        AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "Admins update versions" ON public.partner_storefront_versions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- partner_share_clicks: require share_link_id
DROP POLICY IF EXISTS "Anyone can log clicks" ON public.partner_share_clicks;
CREATE POLICY "Anyone can log share clicks" ON public.partner_share_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (share_link_id IS NOT NULL);

-- partner_email_subscribers: bound self-subscribe
DROP POLICY IF EXISTS "Anyone subscribe" ON public.partner_email_subscribers;
CREATE POLICY "Anyone can subscribe" ON public.partner_email_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(email) < 320);

-- ai_shopping_conversations: bind user_id to caller
DROP POLICY IF EXISTS "convos insert" ON public.ai_shopping_conversations;
CREATE POLICY "convos insert self" ON public.ai_shopping_conversations
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ai_events: bind user_id
DROP POLICY IF EXISTS "anyone_insert_events" ON public.ai_events;
CREATE POLICY "insert ai events" ON public.ai_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ai_usage_quota service writes
GRANT ALL ON public.ai_usage_quota TO service_role;
DROP POLICY IF EXISTS "Service manages ai usage quota" ON public.ai_usage_quota;
CREATE POLICY "Service manages ai usage quota" ON public.ai_usage_quota
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- partner_sitemap_cache: admin-only writes
GRANT ALL ON public.partner_sitemap_cache TO service_role;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='partner_sitemap_cache' AND cmd IN ('INSERT','UPDATE','DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.partner_sitemap_cache', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Admins manage sitemap cache" ON public.partner_sitemap_cache
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Revoke EXECUTE from anon/authenticated on trigger functions
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public'
      AND t.typname = 'trigger'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, authenticated, public',
      f.nspname, f.proname, f.args);
  END LOOP;
END $$;
