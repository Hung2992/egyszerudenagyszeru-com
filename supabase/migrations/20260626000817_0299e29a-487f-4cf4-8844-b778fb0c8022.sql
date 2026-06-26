
-- 1) New columns on partner_domain_requests
ALTER TABLE public.partner_domain_requests
  ADD COLUMN IF NOT EXISTS auto_check_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_auto_check_at timestamptz;

-- 2) New table: partner_domain_proof_versions
CREATE TABLE IF NOT EXISTS public.partner_domain_proof_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.partner_domain_requests(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  dns_proof_url text,
  partner_self_reported boolean,
  dns_check_status text,
  dns_check_result jsonb,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, version_no)
);

GRANT SELECT, INSERT ON public.partner_domain_proof_versions TO authenticated;
GRANT ALL ON public.partner_domain_proof_versions TO service_role;

ALTER TABLE public.partner_domain_proof_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner sees own proof versions"
  ON public.partner_domain_proof_versions FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "system inserts proof versions"
  ON public.partner_domain_proof_versions FOR INSERT TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX IF NOT EXISTS idx_pdpv_request ON public.partner_domain_proof_versions(request_id, version_no DESC);

-- 3) Trigger: snapshot on relevant changes
CREATE OR REPLACE FUNCTION public.snapshot_partner_domain_proof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
  v_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_changed := true;
  ELSE
    IF COALESCE(NEW.dns_proof_url,'') IS DISTINCT FROM COALESCE(OLD.dns_proof_url,'')
       OR COALESCE(NEW.dns_check_status,'') IS DISTINCT FROM COALESCE(OLD.dns_check_status,'')
       OR COALESCE(NEW.dns_check_result::text,'') IS DISTINCT FROM COALESCE(OLD.dns_check_result::text,'')
       OR NEW.partner_self_reported IS DISTINCT FROM OLD.partner_self_reported THEN
      v_changed := true;
    END IF;
  END IF;

  IF NOT v_changed THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(version_no),0) + 1 INTO v_next
  FROM public.partner_domain_proof_versions WHERE request_id = NEW.id;

  INSERT INTO public.partner_domain_proof_versions(
    request_id, partner_id, version_no, dns_proof_url, partner_self_reported,
    dns_check_status, dns_check_result, created_by
  ) VALUES (
    NEW.id, NEW.partner_id, v_next, NEW.dns_proof_url, NEW.partner_self_reported,
    NEW.dns_check_status, NEW.dns_check_result, auth.uid()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_partner_domain_proof ON public.partner_domain_requests;
CREATE TRIGGER trg_snapshot_partner_domain_proof
AFTER INSERT OR UPDATE ON public.partner_domain_requests
FOR EACH ROW EXECUTE FUNCTION public.snapshot_partner_domain_proof();

-- 4) pg_cron: auto DNS recheck every 30 minutes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'partner-domain-dns-auto-recheck') THEN
    PERFORM cron.schedule(
      'partner-domain-dns-auto-recheck',
      '*/30 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/verify-partner-domain-dns',
        headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1leXhoc2ducnl1dXB3cGRkeGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjEwMzcsImV4cCI6MjA5MTY5NzAzN30.dRu3F4ZdGMWtJGv3Z3lb7UjwiaJiDC4hn5OkDn6MSVY"}'::jsonb,
        body := '{"scheduled":true}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;
