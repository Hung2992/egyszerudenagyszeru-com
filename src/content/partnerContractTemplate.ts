// Nyilvános partneri szerződéssablon (v1.1) – ugyanaz a szöveg, amelyet a
// partner_contracts generáló DB függvény a KYC jóváhagyás után aláírásra ad ki.
// A zárójelben szereplő adatok az aláíráskor töltődnek ki a konkrét adatokkal.

export const PARTNER_CONTRACT_TEMPLATE = `PARTNERI SZERZŐDÉS

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

VI. BÉRLETI DÍJ ÉS ELSZÁMOLÁS
1. A Partner a platform bérleti díját a saját webshopján / márkaoldalán keletkező teljesített és kifizetett bruttó bevétel után fizeti az Üzemeltetőnek az alábbi sávos díjszabás szerint:
   • 0 Ft-tól 1 000 000 Ft-ig: a bevétel 5%-a;
   • 1 000 000 Ft-tól 5 000 000 Ft-ig: fix 10 000 Ft;
   • 5 000 000 Ft felett: fix 50 000 Ft;
   • 5 000 000 Ft fölött minden megkezdett további 1 000 000 Ft bevétel után további 10 000 Ft.
2. A bérleti díjat az Üzemeltető jogosult a Partner részére fizetendő kifizetésből levonni, illetve külön számlázni az elszámolási időszak lezárultával.
3. Az elszámolás alapja a teljesített és kifizetett rendelések, valamint a Partner által a platformon keresztül lebonyolított, bevételt eredményező tranzakciók összesített bruttó összege.

VII. JOGVITA
Felek jogvitáikat a magyar bíróságok joghatósága alá rendelik.`;
