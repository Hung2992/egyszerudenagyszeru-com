
-- 1) Owner company profile (versioned)
CREATE TABLE public.owner_company_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  entity_type text NOT NULL DEFAULT 'sole_proprietor',
  legal_name text NOT NULL,
  representative_name text NOT NULL,
  tax_identification_number text,
  tax_number text NOT NULL,
  eu_tax_number text,
  registration_number text,
  address text NOT NULL,
  email text,
  phone text,
  is_current boolean NOT NULL DEFAULT false,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(version)
);
CREATE UNIQUE INDEX owner_company_profile_one_current ON public.owner_company_profile(is_current) WHERE is_current = true;

GRANT SELECT ON public.owner_company_profile TO authenticated;
GRANT ALL ON public.owner_company_profile TO service_role;
ALTER TABLE public.owner_company_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read owner profile"
  ON public.owner_company_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins manage owner profile"
  ON public.owner_company_profile FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.owner_company_profile (
  version, entity_type, legal_name, representative_name,
  tax_identification_number, tax_number, eu_tax_number,
  address, is_current
) VALUES (
  1, 'sole_proprietor',
  'Horváth Zoltán egyéni vállalkozó',
  'Horváth Zoltán',
  '8493591351',
  '92115477-2-27',
  'HU92115477',
  'Magyarország',
  true
);

-- 2) Audit log
CREATE TABLE public.partner_contract_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.partner_contracts(id) ON DELETE CASCADE,
  kyc_submission_id uuid,
  event_type text NOT NULL,
  actor_id uuid,
  actor_role text,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pc_audit_contract ON public.partner_contract_audit_log(contract_id, created_at DESC);

GRANT SELECT, INSERT ON public.partner_contract_audit_log TO authenticated;
GRANT ALL ON public.partner_contract_audit_log TO service_role;
ALTER TABLE public.partner_contract_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all audit"
  ON public.partner_contract_audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Partner views own audit"
  ON public.partner_contract_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partner_contracts c WHERE c.id = contract_id AND c.user_id = auth.uid()));
CREATE POLICY "Authenticated can insert audit for own"
  ON public.partner_contract_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.partner_contracts c WHERE c.id = contract_id AND c.user_id = auth.uid())
  );

-- 3) Extend partner_contracts
ALTER TABLE public.partner_contracts
  ADD COLUMN IF NOT EXISTS contract_hash text,
  ADD COLUMN IF NOT EXISTS contract_pdf_path text,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS correction_notes text,
  ADD COLUMN IF NOT EXISTS owner_profile_version integer;

-- 4) Lock trigger — after locked_at, immutable except status/pdf_path/rejection/correction
CREATE OR REPLACE FUNCTION public.enforce_contract_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL THEN
    IF NEW.contract_body IS DISTINCT FROM OLD.contract_body
       OR NEW.contract_hash IS DISTINCT FROM OLD.contract_hash
       OR NEW.partner_signed_at IS DISTINCT FROM OLD.partner_signed_at
       OR NEW.partner_signature_name IS DISTINCT FROM OLD.partner_signature_name
       OR NEW.partner_signature_ip IS DISTINCT FROM OLD.partner_signature_ip
       OR NEW.contract_number IS DISTINCT FROM OLD.contract_number
       OR NEW.contract_version IS DISTINCT FROM OLD.contract_version
       OR NEW.owner_profile_version IS DISTINCT FROM OLD.owner_profile_version
       OR NEW.partner_full_name IS DISTINCT FROM OLD.partner_full_name
       OR NEW.partner_address IS DISTINCT FROM OLD.partner_address
       OR NEW.partner_id_card_number IS DISTINCT FROM OLD.partner_id_card_number
    THEN
      RAISE EXCEPTION 'Contract is locked after signature — immutable fields cannot change';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_immutable ON public.partner_contracts;
CREATE TRIGGER trg_contract_immutable
  BEFORE UPDATE ON public.partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contract_immutability();

-- 5) Replace status trigger with full workflow + hashing + locking
CREATE OR REPLACE FUNCTION public.update_contract_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- block invalid status edits if locked done above
  -- Hash computation when partner signs (transition to signed by partner)
  IF NEW.partner_signed_at IS NOT NULL AND OLD.partner_signed_at IS NULL THEN
    NEW.contract_hash := encode(digest(
      coalesce(NEW.contract_body,'') || '|' ||
      coalesce(NEW.contract_number,'') || '|' ||
      coalesce(NEW.partner_signature_name,'') || '|' ||
      coalesce(to_char(NEW.partner_signed_at,'YYYY-MM-DD"T"HH24:MI:SS.MSOF'),''),
      'sha256'), 'hex');
    NEW.locked_at := now();
  END IF;

  -- Status machine
  IF NEW.status = 'rejected' OR NEW.status = 'needs_correction' THEN
    -- explicit admin set, keep as-is
    NULL;
  ELSIF NEW.owner_signed_at IS NOT NULL AND NEW.partner_signed_at IS NOT NULL THEN
    NEW.status := 'signed';
    IF NEW.effective_from IS NULL THEN
      NEW.effective_from := CURRENT_DATE;
    END IF;
  ELSIF NEW.partner_signed_at IS NOT NULL THEN
    NEW.status := 'pending_admin_countersign';
  ELSE
    NEW.status := 'pending_partner_signature';
  END IF;

  RETURN NEW;
END;
$$;

-- 6) Audit-log triggers
CREATE OR REPLACE FUNCTION public.log_contract_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.partner_contract_audit_log(contract_id, kyc_submission_id, event_type, actor_id, actor_role, details)
    VALUES (NEW.id, NEW.kyc_submission_id, 'contract_generated', auth.uid(), coalesce(auth.role(),'system'),
            jsonb_build_object('contract_number', NEW.contract_number, 'owner_profile_version', NEW.owner_profile_version));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.partner_signed_at IS NOT NULL AND OLD.partner_signed_at IS NULL THEN
      INSERT INTO public.partner_contract_audit_log(contract_id, event_type, actor_id, actor_role, ip_address, details)
      VALUES (NEW.id, 'partner_signed', auth.uid(), 'partner', NEW.partner_signature_ip,
              jsonb_build_object('name', NEW.partner_signature_name, 'hash', NEW.contract_hash));
    END IF;
    IF NEW.owner_signed_at IS NOT NULL AND OLD.owner_signed_at IS NULL THEN
      INSERT INTO public.partner_contract_audit_log(contract_id, event_type, actor_id, actor_role, ip_address, details)
      VALUES (NEW.id, 'admin_countersigned', auth.uid(), 'admin', NEW.owner_signature_ip,
              jsonb_build_object('name', NEW.owner_signature_name));
    END IF;
    IF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
      INSERT INTO public.partner_contract_audit_log(contract_id, event_type, actor_id, actor_role, details)
      VALUES (NEW.id, 'rejected', auth.uid(), 'admin', jsonb_build_object('reason', NEW.rejection_reason));
    END IF;
    IF NEW.status = 'needs_correction' AND OLD.status <> 'needs_correction' THEN
      INSERT INTO public.partner_contract_audit_log(contract_id, event_type, actor_id, actor_role, details)
      VALUES (NEW.id, 'correction_requested', auth.uid(), 'admin', jsonb_build_object('notes', NEW.correction_notes));
    END IF;
    IF NEW.contract_pdf_path IS DISTINCT FROM OLD.contract_pdf_path AND NEW.contract_pdf_path IS NOT NULL THEN
      INSERT INTO public.partner_contract_audit_log(contract_id, event_type, actor_id, actor_role, details)
      VALUES (NEW.id, 'pdf_generated', auth.uid(), coalesce(auth.role(),'system'), jsonb_build_object('path', NEW.contract_pdf_path));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_audit_ins ON public.partner_contracts;
DROP TRIGGER IF EXISTS trg_contract_audit_upd ON public.partner_contracts;
CREATE TRIGGER trg_contract_audit_ins AFTER INSERT ON public.partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_contract_events();
CREATE TRIGGER trg_contract_audit_upd AFTER UPDATE ON public.partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_contract_events();

-- 7) Update generator to pull owner data from owner_company_profile + log role grant
CREATE OR REPLACE FUNCTION public.generate_partner_contract_on_kyc_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_number text;
  v_address text;
  v_body text;
  v_owner public.owner_company_profile%ROWTYPE;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    IF EXISTS (SELECT 1 FROM public.partner_contracts WHERE kyc_submission_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_owner FROM public.owner_company_profile WHERE is_current = true LIMIT 1;
    IF v_owner.id IS NULL THEN
      RAISE EXCEPTION 'No current owner_company_profile configured';
    END IF;

    v_contract_number := 'EDN-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(NEW.id::text,'-',''),1,6));
    v_address := concat_ws(', ',
      concat_ws(' ', NEW.address_zip, NEW.address_city),
      NEW.address_street, NEW.address_country);

    v_body := format($body$PARTNERI SZERZŐDÉS

Szerződésszám: %s
Kelt: %s
Cégadatok verzió: v%s

I. SZERZŐDŐ FELEK

Üzemeltető:
  %s
  Képviselő: %s
  Adóazonosító jel: %s
  Adószám: %s
  Közösségi adószám: %s
  Székhely: %s

Partner:
  Név: %s
  Születési név: %s
  Születési hely, idő: %s, %s
  Anyja neve: %s
  Lakcím: %s
  Személyi igazolvány szám: %s
  Adóazonosító: %s
  E-mail: %s
  Telefon: %s

II. A SZERZŐDÉS TÁRGYA
Üzemeltető saját webshop platformján elkülönített bérlői (tenant) felületet biztosít Partner részére.

III. KÖTELEZETTSÉGEK
1. Partner kijelenti, hogy a KYC során megadott adatai valósak.
2. Partner betartja a hatályos jogszabályokat (Ptk., GDPR, Pmt. 2017. évi LIII. tv.).
3. Üzemeltető biztosítja a platformot és a partneri admin felületet.

IV. ADATKEZELÉS
A KYC Adatkezelési Tájékoztató szerint.

V. HATÁLYBALÉPÉS
Jelen szerződés mindkét fél elektronikus aláírásával lép hatályba.
A szerződés aláírás után lezárt, módosíthatatlan, SHA-256 hash-sel hitelesített.

VI. JOGVITA
Felek jogvitáikat a magyar bíróságok joghatósága alá rendelik.
$body$,
      v_contract_number, to_char(now(),'YYYY-MM-DD'), v_owner.version,
      v_owner.legal_name, v_owner.representative_name,
      coalesce(v_owner.tax_identification_number,'-'),
      v_owner.tax_number, coalesce(v_owner.eu_tax_number,'-'), v_owner.address,
      NEW.full_name, coalesce(NEW.birth_name,'-'),
      coalesce(NEW.birth_place,'-'), coalesce(NEW.birth_date::text,'-'),
      coalesce(NEW.mother_name,'-'), v_address,
      NEW.id_card_number, coalesce(NEW.tax_id,'-'),
      NEW.email, coalesce(NEW.phone,'-'));

    INSERT INTO public.partner_contracts (
      user_id, kyc_submission_id, contract_number, contract_version, contract_body,
      partner_full_name, partner_birth_name, partner_birth_place, partner_birth_date,
      partner_mother_name, partner_address, partner_id_card_number, partner_tax_id,
      partner_email, partner_phone,
      owner_name, owner_representative, owner_tax_number, owner_address,
      owner_profile_version, status
    ) VALUES (
      NEW.user_id, NEW.id, v_contract_number, 'v1.1', v_body,
      NEW.full_name, NEW.birth_name, NEW.birth_place, NEW.birth_date,
      NEW.mother_name, v_address, NEW.id_card_number, NEW.tax_id,
      NEW.email, NEW.phone,
      v_owner.legal_name, v_owner.representative_name, v_owner.tax_number, v_owner.address,
      v_owner.version, 'pending_partner_signature'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 8) Role grant only on signed
CREATE OR REPLACE FUNCTION public.grant_partner_role_on_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status <> 'signed') THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.user_id, 'partner'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.partner_contract_audit_log(contract_id, event_type, actor_id, actor_role, details)
    VALUES (NEW.id, 'partner_role_granted', auth.uid(), 'system', jsonb_build_object('user_id', NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$;

-- 9) Admin actions
CREATE OR REPLACE FUNCTION public.reject_partner_contract(_contract_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.partner_contracts
    SET status='rejected', rejection_reason=_reason
    WHERE id=_contract_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_partner_contract_correction(_contract_id uuid, _notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.partner_contracts
    SET status='needs_correction', correction_notes=_notes
    WHERE id=_contract_id;
END;
$$;

-- 10) pgcrypto for digest
CREATE EXTENSION IF NOT EXISTS pgcrypto;
