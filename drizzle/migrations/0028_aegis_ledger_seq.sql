ALTER TABLE public.workforce_audit ADD COLUMN IF NOT EXISTS seq bigint GENERATED ALWAYS AS IDENTITY;

CREATE OR REPLACE FUNCTION public.workforce_audit_chain()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE prev text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('workforce_audit_chain'));
  SELECT hash INTO prev FROM workforce_audit WHERE hash IS NOT NULL ORDER BY seq DESC LIMIT 1;
  NEW.prev_hash := coalesce(prev, 'GENESIS');
  NEW.hash := encode(extensions.digest(NEW.prev_hash || '|' || NEW.plan_id || '|' || coalesce(NEW.step_id::text,'') || '|' || NEW.action || '|' || coalesce(NEW.actor::text,'') || '|' || NEW.detail::text || '|' || NEW.created_at::text, 'sha256'), 'hex');
  RETURN NEW;
END $$;

-- Verify: every row's content hash must recompute, and its prev_hash must point to an earlier real entry (or GENESIS).
CREATE OR REPLACE FUNCTION public.aegis_verify_ledger()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r record; seen text[] := ARRAY['GENESIS']; n int := 0; broken int := 0; legacy int := 0;
BEGIN
  IF NOT public.empyrean_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR r IN SELECT * FROM workforce_audit ORDER BY created_at, seq LOOP
    IF r.hash IS NULL THEN legacy := legacy + 1; CONTINUE; END IF;
    n := n + 1;
    IF NOT (r.prev_hash = ANY(seen)) OR r.hash <> encode(extensions.digest(r.prev_hash || '|' || r.plan_id || '|' || coalesce(r.step_id::text,'') || '|' || r.action || '|' || coalesce(r.actor::text,'') || '|' || r.detail::text || '|' || r.created_at::text, 'sha256'), 'hex') THEN
      broken := broken + 1; END IF;
    seen := seen || r.hash;
  END LOOP;
  RETURN jsonb_build_object('checked', n, 'broken', broken, 'legacy', legacy, 'ok', broken = 0);
END $$;