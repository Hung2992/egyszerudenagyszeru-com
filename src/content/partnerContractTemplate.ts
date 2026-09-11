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

VI. JOGVITA
Felek jogvitáikat a magyar bíróságok joghatósága alá rendelik.`;
