import LegalLayout from "@/components/legal/LegalLayout";
import { LegalProse } from "@/components/legal/LegalProse";

const KycAdatkezeles = () => (
  <LegalLayout title="KYC adatkezelési tájékoztató" updatedAt="2026-06-14">
    <LegalProse>
      <h2>1. Az adatkezelő</h2>
      <p>Egyszerű de Nagyszerű – mint Üzemeltető és webshop bérleti rendszer szolgáltatója. Kapcsolat: az Impresszumban.</p>

      <h2>2. Milyen adatokat kérünk és miért</h2>
      <p>A KYC (Know Your Customer) folyamat kizárólag azokra a felhasználókra vonatkozik, akik saját webshop-példányt szeretnének bérelni, és így pénzügyi elszámolás (legalább 5% jutalék) jön létre. Jogalap: <strong>szerződés teljesítése (GDPR 6. cikk (1) b)</strong> és <strong>jogi kötelezettség</strong> (Pmt. 2017. évi LIII. tv. – pénzmosás megelőzése, számviteli tv.).</p>
      <ul>
        <li><strong>Személyazonosító adatok</strong> (név, születési hely/dátum, anyja neve, állampolgárság, szem.ig. szám, lakcímkártya szám) – partner-azonosításhoz, szerződéskötéshez.</li>
        <li><strong>Lakcím + telefon + e-mail</strong> – kapcsolattartáshoz és számlázáshoz.</li>
        <li><strong>Bankszámla adatok</strong> – jutalék kifizetéséhez.</li>
        <li><strong>Adóazonosító / cégadatok</strong> – számviteli kötelezettség teljesítéséhez.</li>
        <li><strong>Okmányfotók</strong> (szem.ig. előlap/hátlap, lakcímkártya, selfie igazolvánnyal) – személyazonosság megerősítéséhez, csalás megelőzéséhez.</li>
      </ul>
      <p>A selfie biometrikus jellegű adatnak minősülhet – kizárólag emberi szemmel kerül összevetésre az okmányfotóval, automatikus arcfelismerést NEM végzünk.</p>

      <h2>3. Meddig tároljuk</h2>
      <ul>
        <li><strong>Elutasított KYC:</strong> 60 nap után automatikusan, visszafordíthatatlanul törölve.</li>
        <li><strong>Jóváhagyott / aktív partner:</strong> a szerződés időtartama alatt + 5 év (Pmt. 56. §, Számv. tv. 169. §).</li>
        <li><strong>Megszűnt partner:</strong> a szerződés megszűnését követő 8 év (számviteli bizonylatok), utána törlés.</li>
      </ul>

      <h2>4. Ki fér hozzá</h2>
      <ul>
        <li>Az adatfeltöltő partner – csak a saját beküldését látja.</li>
        <li>Az Üzemeltető <strong>super admin</strong>ja – kizárólag a KYC ellenőrzés céljából.</li>
        <li>Minden adminisztrátori betekintést, jóváhagyást, elutasítást és letöltést <strong>audit napló</strong> rögzít (ki, mikor, IP).</li>
        <li>Harmadik fél részére csak hatósági megkeresésre, jogi kötelezettség alapján.</li>
      </ul>

      <h2>5. Biztonság</h2>
      <ul>
        <li>Privát, titkosított tárolás (Supabase Storage, RLS-szel védve).</li>
        <li>Az okmányfotók kizárólag rövid lejáratú (5 perc) aláírt linken keresztül érhetők el az adminnak.</li>
        <li>Sorba állított és rendszeres biztonsági ellenőrzés (RLS, security definer policy).</li>
      </ul>

      <h2>6. Jogaid</h2>
      <ul>
        <li><strong>Hozzáférés</strong> – e-mailben kérheted minden rólad tárolt adatod másolatát.</li>
        <li><strong>Helyesbítés</strong> – hibás adatot bármikor javíthatsz vagy javíttathatsz.</li>
        <li><strong>Törlés</strong> – ha nem kötöttünk szerződést, azonnal; szerződés után csak a jogi kötelező megőrzés lejártakor.</li>
        <li><strong>Korlátozás, tiltakozás, adathordozhatóság.</strong></li>
        <li><strong>Panasz:</strong> NAIH (1055 Budapest, Falk Miksa u. 9-11., ugyfelszolgalat@naih.hu).</li>
      </ul>

      <h2>7. Hozzájárulás visszavonása</h2>
      <p>A KYC adatkezeléshez adott hozzájárulást bármikor visszavonhatod – ez a folyamatban lévő bérleti szerződést azonnal megszünteti, és a megőrzési idő után minden adatot törlünk.</p>

      <h2>8. Adatfeldolgozók</h2>
      <ul>
        <li>Supabase (EU régió) – tárhely, adatbázis, storage.</li>
        <li>Resend / SMTP – értesítő e-mailek.</li>
      </ul>
    </LegalProse>
  </LegalLayout>
);

export default KycAdatkezeles;
