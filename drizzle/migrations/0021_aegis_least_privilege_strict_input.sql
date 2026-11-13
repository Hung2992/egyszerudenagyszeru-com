-- Least privilege: build metrics only for own partner (admins via existing policy)
DROP POLICY IF EXISTS metrics_insert_authenticated ON public.platform_build_metrics;
CREATE POLICY metrics_insert_own_partner ON public.platform_build_metrics FOR INSERT TO authenticated
WITH CHECK (partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()));

-- Tenant isolation: sitemap cache readable only for published storefronts (generator uses service role)
DROP POLICY IF EXISTS "Anyone can read sitemap cache" ON public.partner_sitemap_cache;
CREATE POLICY "Read sitemap of published storefronts" ON public.partner_sitemap_cache FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.partner_storefronts s WHERE s.id = storefront_id AND s.is_published));

-- Strict input mode for AI calls
CREATE TABLE public.aegis_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  input_mode text NOT NULL DEFAULT 'block' CHECK (input_mode IN ('flag','block')),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.aegis_settings(id) VALUES (true);
GRANT SELECT ON public.aegis_settings TO authenticated;
GRANT ALL ON public.aegis_settings TO service_role;
ALTER TABLE public.aegis_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read aegis settings" ON public.aegis_settings FOR SELECT TO authenticated USING (public.empyrean_is_admin());

CREATE OR REPLACE FUNCTION public.aegis_set_input_mode(_mode text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur text;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _mode NOT IN ('flag','block') THEN RAISE EXCEPTION 'ismeretlen mód'; END IF;
  IF _mode = 'flag' AND char_length(coalesce(trim(_reason),'')) < 10 THEN RAISE EXCEPTION 'AEGIS: a védelem gyengítéséhez indoklás kell (min. 10 karakter)'; END IF;
  SELECT input_mode INTO cur FROM aegis_settings WHERE id;
  UPDATE aegis_settings SET input_mode = _mode, updated_by = auth.uid(), updated_at = now() WHERE id;
  INSERT INTO empyrean_audit_log(actor_id, agent_slug, action, target, detail)
  VALUES (auth.uid(), 'aegis', 'input_mode', 'ai', jsonb_build_object('from', cur, 'to', _mode, 'reason', left(_reason, 500)));
END $$;

-- one call: agent state + input mode
CREATE OR REPLACE FUNCTION public.aegis_policy(_agent text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('state', public.aegis_agent_allowed(_agent),
    'input_mode', coalesce((SELECT input_mode FROM aegis_settings WHERE id), 'block'))
$$;
REVOKE ALL ON FUNCTION public.aegis_set_input_mode(text,text), public.aegis_policy(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aegis_set_input_mode(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aegis_policy(text) TO service_role;