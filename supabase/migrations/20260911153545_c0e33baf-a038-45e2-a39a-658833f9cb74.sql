CREATE OR REPLACE FUNCTION public.generate_partner_contract_on_kyc_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
Üzemeltető saját, zárt forráskódú, több-bérlős (multi-tenant) APEX üzleti szoftverplatformján elkülönített bérlői (tenant) felületet biztosít Partner részére. A platform egyetlen rendszerben egyesíti a weboldal-, webshop-, ügyfél- (CRM), naptár-, marketing-, kommunikációs-, pénzügyi-, logisztikai- és mesterséges intelligencia-modulokat, amelyek elérhetők asztali és mobil eszközön egyaránt.

III. A BIZTOSÍTOTT SZOFTVERÖSSZETEVŐK
A Partner a szerződés hatálya alatt az alábbi, Üzemeltető által üzemeltetett funkciókhoz és modulokhoz kap hozzáférést, korlátozás nélkül:
  1. Weboldal- és márkaoldal-motor: saját domain, landing oldalak, blog, SEO metaadatok, mobilos megjelenés, verziókezelés és egykattintásos visszaállítás.
  2. Webshop és termékkezelés: fizikai, digitális, oktatási/kurzus és szolgáltatás típusú termékek; variánsok, méretek, színek, készlet, licenc-kulcsok, letöltések, árazási szabályok és kosárelhagyás kezelés.
  3. Ügyfélkapcsolat-kezelés (CRM): érdeklődők, vásárlók, foglalások, előzmények, címkék, csoportok és napi teendők.
  4. Naptár és online foglalás: szolgáltatásidőpontok, szabad idősávok, automatikus visszaigazolás, emlékeztetők és napi ügyféllista.
  5. Marketing- és kampányközpont: segmentált kampányok, hírlevelek, QR-kódok, UTM-linkek, A/B tesztelés, automatikus tölcsérek és közösségi poszt-javaslatok.
  6. AI munkatársak: szöveg, kép, videó, kód, termékleírás, SEO tartalom, hirdetésszöveg és teljes oldalak/webshopok generálása.
  7. APEX kommunikációs platform: e-mail, SMS, WhatsApp, hanghívás, AI hang, CPaaS motor DLR-ekkel, opt-outtal, routinggal, retry-jel és szállítási központtal.
  8. Vezetői és pénzügyi központ: rendelések, bevétel, jutalék, KPI, audit napló, partner kifizetések és visszatérítések.
  9. Biztonság és tenant isolation: row-level security (RLS), szerepkör-alapú hozzáférés, változás-nyomon követés és egykattintásos rollback.

IV. MIÉRT ÉRI MEG A PARTNERNEK
A Platform célja, hogy a Partnernek ne kelljen külön weboldalkészítőt, webshopmotort, CRM-et, naptáralkalmazást, levelező rendszert, analitikai eszközt vagy AI szolgáltatást vásárolnia és összekötnie. Egy előfizetési díj helyett a Partner csak a saját, teljesített és kifizetett bruttó bevétel után fizet sikerdíj-jellegű részesedést, így induláskor alacsony kockázattal, nagyobb forgalom esetén pedig kiszámíthatóan osztozik az eredményen. Az Üzemeltető folyamatosan frissíti, karbantartja és biztonságosan üzemelteti a Platformot; a Partner saját domainen, saját márkával jelenhet meg anélkül, hogy fejlesztői vagy infrastrukturális költségeket viselne.

V. KÖTELEZETTSÉGEK
1. Partner kijelenti, hogy a KYC során megadott adatai valósak.
2. Partner betartja a hatályos jogszabályokat (Ptk., GDPR, Pmt. 2017. évi LIII. tv.).
3. Üzemeltető biztosítja a platformot és a partneri admin felületet.

VI. ADATKEZELÉS
A KYC Adatkezelési Tájékoztató szerint.

VII. HATÁLYBALÉPÉS
Jelen szerződés mindkét fél elektronikus aláírásával lép hatályba.
A szerződés aláírás után lezárt, módosíthatatlan, SHA-256 hash-sel hitelesített.

VIII. PARTNERI RÉSZESDÉS ÉS ELSZÁMOLÁS
1. A Partner az együttműködés keretében a biztosított eszközöket, rendszert és szolgáltatásokat használhatja. Az ellenérték a Partner által elért, teljesített és kifizetett bruttó bevétel alapján, részesedési rendszerben kerül meghatározásra:
   • 1 000 000 Ft bevételig: a bevétel 5%-a;
   • 1 000 000 Ft feletti bevételnél: minden további megkezdett 1 000 000 Ft bevétel után 10 000 Ft részesedés.
2. A részesedést az Üzemeltető jogosult a Partner részére fizetendő kifizetésből levonni, illetve külön számlázni az elszámolási időszak lezárultával.
3. A rendszer célja, hogy a Partner induláskor alacsonyabb forgalom mellett is fenntartható feltételekkel vehessen részt az együttműködésben, nagyobb forgalom esetén pedig a díj arányosan kiszámítható maradjon.
4. A pontos elszámolási alapot, a bevétel meghatározását és az elszámolás időszakát jelen szerződés, valamint a teljesített és kifizetett rendelések összesített bruttó összege határozza meg.

IX. JOGVITA
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
      NEW.user_id, NEW.id, v_contract_number, 'v1.4', v_body,
      NEW.full_name, NEW.birth_name, NEW.birth_place, NEW.birth_date,
      NEW.mother_name, v_address, NEW.id_card_number, NEW.tax_id,
      NEW.email, NEW.phone,
      v_owner.legal_name, v_owner.representative_name, v_owner.tax_number, v_owner.address,
      v_owner.version, 'pending_partner_signature'
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_partner_contract_on_kyc_approval() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_partner_contract_on_kyc_approval() TO authenticated, service_role;