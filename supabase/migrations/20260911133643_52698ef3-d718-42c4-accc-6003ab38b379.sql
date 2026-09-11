ALTER TABLE public.ai_local_endpoints ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_local_endpoints_kind_check') THEN
    ALTER TABLE public.ai_local_endpoints ADD CONSTRAINT ai_local_endpoints_kind_check CHECK (kind IN ('text','image','video'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ai_local_endpoints_kind_idx ON public.ai_local_endpoints (kind, enabled, priority);

CREATE TABLE IF NOT EXISTS public.ai_generated_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  prompt text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  source text NOT NULL DEFAULT 'local',
  provider text,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generated_media TO authenticated;
GRANT ALL ON public.ai_generated_media TO service_role;

ALTER TABLE public.ai_generated_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read own generated media" ON public.ai_generated_media;
CREATE POLICY "owners read own generated media" ON public.ai_generated_media FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "owners delete own generated media" ON public.ai_generated_media;
CREATE POLICY "owners delete own generated media" ON public.ai_generated_media FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS ai_generated_media_user_idx ON public.ai_generated_media (user_id, created_at DESC);