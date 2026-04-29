-- Bővítjük a hátterek táblát kategória és gyors-választó támogatással
ALTER TABLE public.ai_studio_backgrounds
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text;

-- Hangminta: alapértelmezett megjelölés
ALTER TABLE public.ai_studio_voice_samples
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Új tábla: AI Stúdió globális beállítások (egy sor, admin only)
CREATE TABLE IF NOT EXISTS public.ai_studio_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_voice_sample_id uuid REFERENCES public.ai_studio_voice_samples(id) ON DELETE SET NULL,
  default_audio_source text DEFAULT 'tts',
  default_bg_source text DEFAULT 'product',
  default_bg_category text DEFAULT 'general',
  brand_intro_text text DEFAULT 'Egyszerű de Nagyszerű',
  brand_outro_text text DEFAULT 'Rendeld meg most a webshopban!',
  ai_prompt_template text DEFAULT 'Írj egy 15 másodperces TikTok reklámszöveget magyarul a következő termékre: {product_name}. Stílus: laza, fiatalos, 18-30 éves férfi célközönség. Ár: {price} Ft.',
  default_clip_title_pattern text DEFAULT '{product} - {date}',
  auto_caption_enabled boolean DEFAULT true,
  preferred_voice_lang text DEFAULT 'hu-HU',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_studio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_studio_settings"
  ON public.ai_studio_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: updated_at
DROP TRIGGER IF EXISTS trg_ai_studio_settings_updated ON public.ai_studio_settings;
CREATE TRIGGER trg_ai_studio_settings_updated
  BEFORE UPDATE ON public.ai_studio_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Egy alapértelmezett sor beszúrása ha még nincs
INSERT INTO public.ai_studio_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.ai_studio_settings);