import LegalLayout from "@/components/legal/LegalLayout";
import { H2, H3, P, UL, OL, Strong, Box } from "@/components/legal/LegalProse";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const Garancia = () => (
  <LegalLayout
    slug="garancia"
    title="Szavatosság, jótállás, panaszkezelés"
    subtitle="Ptk., 19/2014. (IV. 29.) NGM rendelet és 151/2003. (IX. 22.) Korm. rendelet alapján."
    effectiveDate={L.effectiveDate}
  >
    <H2 id="1">1. Kellékszavatosság</H2>
    <P>
      A Ptk. 6:159–6:167. §§ alapján hibás teljesítés esetén kellékszavatossági igényt érvényesíthetsz velünk
      szemben.
    </P>
    <H3>Mit kérhetsz?</H3>
    <UL>
      <li><Strong>Kijavítás vagy kicserélés</Strong> (elsődlegesen)</li>
      <li><Strong>Árleszállítás</Strong>, ha a kijavítás/csere lehetetlen vagy aránytalan</li>
      <li><Strong>Elállás</Strong> (a vételár visszafizetése), ha más igény nem teljesíthető</li>
    </UL>
    <H3>Határidő</H3>
    <P>
      Az igényt a hiba felfedezésétől számított <Strong>2 hónapon belül</Strong> köteles vagy közölni — de
      legkésőbb <Strong>2 éven belül</Strong> a teljesítéstől. Az első <Strong>1 évben</Strong> nem kell
      bizonyítanod, hogy a hiba a teljesítéskor megvolt — vélelmezzük (Ptk. 6:158. §).
    </P>

    <H2 id="2">2. Termékszavatosság</H2>
    <P>
      Ingó dolog hibája esetén a gyártóval szemben is felléphetsz termékszavatossággal (Ptk. 6:168–6:170. §§).
      Igény: <Strong>kijavítás vagy kicserélés</Strong>. Határidő: a forgalomba hozataltól <Strong>2 év</Strong>.
    </P>

    <H2 id="3">3. Jótállás (garancia)</H2>
    <P>
      A 151/2003. (IX. 22.) Korm. rendelet alapján bizonyos tartós fogyasztási cikkekre (pl. 10.000 Ft feletti)
      <Strong> kötelező jótállás</Strong> vonatkozik:
    </P>
    <UL>
      <li>10.000 – 100.000 Ft: <Strong>1 év</Strong></li>
      <li>100.000 – 250.000 Ft: <Strong>2 év</Strong></li>
      <li>250.000 Ft felett: <Strong>3 év</Strong></li>
    </UL>
    <P>
      Általános ruházati cikkek többségére kötelező jótállás <Strong>nem vonatkozik</Strong>; ezekre a
      kellékszavatosság szabályai érvényesek. Ha bizonyos termékre önként vállalt jótállást nyújtunk, azt
      külön feltüntetjük.
    </P>

    <H2 id="4">4. Hogyan jelentsd be?</H2>
    <OL>
      <li>Küldj e-mailt {L.email} címre a megrendelés azonosítóval, hibaleírással és fotóval.</li>
      <li>Küldd vissza a terméket az általunk megadott címre (a kapcsolódó költségek a 19/2014. NGM rendelet szerint kerülnek elszámolásra).</li>
      <li>Bejelentésedet <Strong>15 munkanapon belül</Strong> kivizsgáljuk és érdemben válaszolunk.</li>
    </OL>

    <H2 id="5">5. Panaszkezelés</H2>
    <P>
      A 1997. évi CLV. tv. 17/A. § alapján:
    </P>
    <UL>
      <li>Szóbeli panaszt azonnal kivizsgálunk, lehetőség szerint orvosolunk.</li>
      <li>Írásbeli panaszt <Strong>30 napon belül</Strong> érdemben megválaszolunk, és tájékoztatást nyújtunk
        a jogorvoslati lehetőségekről.</li>
      <li>Panaszról jegyzőkönyvet veszünk fel; másolatát megküldjük.</li>
    </UL>

    <H2 id="6">6. Vitarendezés</H2>
    <Box variant="info">
      <Strong>Békéltető testület</Strong> (ingyenes, gyors, peren kívüli):<br />
      {L.arbitrationBoard}, {L.arbitrationAddress}<br />
      E-mail: {L.arbitrationEmail}<br /><br />
      Cégünk a békéltető testületi eljárásban köteles együttműködni (Fgytv. 29. § (11)).
    </Box>

    <Box variant="info">
      <Strong>EU online vitarendezési platform (ODR):</Strong>{" "}
      <a className="text-accent underline" href="https://ec.europa.eu/odr" target="_blank" rel="noopener noreferrer">
        ec.europa.eu/odr
      </a>
    </Box>

    <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
      Verzió: {L.version} — Hatályos: {L.effectiveDate}
    </p>
  </LegalLayout>
);

export default Garancia;
