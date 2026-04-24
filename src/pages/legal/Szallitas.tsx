import LegalLayout from "@/components/legal/LegalLayout";
import { H2, P, UL, Strong, Box } from "@/components/legal/LegalProse";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const Szallitas = () => (
  <LegalLayout
    slug="szallitas"
    title="Szállítási és fizetési feltételek"
    subtitle="Részletes információk a kiszállításról, díjakról és határidőkről."
    effectiveDate={L.effectiveDate}
  >
    <H2>1. Szállítási módok</H2>
    <UL>
      <li><Strong>GLS házhozszállítás</Strong> — 1–3 munkanap</li>
      <li><Strong>Foxpost csomagautomata</Strong> — 1–2 munkanap</li>
      <li><Strong>MPL futár</Strong> — 2–4 munkanap</li>
      <li><Strong>Személyes átvétel</Strong> — előzetes egyeztetéssel</li>
    </UL>

    <H2>2. Szállítási díjak</H2>
    <P>
      A pontos díj a kosár alapján a megrendelés véglegesítése előtt jelenik meg. Tájékoztató jelleggel:
    </P>
    <UL>
      <li>Csomagautomata: 990–1490 Ft</li>
      <li>Házhoz: 1490–2290 Ft</li>
      <li><Strong>Ingyenes szállítás</Strong> meghatározott összeg felett (a kosárban jelezzük)</li>
    </UL>

    <H2>3. Teljesítési határidő</H2>
    <P>
      A megrendelés visszaigazolásától számított <Strong>2–10 munkanap</Strong>, raktárkészlet függvényében.
      <Strong> Előrendelhető</Strong> termék esetén a termékadatlapon megadott várható szállítási idő érvényes.
      A Ptk. 6:220. § alapján legkésőbb <Strong>30 napon belül</Strong> teljesítünk.
    </P>

    <H2>4. Fizetési módok</H2>
    <UL>
      <li><Strong>Online bankkártya</Strong> — Stripe (Visa, Mastercard, Maestro, AMEX)</li>
      <li><Strong>Banki átutalás</Strong> — a visszaigazolásban szereplő számlaszámra</li>
      <li><Strong>Utánvét</Strong> — futárnál (ahol elérhető, +500 Ft kezelési díj lehet)</li>
    </UL>

    <H2>5. Külföldi szállítás</H2>
    <P>
      Jelenleg elsősorban Magyarország területére szállítunk. EU-n belüli szállítást egyedi egyeztetéssel
      vállalunk — kérdéseiddel fordulj a {L.email} címhez.
    </P>

    <H2>6. Át nem vett csomag</H2>
    <Box variant="warn">
      A futárszolgálat által vissza küldött, át nem vett csomag esetén az ismételt feladás költségét
      felszámítjuk. Ismételt át nem vétel esetén fenntartjuk a jogot, hogy a vételárból a felmerült szállítási
      és kezelési költséget levonjuk.
    </Box>

    <H2>7. Kárveszély, sérült csomag</H2>
    <P>
      A kárveszély a termék Fogyasztó (vagy az általa kijelölt személy) általi átvételével száll át (Ptk.
      6:219. §). <Strong>Sérült csomag</Strong> esetén kérjük, a futár jelenlétében nyiss kárfelvételi
      jegyzőkönyvet, és haladéktalanul jelezz a {L.email} címen.
    </P>

    <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
      Verzió: {L.version} — Hatályos: {L.effectiveDate}
    </p>
  </LegalLayout>
);

export default Szallitas;
