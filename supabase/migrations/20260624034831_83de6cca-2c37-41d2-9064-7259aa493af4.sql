
-- 1. partner_storefronts: új mezők
ALTER TABLE public.partner_storefronts
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS draft_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS last_approved_version_id UUID;

-- 2. partner_domain_requests
CREATE TABLE IF NOT EXISTS public.partner_domain_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  requested_domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  dns_instructions JSONB DEFAULT '{}'::jsonb,
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdr_partner ON public.partner_domain_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_pdr_status ON public.partner_domain_requests(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_domain_requests TO authenticated;
GRANT ALL ON public.partner_domain_requests TO service_role;
ALTER TABLE public.partner_domain_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner sees own domain requests" ON public.partner_domain_requests
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "partner inserts own domain requests" ON public.partner_domain_requests
  FOR INSERT TO authenticated
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
CREATE POLICY "partner updates own pending" ON public.partner_domain_requests
  FOR UPDATE TO authenticated
  USING ((partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) AND status = 'pending')
         OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (true);
CREATE POLICY "admin deletes domain requests" ON public.partner_domain_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. partner_storefront_versions
CREATE TABLE IF NOT EXISTS public.partner_storefront_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES public.partner_storefronts(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID,
  is_published_version BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(storefront_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_psv_storefront ON public.partner_storefront_versions(storefront_id, version_number DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_storefront_versions TO authenticated;
GRANT ALL ON public.partner_storefront_versions TO service_role;
ALTER TABLE public.partner_storefront_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner sees own versions" ON public.partner_storefront_versions
  FOR SELECT TO authenticated
  USING (storefront_id IN (
            SELECT s.id FROM public.partner_storefronts s
            JOIN public.partners p ON p.id = s.partner_id
            WHERE p.user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "service inserts versions" ON public.partner_storefront_versions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin updates versions" ON public.partner_storefront_versions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (true);

-- 4. partner_storefront_preview_tokens
CREATE TABLE IF NOT EXISTS public.partner_storefront_preview_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES public.partner_storefronts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours'),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pspt_token ON public.partner_storefront_preview_tokens(token);

GRANT SELECT, INSERT, DELETE ON public.partner_storefront_preview_tokens TO authenticated;
GRANT SELECT ON public.partner_storefront_preview_tokens TO anon;
GRANT ALL ON public.partner_storefront_preview_tokens TO service_role;
ALTER TABLE public.partner_storefront_preview_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone validates preview token" ON public.partner_storefront_preview_tokens
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "partner creates own preview token" ON public.partner_storefront_preview_tokens
  FOR INSERT TO authenticated
  WITH CHECK (storefront_id IN (
    SELECT s.id FROM public.partner_storefronts s
    JOIN public.partners p ON p.id = s.partner_id
    WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "partner deletes own preview token" ON public.partner_storefront_preview_tokens
  FOR DELETE TO authenticated
  USING (storefront_id IN (
    SELECT s.id FROM public.partner_storefronts s
    JOIN public.partners p ON p.id = s.partner_id
    WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'));

-- 5. Trigger: storefront UPDATE → snapshot versions
CREATE OR REPLACE FUNCTION public.snapshot_partner_storefront()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  next_v INT;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_v
    FROM public.partner_storefront_versions WHERE storefront_id = NEW.id;

  INSERT INTO public.partner_storefront_versions (storefront_id, version_number, snapshot, created_by, is_published_version, approved_at, approved_by)
  VALUES (NEW.id, next_v, to_jsonb(NEW), auth.uid(),
          (NEW.is_published IS TRUE AND COALESCE(OLD.is_published, false) IS FALSE),
          CASE WHEN NEW.is_published IS TRUE AND COALESCE(OLD.is_published,false) IS FALSE THEN now() END,
          CASE WHEN NEW.is_published IS TRUE AND COALESCE(OLD.is_published,false) IS FALSE THEN auth.uid() END);

  -- prune to last 50 per storefront
  DELETE FROM public.partner_storefront_versions
    WHERE storefront_id = NEW.id
      AND version_number <= next_v - 50;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_snapshot_partner_storefront ON public.partner_storefronts;
CREATE TRIGGER trg_snapshot_partner_storefront
  AFTER INSERT OR UPDATE ON public.partner_storefronts
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_partner_storefront();

-- 6. Trigger: domain request approved → storefront.custom_domain
CREATE OR REPLACE FUNCTION public.apply_approved_partner_domain()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.partner_storefronts
      SET custom_domain = lower(NEW.requested_domain),
          custom_domain_status = 'approved'
      WHERE partner_id = NEW.partner_id;
  END IF;
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    UPDATE public.partner_storefronts
      SET custom_domain = lower(NEW.requested_domain),
          custom_domain_status = 'active'
      WHERE partner_id = NEW.partner_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_approved_partner_domain ON public.partner_domain_requests;
CREATE TRIGGER trg_apply_approved_partner_domain
  AFTER UPDATE ON public.partner_domain_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_approved_partner_domain();

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_pdr_updated_at ON public.partner_domain_requests;
CREATE TRIGGER trg_pdr_updated_at BEFORE UPDATE ON public.partner_domain_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
