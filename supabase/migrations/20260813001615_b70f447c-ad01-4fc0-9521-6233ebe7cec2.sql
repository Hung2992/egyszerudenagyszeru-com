DROP POLICY IF EXISTS "visual_search_queries update own click" ON public.visual_search_queries;

REVOKE UPDATE ON public.visual_search_queries FROM anon;
REVOKE UPDATE ON public.visual_search_queries FROM authenticated;
GRANT UPDATE (clicked_product_id) ON public.visual_search_queries TO authenticated;

CREATE POLICY "visual_search_queries update own click"
ON public.visual_search_queries FOR UPDATE
TO authenticated
USING (user_id IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);