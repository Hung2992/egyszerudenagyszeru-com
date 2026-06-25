
-- ============================================================
-- 1. partner_storefronts SEO + company fields
-- ============================================================
ALTER TABLE public.partner_storefronts
  ADD COLUMN IF NOT EXISTS seo_keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS company_legal_name text,
  ADD COLUMN IF NOT EXISTS company_tax_id text,
  ADD COLUMN IF NOT EXISTS company_registration_number text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS founding_year integer,
  ADD COLUMN IF NOT EXISTS social_profiles jsonb DEFAULT '[]'::jsonb;

-- ============================================================
-- 2. partner_storefront_preview_tokens extensions
-- ============================================================
ALTER TABLE public.partner_storefront_preview_tokens
  ADD COLUMN IF NOT EXISTS max_uses integer,
  ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_accessed_ip text,
  ADD COLUMN IF NOT EXISTS last_accessed_user_agent text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS label text;

-- ============================================================
-- 3. partner_domain_requests DNS proof fields
-- ============================================================
ALTER TABLE public.partner_domain_requests
  ADD COLUMN IF NOT EXISTS dns_proof_url text,
  ADD COLUMN IF NOT EXISTS dns_check_status text NOT NULL DEFAULT 'not_checked',
  ADD COLUMN IF NOT EXISTS dns_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS dns_check_result jsonb,
  ADD COLUMN IF NOT EXISTS partner_self_reported boolean NOT NULL DEFAULT false;

-- ============================================================
-- 4. preview access log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_storefront_preview_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.partner_storefront_preview_tokens(id) ON DELETE CASCADE,
  storefront_id uuid,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  viewer_user_id uuid,
  outcome text NOT NULL DEFAULT 'allowed'
);

GRANT SELECT ON public.partner_storefront_preview_access_log TO authenticated;
GRANT ALL ON public.partner_storefront_preview_access_log TO service_role;

ALTER TABLE public.partner_storefront_preview_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all preview access logs"
  ON public.partner_storefront_preview_access_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners see logs for their own storefront tokens"
  ON public.partner_storefront_preview_access_log FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_storefront_preview_tokens t
    JOIN public.partner_storefronts s ON s.id = t.storefront_id
    JOIN public.partners p ON p.id = s.partner_id
    WHERE t.id = token_id AND p.user_id = auth.uid()
  ));

-- ============================================================
-- 5. audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_storefront_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id uuid,
  partner_id uuid,
  actor_user_id uuid,
  actor_role text,
  action text NOT NULL,
  changed_fields jsonb DEFAULT '[]'::jsonb,
  before_snapshot jsonb,
  after_snapshot jsonb,
  ip text,
  user_agent text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psal_storefront_created ON public.partner_storefront_audit_log(storefront_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psal_partner_created ON public.partner_storefront_audit_log(partner_id, created_at DESC);

GRANT SELECT, INSERT ON public.partner_storefront_audit_log TO authenticated;
GRANT ALL ON public.partner_storefront_audit_log TO service_role;

ALTER TABLE public.partner_storefront_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all audit logs"
  ON public.partner_storefront_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners see their own audit logs"
  ON public.partner_storefront_audit_log FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "System can insert audit logs"
  ON public.partner_storefront_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 6. sitemap cache
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_sitemap_cache (
  storefront_id uuid PRIMARY KEY REFERENCES public.partner_storefronts(id) ON DELETE CASCADE,
  xml text NOT NULL,
  etag text NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_sitemap_cache TO anon, authenticated;
GRANT ALL ON public.partner_sitemap_cache TO service_role;

ALTER TABLE public.partner_sitemap_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sitemap cache"
  ON public.partner_sitemap_cache FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 7. trigger: storefront update -> audit log + sitemap cache invalidation
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_partner_storefront_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed jsonb := '[]'::jsonb;
  k text;
  before_j jsonb;
  after_j jsonb;
BEGIN
  before_j := to_jsonb(OLD);
  after_j := to_jsonb(NEW);

  FOR k IN SELECT jsonb_object_keys(after_j) LOOP
    IF (before_j -> k) IS DISTINCT FROM (after_j -> k)
       AND k NOT IN ('updated_at', 'draft_snapshot') THEN
      changed := changed || to_jsonb(k);
    END IF;
  END LOOP;

  IF jsonb_array_length(changed) > 0 THEN
    INSERT INTO public.partner_storefront_audit_log
      (storefront_id, partner_id, actor_user_id, action, changed_fields, before_snapshot, after_snapshot)
    VALUES
      (NEW.id, NEW.partner_id, auth.uid(), 'update', changed, before_j, after_j);

    -- invalidate sitemap cache
    DELETE FROM public.partner_sitemap_cache WHERE storefront_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_partner_storefront_changes ON public.partner_storefronts;
CREATE TRIGGER trg_log_partner_storefront_changes
  AFTER UPDATE ON public.partner_storefronts
  FOR EACH ROW EXECUTE FUNCTION public.log_partner_storefront_changes();

-- ============================================================
-- 8. trigger: domain request -> audit log
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_partner_domain_request_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'domain_request';
    INSERT INTO public.partner_storefront_audit_log
      (partner_id, actor_user_id, action, after_snapshot)
    VALUES (NEW.partner_id, auth.uid(), act, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    act := 'domain_status_' || NEW.status;
    INSERT INTO public.partner_storefront_audit_log
      (partner_id, actor_user_id, action, before_snapshot, after_snapshot)
    VALUES (NEW.partner_id, auth.uid(), act, to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_partner_domain_request_changes ON public.partner_domain_requests;
CREATE TRIGGER trg_log_partner_domain_request_changes
  AFTER INSERT OR UPDATE ON public.partner_domain_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_partner_domain_request_changes();

-- ============================================================
-- 9. trigger: product change -> invalidate that partner's sitemap cache
-- ============================================================
CREATE OR REPLACE FUNCTION public.invalidate_partner_sitemap_on_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.partner_id, OLD.partner_id);
  DELETE FROM public.partner_sitemap_cache
    WHERE storefront_id IN (SELECT id FROM public.partner_storefronts WHERE partner_id = pid);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_invalidate_sitemap_on_product ON public.partner_products;
CREATE TRIGGER trg_invalidate_sitemap_on_product
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_products
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_partner_sitemap_on_product();
