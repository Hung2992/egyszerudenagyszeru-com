CREATE INDEX IF NOT EXISTS idx_page_views_created_at_desc ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_created ON public.page_views (visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_created ON public.page_views (session_id, created_at DESC);