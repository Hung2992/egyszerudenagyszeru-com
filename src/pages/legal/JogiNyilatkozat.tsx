import LegalLayout from "@/components/legal/LegalLayout";
import { H2, P, UL, Strong, Box } from "@/components/legal/LegalProse";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const JogiNyilatkozat = () => (
  <LegalLayout
    slug="jogi-nyilatkozat"
    title="Jogi nyilatkozat"
    subtitle="Felelősségkorlátozás, szellemi tulajdon, harmadik felek tartalmai."
    effectiveDate={L.effectiveDate}
  >
    <H2>1. Szellemi tulajdon</H2>
    <P>
      A {L.website} oldal tartalma — beleértve a logókat, szövegeket, fotókat, grafikákat, videókat,
      forráskódot, design elemeket — a Szolgáltató, illetve partnerei <Strong>kizárólagos szellemi tulajdona</Strong>,
      és a szerzői jogról szóló 1999. évi LXXVI. törvény, valamint a vonatkozó EU szerzői jogi irányelvek
      védelme alatt állnak.
    </P>
    <P>
      A tartalom bármilyen másolása, többszörözése, terjesztése, módosítása, nyilvános bemutatása vagy
      kereskedelmi célú felhasználása <Strong>kizárólag előzetes írásbeli engedéllyel</Strong> megengedett.
      Magáncélú, nem kereskedelmi felhasználás megengedett a forrás megjelölésével.
    </P>

    <H2>2. Védjegyek</H2>
    <P>
      A „{L.brandName}" név, valamint a kapcsolódó logók a Szolgáltató védjegyei. A harmadik felek védjegyei
      jogos tulajdonosaikat illetik.
    </P>

    <H2>3. Felelősségkorlátozás</H2>
    <Box variant="warn">
      A Szolgáltató a hatályos jogszabályok keretei között — a fogyasztói jogokat, a kötelező szavatossági és
      jótállási szabályokat nem érintve — kizárja a felelősségét minden olyan közvetett, következményi vagy
      előre nem látható kárért, amely a webáruház használatából, használhatatlanságából, üzemszünetéből,
      esetleges hibáiból vagy harmadik fél tartalmaiból ered.
    </Box>
    <P>
      A Szolgáltató maximum a vásárló által ténylegesen megfizetett vételár erejéig vállal felelősséget.
    </P>

    <H2>4. Külső linkek</H2>
    <P>
      A weboldal harmadik felek oldalaira mutató linkeket tartalmazhat. Ezek tartalmáért a Szolgáltató
      <Strong> nem vállal felelősséget</Strong>; a linkek követése a látogató saját felelősségére történik.
    </P>

    <H2>5. Termékfotók, leírások</H2>
    <P>
      Törekszünk a pontos és naprakész információkra. Az illusztrációk, a termékek színe a tényleges
      darabtól <Strong>kismértékben eltérhet</Strong> a megjelenítő eszköz beállításai miatt — ez nem minősül
      hibás teljesítésnek. Esetleges elírásokért, technikai hibákért utólag bocsánatot kérünk; ilyenkor a
      megrendelés módosítása vagy törlése — a Vásárlóval egyeztetve — lehetséges.
    </P>

    <H2>6. Vis maior</H2>
    <P>
      A Szolgáltató mentesül a teljesítési kötelezettsége alól a vis maior eseményekből (pl. természeti
      katasztrófa, járvány, hatósági intézkedés, áramkimaradás, internetkimaradás, sztrájk, háború) eredő
      késedelem vagy meghiúsulás esetén — a Vásárlót haladéktalanul értesíti, és felajánlja a megrendelés
      törlésének lehetőségét.
    </P>

    <H2>7. Alkalmazandó jog</H2>
    <P>
      A jelen jogi nyilatkozatra és a webáruház használatára <Strong>{L.governingLaw}</Strong> az irányadó.
      Vita esetén a {L.jurisdiction} kizárólagosan illetékesek.
    </P>

    <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
      Verzió: {L.version} — Hatályos: {L.effectiveDate}
    </p>
  </LegalLayout>
);

export default JogiNyilatkozat;
