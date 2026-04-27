
-- 1. Strategy táblához kontextus-aware mezők
ALTER TABLE public.ai_response_strategies
  ADD COLUMN IF NOT EXISTS context_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS min_confidence_threshold numeric NOT NULL DEFAULT 0.0;

-- 2. Reflexió táblához kontextus + javító javaslat + címkék
ALTER TABLE public.ai_response_reflections
  ADD COLUMN IF NOT EXISTS question_context text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS improvement_suggestion text,
  ADD COLUMN IF NOT EXISTS weakness_tags text[] NOT NULL DEFAULT '{}'::text[];

-- 3. Feedback strukturált címkék + admin súly
ALTER TABLE public.ai_response_feedback
  ADD COLUMN IF NOT EXISTS feedback_reasons text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 4. Hard rule tábla: kontextushoz kötött kötelező stratégia
CREATE TABLE IF NOT EXISTS public.ai_question_context_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_name text NOT NULL UNIQUE,
  description text,
  forced_strategy_name text,
  disable_exploration boolean NOT NULL DEFAULT false,
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_question_context_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage context rules" ON public.ai_question_context_rules;
CREATE POLICY "Admins manage context rules" ON public.ai_question_context_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role read context rules" ON public.ai_question_context_rules;
CREATE POLICY "Service role read context rules" ON public.ai_question_context_rules
  FOR SELECT USING (auth.role() = 'service_role');

-- 5. Default kontextus szabályok
INSERT INTO public.ai_question_context_rules (context_name, description, forced_strategy_name, disable_exploration, keywords)
VALUES
  ('legal_financial', 'Jogi vagy pénzügyi kérdés - mindig mély elemzés', 'analytical_deep', true,
   ARRAY['jog','jogi','adó','számla','áfa','szerződés','gdpr','pénzügy','fizetés','visszatérítés','garancia']),
  ('quick_lookup', 'Gyors ténykérdés - tömör válasz', 'concise_direct', true,
   ARRAY['mennyi','hány','mikor','hol van','ki az','mi a','árak']),
  ('coaching', 'Tanácsadás - szókratészi megközelítés', 'socratic_questioning', false,
   ARRAY['hogyan döntsek','mit gondolsz','tanácsot','segíts dönteni','mi lenne ha']),
  ('casual_chat', 'Hétköznapi beszélgetés - baráti', 'friendly_emotional', false,
   ARRAY['szia','hello','köszi','jó napot','köszönöm']),
  ('general', 'Általános kérdés', NULL, false, ARRAY[]::text[])
ON CONFLICT (context_name) DO NOTHING;

-- 6. v2 stratégia választó: kontextus-aware + hard rule
CREATE OR REPLACE FUNCTION public.pick_response_strategy_v2(
  _question text,
  _epsilon numeric DEFAULT 0.2
)
RETURNS TABLE(strategy_id uuid, strategy_name text, prompt_addon text, context_name text, exploration_used boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ctx text := 'general';
  _rule record;
  _q text := lower(coalesce(_question, ''));
  _kw text;
  _forced_strategy text;
  _no_explore boolean := false;
  _eps numeric;
BEGIN
  -- Kontextus felismerés keyword alapján
  FOR _rule IN
    SELECT context_name, forced_strategy_name, disable_exploration, keywords
    FROM ai_question_context_rules
    WHERE is_active = true AND context_name <> 'general'
  LOOP
    FOREACH _kw IN ARRAY _rule.keywords LOOP
      IF _q LIKE '%' || lower(_kw) || '%' THEN
        _ctx := _rule.context_name;
        _forced_strategy := _rule.forced_strategy_name;
        _no_explore := _rule.disable_exploration;
        EXIT;
      END IF;
    END LOOP;
    EXIT WHEN _ctx <> 'general';
  END LOOP;

  -- Hard rule: kötelező stratégia
  IF _forced_strategy IS NOT NULL THEN
    RETURN QUERY
    SELECT s.id, s.name, s.prompt_addon, _ctx, false
    FROM ai_response_strategies s
    WHERE s.name = _forced_strategy AND s.is_active
    LIMIT 1;
    RETURN;
  END IF;

  -- Exploration tiltva kritikus kontextusban
  _eps := CASE WHEN _no_explore THEN 0 ELSE _epsilon END;

  -- Epsilon-greedy kontextusra szűrt win_rate-tel
  IF random() < _eps THEN
    RETURN QUERY
    SELECT s.id, s.name, s.prompt_addon, _ctx, true
    FROM ai_response_strategies s
    WHERE s.is_active
    ORDER BY random() LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT s.id, s.name, s.prompt_addon, _ctx, false
    FROM ai_response_strategies s
    WHERE s.is_active
    ORDER BY
      COALESCE((s.context_stats->_ctx->>'win_rate')::numeric, s.win_rate, 0.5) DESC,
      s.usage_count DESC
    LIMIT 1;
  END IF;
END;
$$;

-- 7. v2 stat update: súlyozott + kontextusonkénti
CREATE OR REPLACE FUNCTION public.update_strategy_stats_v2(
  _strategy_id uuid,
  _context text,
  _user_rating numeric DEFAULT NULL,
  _self_score numeric DEFAULT NULL,
  _is_admin boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_weight numeric;
  _self_weight numeric := 0.3;
  _combined numeric;
  _existing jsonb;
  _ctx_data jsonb;
  _ctx_count integer;
  _ctx_winrate numeric;
BEGIN
  -- Admin feedback súlya 2x
  _user_weight := CASE WHEN _is_admin THEN 1.4 ELSE 0.7 END;

  IF _user_rating IS NOT NULL AND _self_score IS NOT NULL THEN
    _combined := LEAST(1.0, (_user_rating * _user_weight + _self_score * _self_weight) / (_user_weight + _self_weight));
  ELSIF _user_rating IS NOT NULL THEN
    _combined := _user_rating;
  ELSIF _self_score IS NOT NULL THEN
    _combined := _self_score * 0.6; -- önámítás védelem
  ELSE
    RETURN;
  END IF;

  -- Globális update
  UPDATE ai_response_strategies
  SET
    usage_count = usage_count + 1,
    win_rate = ((win_rate * usage_count) + _combined) / (usage_count + 1),
    last_used_at = now(),
    updated_at = now(),
    positive_feedback_count = positive_feedback_count + CASE WHEN _user_rating >= 0.7 THEN 1 ELSE 0 END,
    negative_feedback_count = negative_feedback_count + CASE WHEN _user_rating < 0.4 THEN 1 ELSE 0 END
  WHERE id = _strategy_id
  RETURNING context_stats INTO _existing;

  -- Kontextusonkénti stat
  _ctx_data := COALESCE(_existing->_context, '{"count":0,"win_rate":0.5}'::jsonb);
  _ctx_count := COALESCE((_ctx_data->>'count')::int, 0);
  _ctx_winrate := COALESCE((_ctx_data->>'win_rate')::numeric, 0.5);
  _ctx_winrate := ((_ctx_winrate * _ctx_count) + _combined) / (_ctx_count + 1);

  UPDATE ai_response_strategies
  SET context_stats = jsonb_set(
    COALESCE(context_stats, '{}'::jsonb),
    ARRAY[_context],
    jsonb_build_object('count', _ctx_count + 1, 'win_rate', round(_ctx_winrate, 4))
  )
  WHERE id = _strategy_id;
END;
$$;

-- 8. Aggregált reflexió összegzés (nem nyers szöveg)
CREATE OR REPLACE FUNCTION public.get_reflection_summary(_limit integer DEFAULT 30)
RETURNS TABLE(
  total integer,
  avg_correctness numeric,
  avg_completeness numeric,
  avg_tone numeric,
  weak_response_count integer,
  top_weakness_tags jsonb,
  top_improvement_hints text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ids uuid[];
BEGIN
  SELECT array_agg(id) INTO _ids FROM (
    SELECT id FROM ai_response_reflections ORDER BY created_at DESC LIMIT _limit
  ) sub;

  RETURN QUERY
  WITH base AS (
    SELECT * FROM ai_response_reflections WHERE id = ANY(_ids)
  ),
  tag_counts AS (
    SELECT tag, count(*) AS cnt
    FROM base, unnest(weakness_tags) AS tag
    GROUP BY tag ORDER BY cnt DESC LIMIT 5
  )
  SELECT
    (SELECT count(*)::int FROM base),
    (SELECT round(avg(self_correctness)::numeric, 2) FROM base),
    (SELECT round(avg(self_completeness)::numeric, 2) FROM base),
    (SELECT round(avg(self_tone)::numeric, 2) FROM base),
    (SELECT count(*)::int FROM base WHERE COALESCE(overall_score, 0.7) < 0.6),
    (SELECT COALESCE(jsonb_object_agg(tag, cnt), '{}'::jsonb) FROM tag_counts),
    (SELECT COALESCE(array_agg(DISTINCT improvement_suggestion) FILTER (WHERE improvement_suggestion IS NOT NULL AND improvement_suggestion <> ''), '{}'::text[])
     FROM (SELECT improvement_suggestion FROM base WHERE COALESCE(overall_score, 0.7) < 0.6 ORDER BY created_at DESC LIMIT 5) s);
END;
$$;
