
CREATE TABLE public.tryon_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID,
  product_source TEXT,
  event_type TEXT NOT NULL,
  device_type TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tryon_events_created ON public.tryon_events(created_at DESC);
CREATE INDEX idx_tryon_events_type ON public.tryon_events(event_type);
CREATE INDEX idx_tryon_events_session ON public.tryon_events(session_id);
GRANT SELECT, INSERT ON public.tryon_events TO authenticated;
GRANT SELECT, INSERT ON public.tryon_events TO anon;
GRANT ALL ON public.tryon_events TO service_role;
ALTER TABLE public.tryon_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert tryon events" ON public.tryon_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read tryon events" ON public.tryon_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.tryon_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  product_id UUID,
  product_source TEXT,
  input_photo_url TEXT,
  output_image_url TEXT,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  ai_model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tryon_gen_user ON public.tryon_generations(user_id);
CREATE INDEX idx_tryon_gen_created ON public.tryon_generations(created_at DESC);
GRANT SELECT, INSERT ON public.tryon_generations TO authenticated;
GRANT ALL ON public.tryon_generations TO service_role;
ALTER TABLE public.tryon_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own tryon gen" ON public.tryon_generations FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "service inserts tryon gen" ON public.tryon_generations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
