// Nyilvános partneri szerződéssablon (v1.4) – ugyanaz a szöveg, amelyet a
// partner_contracts generáló DB függvény a KYC jóváhagyás után aláírásra ad ki.
// A zárójelben szereplő adatok az aláíráskor töltődnek ki a konkrét adatokkal.

export const PARTNER_CONTRACT_TEMPLATE = `PARTNERI SZERŐDÉS

Szerződésszám: EDN-[ééééhhnn]-[azonosító]
Kelt: [az aláíráskor]
Cégadatok verzió: v[üzemeltetői verzió]

I. SZERZŐDŐ FELEK

Üzemeltető:
  [Az üzemeltető cég teljes neve]
  Képviselő: [üzemeltető képviselőjének neve]
  Adóazonosító jel: [üzemeltető adóazonosítója]
  Adószám: [üzemeltető adószáma]
  Közösségi adószám: [üzemeltető közösségi adószáma]
  Székhely: [üzemeltető székhelye]

Partner:
  Név: [teljes név]
  Születési név: [születési név]
  Születési hely, idő: [hely], [dátum]
  Anyja neve: [anyja neve]
  Lakcím: [lakcím]
  Személyi igazolvány szám: [személyi ig. szám]
  Adóazonosító: [adóazonosító]
  E-mail: [e-mail cím]
  Telefon: [telefonszám]

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
4. A pontos elszámolási alapot, a bevétel meghatórozását és az elszámolás időszakát jelen szerződés, valamint a teljesített és kifizetett rendelések összesített bruttó összege határozza meg.

IX. JOGVITA
Felek jogvitáikat a magyar bíróságok joghatósága alá rendelik.`;
