-- META-LEARNING LAYER

-- 1. Meta-tanulási futások
CREATE TABLE IF NOT EXISTS public.ai_meta_learning_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL DEFAULT 'scheduled',
  reflections_analyzed INTEGER NOT NULL DEFAULT 0,
  feedback_analyzed INTEGER NOT NULL DEFAULT 0,
  patterns_found JSONB NOT NULL DEFAULT '[]'::jsonb,
  weak_strategies JSONB NOT NULL DEFAULT '[]'::jsonb,
  weak_contexts JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_weakness_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  self_deception_score NUMERIC NOT NULL DEFAULT 0,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_meta_learning_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meta runs" ON public.ai_meta_learning_runs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage meta runs" ON public.ai_meta_learning_runs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Meta-akciók (auto-tuning lépések, visszavonhatók)
CREATE TABLE IF NOT EXISTS public.ai_meta_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_meta_learning_runs(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  description TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_state JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  reverted_at TIMESTAMPTZ,
  applied_by UUID,
  auto_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_meta_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meta actions" ON public.ai_meta_actions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage meta actions" ON public.ai_meta_actions
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Meta-elvek (felfedezett, súlyozott szabályok az AI viselkedéséhez)
CREATE TABLE IF NOT EXISTS public.ai_meta_principles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principle TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT 'general',
  source TEXT NOT NULL DEFAULT 'meta_learning',
  weight NUMERIC NOT NULL DEFAULT 0.5,
  reinforcement_count INTEGER NOT NULL DEFAULT 1,
  contradiction_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_reinforced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_meta_principles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meta principles" ON public.ai_meta_principles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage meta principles" ON public.ai_meta_principles
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role read meta principles" ON public.ai_meta_principles
  FOR SELECT USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_meta_principles_active ON public.ai_meta_principles(is_active, weight DESC);
CREATE INDEX IF NOT EXISTS idx_meta_principles_context ON public.ai_meta_principles(context) WHERE is_active = true;

-- 4. Meta-tanulási elemzés RPC
CREATE OR REPLACE FUNCTION public.run_meta_learning_analysis(_lookback INTEGER DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reflections_count INTEGER;
  v_feedback_count INTEGER;
  v_weak_strategies JSONB;
  v_weak_contexts JSONB;
  v_top_tags JSONB;
  v_self_deception NUMERIC;
  v_recommendations JSONB := '[]'::jsonb;
  v_run_id UUID;
BEGIN
  -- Reflexiók száma
  SELECT COUNT(*) INTO v_reflections_count
  FROM ai_response_reflections
  WHERE created_at > now() - interval '30 days'
  ORDER BY created_at DESC
  LIMIT _lookback;

  -- Feedback száma
  SELECT COUNT(*) INTO v_feedback_count
  FROM ai_response_feedback
  WHERE created_at > now() - interval '30 days';

  -- Gyenge stratégiák (alacsony win_rate, elég használat)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'win_rate', win_rate, 'usage', usage_count
  )), '[]'::jsonb) INTO v_weak_strategies
  FROM (
    SELECT id, name, win_rate, usage_count
    FROM ai_response_strategies
    WHERE is_active = true AND usage_count >= 5 AND win_rate < 0.4
    ORDER BY win_rate ASC LIMIT 5
  ) s;

  -- Gyenge kontextusok (átlag overall_score < 0.5)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'context', question_context,
    'avg_score', ROUND(AVG(overall_score)::numeric, 3),
    'count', COUNT(*)
  )), '[]'::jsonb) INTO v_weak_contexts
  FROM (
    SELECT question_context, overall_score
    FROM ai_response_reflections
    WHERE created_at > now() - interval '30 days'
    ORDER BY created_at DESC
    LIMIT _lookback
  ) r
  GROUP BY question_context
  HAVING AVG(overall_score) < 0.6 AND COUNT(*) >= 3;

  -- Top gyengeség címkék
  SELECT COALESCE(jsonb_agg(jsonb_build_object('tag', tag, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_top_tags
  FROM (
    SELECT unnest(weakness_tags) AS tag, COUNT(*) AS cnt
    FROM (
      SELECT weakness_tags FROM ai_response_reflections
      WHERE created_at > now() - interval '30 days'
      ORDER BY created_at DESC LIMIT _lookback
    ) x
    GROUP BY tag
    ORDER BY cnt DESC LIMIT 8
  ) t;

  -- Önámítás-detektor: AI önértékelés vs. admin negatív feedback eltérése
  SELECT COALESCE(ROUND(AVG(
    GREATEST(0, r.overall_score - CASE WHEN f.rating = -1 THEN 0.2 ELSE 0.7 END)
  )::numeric, 3), 0) INTO v_self_deception
  FROM ai_response_reflections r
  JOIN ai_response_feedback f ON f.reflection_id = r.id
  WHERE f.is_admin = true AND f.created_at > now() - interval '30 days';

  -- Ajánlások generálása
  IF jsonb_array_length(v_weak_strategies) > 0 THEN
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'type', 'reduce_strategy_usage',
      'priority', 'high',
      'reason', 'Gyenge teljesítményű stratégiák azonosítva',
      'targets', v_weak_strategies
    ));
  END IF;

  IF jsonb_array_length(v_weak_contexts) > 0 THEN
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'type', 'add_context_rule',
      'priority', 'medium',
      'reason', 'Kontextusok ahol mindig gyenge a válasz — érdemes hard rule-t hozni',
      'targets', v_weak_contexts
    ));
  END IF;

  IF v_self_deception > 0.3 THEN
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'type', 'lower_self_score_weight',
      'priority', 'high',
      'reason', 'Önámítás detektálva: az AI túl jónak ítéli magát az admin feedbackhez képest',
      'value', v_self_deception
    ));
  END IF;

  -- Futás mentése
  INSERT INTO ai_meta_learning_runs (
    run_type, reflections_analyzed, feedback_analyzed,
    weak_strategies, weak_contexts, top_weakness_tags,
    self_deception_score, recommended_actions,
    summary
  ) VALUES (
    'manual', v_reflections_count, v_feedback_count,
    v_weak_strategies, v_weak_contexts, v_top_tags,
    v_self_deception, v_recommendations,
    format('%s reflexió, %s feedback elemezve. %s gyenge stratégia, %s gyenge kontextus, önámítás: %s',
      v_reflections_count, v_feedback_count,
      jsonb_array_length(v_weak_strategies), jsonb_array_length(v_weak_contexts), v_self_deception)
  ) RETURNING id INTO v_run_id;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'reflections', v_reflections_count,
    'feedback', v_feedback_count,
    'weak_strategies', v_weak_strategies,
    'weak_contexts', v_weak_contexts,
    'top_tags', v_top_tags,
    'self_deception', v_self_deception,
    'recommendations', v_recommendations
  );
END;
$$;

-- 5. Meta-akció alkalmazása
CREATE OR REPLACE FUNCTION public.apply_meta_action(_action_id UUID, _user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action RECORD;
  v_prev JSONB;
BEGIN
  SELECT * INTO v_action FROM ai_meta_actions WHERE id = _action_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'action not found or already applied');
  END IF;

  IF v_action.action_type = 'deactivate_strategy' AND v_action.target_id IS NOT NULL THEN
    SELECT to_jsonb(s.*) INTO v_prev FROM ai_response_strategies s WHERE id = v_action.target_id;
    UPDATE ai_response_strategies SET is_active = false, updated_at = now() WHERE id = v_action.target_id;

  ELSIF v_action.action_type = 'add_context_rule' THEN
    INSERT INTO ai_question_context_rules (context_name, keywords, forced_strategy_name, disable_exploration, description)
    VALUES (
      v_action.payload->>'context_name',
      ARRAY(SELECT jsonb_array_elements_text(v_action.payload->'keywords')),
      v_action.payload->>'forced_strategy_name',
      COALESCE((v_action.payload->>'disable_exploration')::boolean, true),
      v_action.description
    );

  ELSIF v_action.action_type = 'add_principle' THEN
    INSERT INTO ai_meta_principles (principle, context, source, weight)
    VALUES (
      v_action.payload->>'principle',
      COALESCE(v_action.payload->>'context', 'general'),
      'meta_action',
      COALESCE((v_action.payload->>'weight')::numeric, 0.6)
    );
  END IF;

  UPDATE ai_meta_actions
  SET status = 'applied', applied_at = now(), applied_by = _user_id, previous_state = v_prev
  WHERE id = _action_id;

  RETURN jsonb_build_object('success', true, 'action_id', _action_id);
END;
$$;

-- 6. Visszavonás
CREATE OR REPLACE FUNCTION public.revert_meta_action(_action_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action RECORD;
BEGIN
  SELECT * INTO v_action FROM ai_meta_actions WHERE id = _action_id AND status = 'applied';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'action not found or not applied');
  END IF;

  IF v_action.action_type = 'deactivate_strategy' AND v_action.target_id IS NOT NULL AND v_action.previous_state IS NOT NULL THEN
    UPDATE ai_response_strategies
    SET is_active = COALESCE((v_action.previous_state->>'is_active')::boolean, true),
        updated_at = now()
    WHERE id = v_action.target_id;
  END IF;

  UPDATE ai_meta_actions SET status = 'reverted', reverted_at = now() WHERE id = _action_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Aktív elvek lekérése system prompt injekcióhoz
CREATE OR REPLACE FUNCTION public.get_active_principles(_context TEXT DEFAULT 'general', _limit INTEGER DEFAULT 5)
RETURNS TABLE(principle TEXT, weight NUMERIC, context TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT principle, weight, context
  FROM ai_meta_principles
  WHERE is_active = true AND (context = _context OR context = 'general')
  ORDER BY weight DESC, reinforcement_count DESC
  LIMIT _limit;
$$;