import LegalLayout, { LEGAL_DOCS } from "@/components/legal/LegalLayout";
import { H2, P, UL, Strong, Box } from "@/components/legal/LegalProse";

const KycAdatkezeles = () => (
  <LegalLayout slug="kyc-adatkezeles" title="KYC adatkezelési tájékoztató" subtitle="Bérlői azonosításhoz kötelezően megadott adatok" effectiveDate="2026.06.14.">
    <Box variant="warn">
      Ez a tájékoztató kizárólag a webshop-bérlő partnerekre vonatkozik, akik saját Példányt kívánnak üzemeltetni és így pénzügyi elszámolásba lépnek az Üzemeltetővel. Webshop-vásárlókra nem!
    </Box>

    <H2>1. Az adatkezelő</H2>
    <P>Egyszerű de Nagyszerű – mint Üzemeltető és webshop bérleti rendszer szolgáltatója. Kapcsolat az Impresszumban.</P>

    <H2>2. Milyen adatokat kérünk és miért</H2>
    <P>Jogalap: <Strong>szerződés teljesítése (GDPR 6. cikk (1) b)</Strong> és <Strong>jogi kötelezettség</Strong> – Pmt. 2017. évi LIII. tv. (pénzmosás megelőzése), Számv. tv.</P>
    <UL>
      <li><Strong>Személyazonosító adatok</Strong> (név, születési hely/dátum, anyja neve, állampolgárság, szem.ig. szám, lakcímkártya szám) – partner-azonosításhoz, szerződéskötéshez.</li>
      <li><Strong>Lakcím, telefon, e-mail</Strong> – kapcsolattartás, számlázás.</li>
      <li><Strong>Bankszámla adatok</Strong> – kizárólag jutalék kifizetéséhez.</li>
      <li><Strong>Adóazonosító / cégadatok</Strong> – számviteli kötelezettség.</li>
      <li><Strong>Okmányfotók</Strong> (szem.ig. elő/hátlap, lakcímkártya, selfie igazolvánnyal) – személyazonosság megerősítése, csalás megelőzése.</li>
    </UL>
    <P>A selfie biometrikus jellegű adatnak minősülhet – kizárólag emberi szemmel kerül összevetésre az okmányfotóval. <Strong>Automatikus arcfelismerést NEM végzünk.</Strong></P>

    <H2>3. Adatmegőrzési idő</H2>
    <UL>
      <li><Strong>Elutasított KYC:</Strong> 60 nap után automatikusan, visszafordíthatatlanul törölve.</li>
      <li><Strong>Jóváhagyott / aktív partner:</Strong> a szerződés időtartama alatt.</li>
      <li><Strong>Megszűnt partner:</Strong> Pmt. 56. § és Számv. tv. 169. § szerint 8 év, utána törlés.</li>
    </UL>

    <H2>4. Ki fér hozzá</H2>
    <UL>
      <li>Az adatfeltöltő partner – csak a saját beküldését látja.</li>
      <li>Az Üzemeltető <Strong>super admin</Strong>ja – kizárólag a KYC ellenőrzés céljából.</li>
      <li>Minden admin betekintést, megtekintést, letöltést, jóváhagyást és elutasítást <Strong>audit napló</Strong> rögzít (ki, mikor, esemény).</li>
      <li>Harmadik fél részére kizárólag hatósági megkeresésre.</li>
    </UL>

    <H2>5. Biztonsági intézkedések</H2>
    <UL>
      <li>Privát, titkosított tárolás Row-Level Security védelemmel.</li>
      <li>Az okmányfotók kizárólag <Strong>5 perces lejáratú aláírt linken</Strong> érhetők el az adminnak.</li>
      <li>Audit napló minden hozzáférésről.</li>
      <li>Automatikus törlés a megőrzési idő után.</li>
    </UL>

    <H2>6. Jogaid (GDPR)</H2>
    <UL>
      <li><Strong>Hozzáférés</Strong> – e-mailben kérheted minden rólad tárolt adatod másolatát.</li>
      <li><Strong>Helyesbítés, törlés, korlátozás, tiltakozás, adathordozhatóság.</Strong></li>
      <li><Strong>Hozzájárulás visszavonása</Strong> – bármikor, ez a bérleti szerződést megszünteti.</li>
      <li><Strong>Panasz:</Strong> NAIH – 1055 Budapest, Falk Miksa u. 9-11., ugyfelszolgalat@naih.hu, www.naih.hu</li>
    </UL>

    <H2>7. Adatfeldolgozók</H2>
    <UL>
      <li>Supabase (EU régió) – tárhely, adatbázis, storage.</li>
      <li>Resend / SMTP szolgáltató – értesítő e-mailek.</li>
    </UL>

    <Box variant="law">
      A KYC adatkezeléshez adott hozzájárulásod nélkül a webshop bérlés <Strong>nem indítható el</Strong> – a Pmt. és a szerződéses partnerellenőrzés ezt kötelezővé teszi.
    </Box>
  </LegalLayout>
);

export default KycAdatkezeles;
