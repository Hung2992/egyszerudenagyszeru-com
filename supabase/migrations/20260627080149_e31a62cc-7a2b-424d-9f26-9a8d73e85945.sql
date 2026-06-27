
-- Storefront button-click + preview-open analytics
CREATE TABLE public.partner_storefront_button_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storefront_id UUID REFERENCES public.partner_storefronts(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  url TEXT,
  url_type TEXT,
  context JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_psbe_storefront ON public.partner_storefront_button_events(storefront_id, created_at DESC);
CREATE INDEX idx_psbe_partner ON public.partner_storefront_button_events(partner_id, created_at DESC);
CREATE INDEX idx_psbe_event_type ON public.partner_storefront_button_events(event_type, created_at DESC);

GRANT SELECT, INSERT ON public.partner_storefront_button_events TO authenticated;
GRANT ALL ON public.partner_storefront_button_events TO service_role;

ALTER TABLE public.partner_storefront_button_events ENABLE ROW LEVEL SECURITY;

-- Partner can insert events for their own partner row
CREATE POLICY "Partner can log own events" ON public.partner_storefront_button_events
  FOR INSERT TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Partner can read own events
CREATE POLICY "Partner reads own events" ON public.partner_storefront_button_events
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Admin reads all
CREATE POLICY "Admin reads all events" ON public.partner_storefront_button_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for live preview auto-refresh
ALTER TABLE public.partner_storefronts REPLICA IDENTITY FULL;
ALTER TABLE public.partner_domain_requests REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='partner_storefronts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_storefronts';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='partner_domain_requests'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_domain_requests';
  END IF;
END $$;
