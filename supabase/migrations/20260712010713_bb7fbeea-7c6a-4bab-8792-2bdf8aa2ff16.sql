
-- 1) preview tokens
DROP POLICY IF EXISTS "anyone validates preview token" ON public.partner_storefront_preview_tokens;

CREATE OR REPLACE FUNCTION public.validate_preview_token(_token text)
RETURNS TABLE(storefront_id uuid, partner_id uuid, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.storefront_id, s.partner_id, t.expires_at
  FROM public.partner_storefront_preview_tokens t
  JOIN public.partner_storefronts s ON s.id = t.storefront_id
  WHERE t.token = _token
    AND t.revoked_at IS NULL
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND (t.max_uses IS NULL OR t.use_count < t.max_uses)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_preview_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_preview_token(text) TO anon, authenticated;

-- 2) partner_contracts
DROP POLICY IF EXISTS "Partner can sign own contract" ON public.partner_contracts;

CREATE OR REPLACE FUNCTION public.enforce_partner_contract_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF NEW.contract_body IS DISTINCT FROM OLD.contract_body
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.owner_signed_at IS DISTINCT FROM OLD.owner_signed_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
    RAISE EXCEPTION 'Partners may only update signature fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_partner_contract_update ON public.partner_contracts;
CREATE TRIGGER trg_enforce_partner_contract_update
BEFORE UPDATE ON public.partner_contracts
FOR EACH ROW EXECUTE FUNCTION public.enforce_partner_contract_update();

CREATE POLICY "Partner can sign own contract"
ON public.partner_contracts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3) partner_domain_requests
DROP POLICY IF EXISTS "partner updates own pending" ON public.partner_domain_requests;

CREATE OR REPLACE FUNCTION public.enforce_partner_domain_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.admin_note IS DISTINCT FROM OLD.admin_note
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.dns_check_status IS DISTINCT FROM OLD.dns_check_status
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
    RAISE EXCEPTION 'Partners cannot modify admin/status fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_partner_domain_request_update ON public.partner_domain_requests;
CREATE TRIGGER trg_enforce_partner_domain_request_update
BEFORE UPDATE ON public.partner_domain_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_partner_domain_request_update();

CREATE POLICY "partner updates own pending"
ON public.partner_domain_requests
FOR UPDATE
TO authenticated
USING (
  (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) AND status = 'pending')
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) AND status = 'pending')
  OR public.has_role(auth.uid(), 'admin')
);

-- 4) partner_storefronts publish restriction
CREATE OR REPLACE FUNCTION public.enforce_partner_storefront_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.is_published IS DISTINCT FROM OLD.is_published
     OR NEW.published_at IS DISTINCT FROM OLD.published_at
     OR NEW.last_approved_version_id IS DISTINCT FROM OLD.last_approved_version_id
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
    RAISE EXCEPTION 'Only admins can change publish state';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_partner_storefront_update ON public.partner_storefronts;
CREATE TRIGGER trg_enforce_partner_storefront_update
BEFORE UPDATE ON public.partner_storefronts
FOR EACH ROW EXECUTE FUNCTION public.enforce_partner_storefront_update();

-- 5) audit log INSERT restriction
DROP POLICY IF EXISTS "System can insert audit logs" ON public.partner_storefront_audit_log;

CREATE POLICY "Audit inserts by owner or admin"
ON public.partner_storefront_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_storefront_audit_log.partner_id AND p.user_id = auth.uid())
);

CREATE POLICY "Service role writes audit"
ON public.partner_storefront_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- 6) owner_company_profile SELECT restriction
DROP POLICY IF EXISTS "Anyone authenticated can read owner profile" ON public.owner_company_profile;

CREATE POLICY "Admin/accountant read owner profile"
ON public.owner_company_profile
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'accountant')
);

-- 7) Cron secret
INSERT INTO public.internal_cron_config(key, value)
VALUES ('order_automation_secret', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO NOTHING;
