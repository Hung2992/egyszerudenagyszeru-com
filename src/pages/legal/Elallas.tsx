import LegalLayout from "@/components/legal/LegalLayout";
import { H2, H3, P, UL, OL, Strong, Box } from "@/components/legal/LegalProse";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const Elallas = () => (
  <LegalLayout
    slug="elallas"
    title="Elállási / felmondási jog"
    subtitle="A 45/2014. (II. 26.) Korm. rendelet alapján a Fogyasztót megillető 14 napos elállási jog részletes szabályai."
    effectiveDate={L.effectiveDate}
  >
    <Box variant="info">
      <Strong>14 nap, indokolás nélkül.</Strong> A Fogyasztónak joga van a szerződéstől 14 napon belül
      indokolás nélkül elállni. Ez a jog kötelező és nem korlátozható.
    </Box>

    <H2 id="1">1. Kit illet meg?</H2>
    <P>
      Az elállási jog kizárólag a <Strong>Fogyasztót</Strong> (Ptk. 8:1. § (1) bek. 3.) illeti meg. Vállalkozást
      ezen jog <Strong>nem</Strong> illeti meg.
    </P>

    <H2 id="2">2. Az elállási határidő</H2>
    <P>A 14 napos határidő:</P>
    <UL>
      <li>termék adásvételekor a termék <Strong>átvételének napjától</Strong></li>
      <li>több termék egy megrendelésben, külön szállítva: az utolsó termék átvételétől</li>
      <li>több részből álló termék: az utolsó rész átvételétől</li>
      <li>időszakos szállítás: az első szállítás napjától</li>
    </UL>
    <P>
      A határidőt megtartottnak tekintjük, ha a 14 napos időszak <Strong>utolsó napján</Strong> elküldöd az
      elállási nyilatkozatot.
    </P>

    <H2 id="3">3. Hogyan állhatsz el?</H2>
    <OL>
      <li>
        Küldj egyértelmű nyilatkozatot az alábbi címre: <Strong>{L.email}</Strong> vagy postán:{" "}
        <Strong>{L.mailingAddress}</Strong>
      </li>
      <li>Használhatod az alábbi nyilatkozatmintát is, de bármilyen egyértelmű forma elfogadható.</li>
      <li>
        Küldd vissza a terméket — <Strong>az elállástól számított 14 napon belül</Strong> — az alábbi címre:
        {" "}<Strong>{L.mailingAddress}</Strong>
      </li>
    </OL>

    <Box variant="law">
      <Strong>Elállási nyilatkozatminta</Strong>
      <p className="mt-3 text-sm leading-relaxed">
        Címzett: {L.ownerName}, {L.mailingAddress}, e-mail: {L.email}<br /><br />
        Alulírott / -ak kijelentem / kijelentjük, hogy gyakorlom / gyakoroljuk elállási / felmondási jogomat /
        jogunkat az alábbi termék(ek) adásvételére vagy az alábbi szolgáltatás nyújtására irányuló szerződés
        tekintetében:<br /><br />
        Szerződéskötés időpontja / átvétel időpontja: __________<br />
        A fogyasztó(k) neve: __________<br />
        A fogyasztó(k) címe: __________<br />
        A fogyasztó(k) aláírása (csak papíron tett nyilatkozat esetén): __________<br />
        Kelt: __________
      </p>
    </Box>

    <H2 id="4">4. A visszatérítés</H2>
    <P>
      Az elállás kézhezvételétől számított <Strong>14 napon belül</Strong> visszatérítjük a teljes vételárat
      és az eredeti szállítási költséget (a legolcsóbb szokványos szállítási mód díját).
    </P>
    <P>
      <Strong>Visszatartási jog:</Strong> A visszatérítést mindaddig visszatarthatjuk, amíg a terméket vissza
      nem kaptuk, vagy amíg igazolod, hogy visszaküldted (a kettő közül a korábbi időpontig).
    </P>
    <P>
      A visszatérítés módja megegyezik az eredeti fizetés módjával — kivéve, ha kifejezetten más módba
      egyezel bele.
    </P>

    <H2 id="5">5. Kinek a költsége a visszaküldés?</H2>
    <P>
      A termék visszaküldésének <Strong>közvetlen költsége a Fogyasztót terheli</Strong>. (Kivéve, ha azt
      kifejezetten átvállaljuk.)
    </P>

    <H2 id="6">6. Felelősség a termék állapotáért</H2>
    <P>
      A Fogyasztó kizárólag akkor felelős a termék értékcsökkenéséért, ha az a termék jellegének,
      tulajdonságainak megállapításához szükséges használatot meghaladó használat miatt következett be.
    </P>

    <H2 id="7">7. Mikor NEM gyakorolható az elállási jog?</H2>
    <P>A 45/2014. Korm. rendelet 29. § (1) bek. szerint többek között:</P>
    <UL>
      <li>romlandó vagy minőségét rövid ideig megőrző termék</li>
      <li>egyedi igények szerint, a Fogyasztó utasítása alapján készített, személyre szabott termék</li>
      <li>olyan zárt csomagolású termék, amely egészségvédelmi vagy higiéniai okokból az átadást követő
        felbontás után <Strong>nem küldhető vissza</Strong> (pl. fehérnemű, fürdőruha — kizárólag bontatlan
        állapotban küldhető vissza)</li>
      <li>lezárt csomagolású hang-, képfelvétel, számítógépes szoftver, ha azt felbontottad</li>
    </UL>

    <H3>7.1. Ruházati cikkek (a mi esetünkben)</H3>
    <P>
      Általános ruházat (póló, pulóver, nadrág, kabát stb.) elállási joga <Strong>fennáll</Strong>, ha az
      eredeti címkével, sértetlen csomagolásban, viseletlenül érkezik vissza. Az értékcsökkenésért való
      felelősség (6. pont) érvényes.
    </P>

    <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
      Verzió: {L.version} — Hatályos: {L.effectiveDate}
    </p>
  </LegalLayout>
);

export default Elallas;
