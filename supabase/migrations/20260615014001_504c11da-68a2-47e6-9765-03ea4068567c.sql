
-- Partner contracts table: generated after KYC approval, signed by partner + owner, then role granted
CREATE TABLE public.partner_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kyc_submission_id uuid NOT NULL REFERENCES public.tenant_kyc_submissions(id) ON DELETE CASCADE,
  contract_number text NOT NULL UNIQUE,
  contract_version text NOT NULL DEFAULT 'v1.0',
  contract_body text NOT NULL,
  partner_full_name text NOT NULL,
  partner_birth_name text,
  partner_birth_place text,
  partner_birth_date date,
  partner_mother_name text,
  partner_address text NOT NULL,
  partner_id_card_number text NOT NULL,
  partner_tax_id text,
  partner_email text NOT NULL,
  partner_phone text,
  owner_name text NOT NULL DEFAULT 'Egyszerű de Nagyszerű Kft.',
  owner_representative text NOT NULL DEFAULT 'Ügyvezető',
  owner_tax_number text,
  owner_address text,
  status text NOT NULL DEFAULT 'awaiting_partner_signature',
    -- awaiting_partner_signature → awaiting_owner_signature → signed → terminated
  partner_signed_at timestamptz,
  partner_signature_name text,
  partner_signature_ip text,
  owner_signed_at timestamptz,
  owner_signed_by uuid,
  owner_signature_name text,
  owner_signature_ip text,
  effective_from date,
  terminated_at timestamptz,
  termination_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.partner_contracts TO authenticated;
GRANT ALL ON public.partner_contracts TO service_role;

ALTER TABLE public.partner_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner can view own contract"
  ON public.partner_contracts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partner can sign own contract"
  ON public.partner_contracts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage contracts"
  ON public.partner_contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_partner_contracts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_partner_contracts_touch
  BEFORE UPDATE ON public.partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.touch_partner_contracts();

-- Auto-generate contract when KYC is approved
CREATE OR REPLACE FUNCTION public.generate_partner_contract_on_kyc_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_contract_number text;
  v_address text;
  v_body text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    -- skip if already exists
    IF EXISTS (SELECT 1 FROM public.partner_contracts WHERE kyc_submission_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    v_contract_number := 'EDN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(NEW.id::text,'-',''),1,6));
    v_address := concat_ws(', ',
      concat_ws(' ', NEW.address_zip, NEW.address_city),
      NEW.address_street,
      NEW.address_country);

    v_body := format($body$BÉRLETI ÉS PARTNERI SZERZŐDÉS

Szerződésszám: %s
Kelt: %s

I. SZERZŐDŐ FELEK

Bérbeadó / Üzemeltető:
  Egyszerű de Nagyszerű Kft.
  (a továbbiakban: "Üzemeltető")

Bérlő / Partner:
  Név: %s
  Születési név: %s
  Születési hely, idő: %s, %s
  Anyja neve: %s
  Lakcím: %s
  Személyi igazolvány szám: %s
  Adóazonosító jel: %s
  E-mail: %s
  Telefon: %s

II. A SZERZŐDÉS TÁRGYA

Felek megállapodnak, hogy az Üzemeltető a saját webshop platformján egy
elkülönített bérlői (tenant) példányt biztosít a Partner részére, amelyen
keresztül a Partner saját termékeit forgalmazhatja az Üzemeltető által
meghatározott feltételek szerint.

III. KÖTELEZETTSÉGEK

1. A Partner a jelen szerződés aláírásával elismeri, hogy a megadott
   személyes adatai (KYC) valósak és ellenőrizhetők.
2. A Partner kötelezi magát a hatályos jogszabályok (Ptk., GDPR, Pmt.
   2017. évi LIII. törvény) betartására.
3. Az Üzemeltető vállalja a platform üzemeltetését, technikai
   támogatást és a partneri adminisztrációs felület biztosítását.

IV. ADATKEZELÉS

A Partner személyes adatainak kezelése a külön KYC Adatkezelési
Tájékoztatóban foglaltak szerint történik. A Partner kifejezetten
hozzájárul ahhoz, hogy a jelen szerződésben rögzített adatok jogi
és számviteli célból megőrzésre kerüljenek.

V. SZERZŐDÉS HATÁLYBA LÉPÉSE

A szerződés mindkét fél elektronikus aláírásával lép hatályba.
A Partner adminisztrációs hozzáférést az Üzemeltető általi
ellenjegyzés után automatikusan megkapja.

VI. FELMONDÁS

Bármelyik fél a szerződést 30 napos határidővel, indokolás nélkül,
írásban felmondhatja.

VII. EGYÉB

Jelen szerződésre a magyar jog az irányadó. A felek a vitás
kérdéseket elsősorban tárgyalás útján rendezik.

---
Aláírások következnek elektronikus aláírás formájában.$body$,
      v_contract_number,
      to_char(now(),'YYYY-MM-DD'),
      coalesce(NEW.full_name,''),
      coalesce(NEW.birth_name,''),
      coalesce(NEW.birth_place,''),
      coalesce(to_char(NEW.birth_date,'YYYY-MM-DD'),''),
      coalesce(NEW.mother_name,''),
      coalesce(v_address,''),
      coalesce(NEW.id_card_number,''),
      coalesce(NEW.tax_id,''),
      coalesce(NEW.email,''),
      coalesce(NEW.phone,'')
    );

    INSERT INTO public.partner_contracts (
      user_id, kyc_submission_id, contract_number, contract_body,
      partner_full_name, partner_birth_name, partner_birth_place,
      partner_birth_date, partner_mother_name, partner_address,
      partner_id_card_number, partner_tax_id, partner_email, partner_phone
    ) VALUES (
      NEW.user_id, NEW.id, v_contract_number, v_body,
      NEW.full_name, NEW.birth_name, NEW.birth_place,
      NEW.birth_date, NEW.mother_name, v_address,
      NEW.id_card_number, NEW.tax_id, NEW.email, NEW.phone
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_kyc_generate_contract
  AFTER UPDATE ON public.tenant_kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.generate_partner_contract_on_kyc_approval();

-- Grant partner role when both signatures present
CREATE OR REPLACE FUNCTION public.grant_partner_role_on_signed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status <> 'signed') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'partner'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_contract_grant_role
  AFTER UPDATE ON public.partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.grant_partner_role_on_signed();

-- Auto-move to signed when both signatures present
CREATE OR REPLACE FUNCTION public.update_contract_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.partner_signed_at IS NOT NULL AND NEW.owner_signed_at IS NOT NULL THEN
    NEW.status := 'signed';
    IF NEW.effective_from IS NULL THEN
      NEW.effective_from := current_date;
    END IF;
  ELSIF NEW.partner_signed_at IS NOT NULL AND NEW.owner_signed_at IS NULL THEN
    NEW.status := 'awaiting_owner_signature';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_contract_status
  BEFORE UPDATE ON public.partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_contract_status();
