import LegalLayout from "@/components/legal/LegalLayout";
import { H2, H3, P, UL, Strong, Box } from "@/components/legal/LegalProse";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const CookiePolicy = () => (
  <LegalLayout
    slug="cookie"
    title="Süti (Cookie) Szabályzat"
    subtitle="Hogyan használunk sütiket és hasonló technológiákat a webáruházban."
    effectiveDate={L.effectiveDate}
  >
    <Box variant="info">
      A süti egy kis szöveges fájl, amit a böngésződ tárol. Segít, hogy az oldal működjön (pl. kosár), és hogy
      megérthessük, hogyan használod — kizárólag a te beleegyezéseddel, ahol az szükséges.
    </Box>

    <H2 id="1">1. Mi az a süti (cookie)?</H2>
    <P>
      A sütik kis adatcsomagok, amelyeket a webhely a böngésződbe tölt. Lehetnek <Strong>állandó</Strong>
      (lejárati ideig tárolódnak) vagy <Strong>munkamenet-sütik</Strong> (a böngésző bezárásával törlődnek),
      illetve <Strong>elsődleges</Strong> (általunk telepített) vagy <Strong>harmadik féltől származók</Strong>.
    </P>

    <H2 id="2">2. Milyen sütiket használunk?</H2>

    <H3>2.1. Feltétlenül szükséges (működés)</H3>
    <P>
      <Strong>Hozzájárulás nem szükséges</Strong> — az elektronikus hírközlési ágazatban az adatvédelemről
      szóló 2002/58/EK irányelv (e-Privacy) 5. cikk (3) bek. szerint.
    </P>
    <UL>
      <li><Strong>session</Strong> — bejelentkezési munkamenet (sb-...-auth-token)</li>
      <li><Strong>cart</Strong> — kosártartalom megőrzése</li>
      <li><Strong>cookie_consent</Strong> — a cookie-beállításaid mentése</li>
    </UL>

    <H3>2.2. Funkcionális (preferenciák)</H3>
    <P><Strong>Hozzájárulás szükséges.</Strong></P>
    <UL>
      <li>Méret-preferenciák, nyelv, megjelenítési beállítások</li>
      <li>Wishlist tartalom (vendég felhasználóknál)</li>
    </UL>

    <H3>2.3. Analitikai (statisztika)</H3>
    <P><Strong>Hozzájárulás szükséges.</Strong> Anonimizált formában mérjük a látogatottságot.</P>
    <UL>
      <li>Saját page_views tábla (oldalmegtekintések, eszköztípus)</li>
      <li>Visitor ID (anonim, nem köthető személyhez)</li>
    </UL>

    <H3>2.4. Marketing</H3>
    <P><Strong>Hozzájárulás szükséges.</Strong> Jelenleg <Strong>nem</Strong> használunk hirdetési sütiket.</P>

    <H2 id="3">3. Harmadik féltől származó sütik</H2>
    <UL>
      <li><Strong>Stripe</Strong> — fizetés biztonsága, csalás-megelőzés (csak a fizetési oldalon)</li>
      <li><Strong>Lovable Cloud (Supabase)</Strong> — autentikáció és működés</li>
    </UL>

    <H2 id="4">4. Hogyan kezeled a sütiket?</H2>
    <P>
      Az oldalra érkezéskor megjelenik a <Strong>cookie sáv</Strong>, ahol választhatsz:
    </P>
    <UL>
      <li><Strong>Mindent elfogadok</Strong> — minden kategória engedélyezve</li>
      <li><Strong>Csak szükséges</Strong> — kizárólag a működéshez kötelezőek</li>
      <li><Strong>Testreszab</Strong> — kategóriánként választhatsz</li>
    </UL>
    <P>
      A beállításaidat <Strong>bármikor módosíthatod</Strong> az oldal alján található „Cookie beállítások"
      linkre kattintva, vagy a böngésződ beállításaiban (Chrome, Firefox, Safari, Edge stb.) törölheted a
      sütiket.
    </P>

    <H2 id="5">5. Jogi háttér</H2>
    <UL>
      <li>(EU) 2016/679 rendelet (GDPR)</li>
      <li>2002/58/EK irányelv (e-Privacy)</li>
      <li>2003. évi C. törvény az elektronikus hírközlésről</li>
      <li>NAIH iránymutatás a sütik használatáról (2020)</li>
    </UL>

    <H2 id="6">6. Kapcsolat</H2>
    <P>
      Cookie-kkal kapcsolatos kérdéseiddel fordulj hozzánk: {L.privacyEmail}
    </P>

    <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
      Verzió: {L.version} — Hatályos: {L.effectiveDate}
    </p>
  </LegalLayout>
);

export default CookiePolicy;
