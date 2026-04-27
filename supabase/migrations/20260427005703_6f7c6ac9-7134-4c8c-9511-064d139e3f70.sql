
-- Stratégiák táblája
CREATE TABLE IF NOT EXISTS public.ai_response_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  prompt_addon TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  avg_self_score NUMERIC NOT NULL DEFAULT 0.7,
  avg_user_rating NUMERIC NOT NULL DEFAULT 0,
  positive_feedback_count INTEGER NOT NULL DEFAULT 0,
  negative_feedback_count INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0.5,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_response_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage strategies"
  ON public.ai_response_strategies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage strategies"
  ON public.ai_response_strategies FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Reflexióhoz strategy kapcsolat
ALTER TABLE public.ai_response_reflections
  ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES public.ai_response_strategies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reflections_strategy ON public.ai_response_reflections(strategy_id);

-- Alapértelmezett stratégiák
INSERT INTO public.ai_response_strategies (name, description, prompt_addon) VALUES
  ('balanced', 'Kiegyensúlyozott — alapértelmezett, barátságos és tárgyilagos.',
   ''),
  ('concise_direct', 'Tömör és direkt — rövid, lényegre törő válaszok, konkrét cselekvési pontok.',
   '## STRATÉGIA: Tömör & direkt\nLégy nagyon rövid (max 3-4 mondat vagy 5 felsorolás-pont). Először a konkrét válasz/akció, utána egyetlen mondat indoklás. Kerüld a bevezető mondatokat és az udvariaskodást.'),
  ('analytical_deep', 'Részletes elemző — strukturált, számokkal alátámasztott, több szempontot vizsgáló.',
   '## STRATÉGIA: Mély elemzés\nStrukturáld a választ világosan (címsorokkal, listákkal, táblázattal ha kell). Mutass be több szempontot (előny/hátrány, kockázat/lehetőség). Számokkal, konkrét adatokkal támaszd alá az állításokat.'),
  ('friendly_emotional', 'Baráti & érzelmes — meleg hangnem, motiváló, emoji-használattal.',
   '## STRATÉGIA: Baráti & érzelmes\nBeszélj úgy, mint egy közeli barát/mentor. Használj néhány odaillő emojit (💙🔥✨). Légy bátorító és motiváló, ismerd el az erőfeszítést, mielőtt tanácsot adsz.'),
  ('socratic_questioning', 'Szókratészi — kérdésekkel vezet rá a válaszra, gondolkodásra ösztönöz.',
   '## STRATÉGIA: Szókratészi\nMielőtt választ adnál, tegyél fel 1-2 tisztázó kérdést, amik segítenek a tulajdonosnak magának rájönni a válaszra. Csak utána adj rövid javaslatot. Cél: a tulajdonos gondolkodásmódjának fejlesztése, nem csak a feladat megoldása.')
ON CONFLICT (name) DO NOTHING;

-- Epsilon-greedy bandit stratégiaválasztó
CREATE OR REPLACE FUNCTION public.pick_response_strategy(_epsilon NUMERIC DEFAULT 0.2)
RETURNS TABLE (id UUID, name TEXT, prompt_addon TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_random BOOLEAN;
BEGIN
  use_random := random() < _epsilon;

  IF use_random THEN
    -- Felfedezés: véletlen aktív stratégia
    RETURN QUERY
      SELECT s.id, s.name, s.prompt_addon
      FROM public.ai_response_strategies s
      WHERE s.is_active = true
      ORDER BY random()
      LIMIT 1;
  ELSE
    -- Kihasználás: legjobb win_rate (legalább 3 használattal, hogy ne random nyerjen)
    RETURN QUERY
      SELECT s.id, s.name, s.prompt_addon
      FROM public.ai_response_strategies s
      WHERE s.is_active = true
      ORDER BY
        CASE WHEN s.usage_count >= 3 THEN s.win_rate ELSE 0.5 END DESC,
        s.avg_self_score DESC,
        s.usage_count ASC -- ha több is döntetlen, a kevésbé használtnak adunk esélyt
      LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pick_response_strategy(NUMERIC) TO authenticated, service_role;

-- Statisztika frissítés
CREATE OR REPLACE FUNCTION public.update_strategy_stats(_strategy_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _avg_self NUMERIC;
  _pos INT;
  _neg INT;
  _total_fb INT;
  _win NUMERIC;
BEGIN
  SELECT COALESCE(AVG(overall_score), 0.7)
    INTO _avg_self
    FROM public.ai_response_reflections
    WHERE strategy_id = _strategy_id;

  SELECT
    COUNT(*) FILTER (WHERE f.rating = 1),
    COUNT(*) FILTER (WHERE f.rating = -1)
    INTO _pos, _neg
    FROM public.ai_response_feedback f
    JOIN public.ai_response_reflections r ON r.id = f.reflection_id
    WHERE r.strategy_id = _strategy_id;

  _total_fb := COALESCE(_pos, 0) + COALESCE(_neg, 0);
  IF _total_fb > 0 THEN
    -- súlyozott win rate: 70% user feedback, 30% AI önreflexió
    _win := (COALESCE(_pos, 0)::numeric / _total_fb) * 0.7 + _avg_self * 0.3;
  ELSE
    _win := _avg_self;
  END IF;

  UPDATE public.ai_response_strategies
  SET avg_self_score = ROUND(_avg_self, 3),
      positive_feedback_count = COALESCE(_pos, 0),
      negative_feedback_count = COALESCE(_neg, 0),
      avg_user_rating = CASE WHEN _total_fb > 0
                             THEN ROUND((COALESCE(_pos, 0) - COALESCE(_neg, 0))::numeric / _total_fb, 3)
                             ELSE 0 END,
      win_rate = ROUND(_win, 3),
      updated_at = now()
  WHERE id = _strategy_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_strategy_stats(UUID) TO authenticated, service_role;

-- Trigger: használat számláló bumpolása reflexió beszúrásakor
CREATE OR REPLACE FUNCTION public.bump_strategy_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.strategy_id IS NOT NULL THEN
    UPDATE public.ai_response_strategies
    SET usage_count = usage_count + 1,
        last_used_at = now()
    WHERE id = NEW.strategy_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_strategy_usage ON public.ai_response_reflections;
CREATE TRIGGER trg_bump_strategy_usage
  AFTER INSERT ON public.ai_response_reflections
  FOR EACH ROW EXECUTE FUNCTION public.bump_strategy_usage();
