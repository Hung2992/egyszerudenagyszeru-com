import LegalLayout from "@/components/legal/LegalLayout";
import { H2, P, UL, Strong, Box } from "@/components/legal/LegalProse";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const PartnerSzabalyzat = () => (
  <LegalLayout
    slug="partner-szabalyzat"
    title="Partner és bérleti szabályzat"
    subtitle="A platform bérbeadására, partner-együttműködésre és forgalmi részesedéses modellre vonatkozó kötelező jogi keret."
    effectiveDate={L.effectiveDate}
  >
    <Box variant="info">
      Ez a szabályzat a {L.website} mögött álló <Strong>„Egyszerű de Nagyszerű" webshop-platform</Strong>{" "}
      bérleti / partner-együttműködési modelljére vonatkozik. Nem érinti a végfogyasztói vásárlókat — az ő
      jogviszonyukat az ÁSZF, az Adatvédelem és az Elállás dokumentumok szabályozzák.
    </Box>

    <H2>1. Fogalmak</H2>
    <UL>
      <li><Strong>Üzemeltető / Licencadó:</Strong> a platform szellemi tulajdonosa, a forráskód, az adatbázis-architektúra és a design-rendszer kizárólagos jogosultja.</li>
      <li><Strong>Bérlő / Partner:</Strong> az a magánszemély vagy gazdálkodó szervezet, aki/amely a platform egy elkülönített példányát saját brand és saját domain alatt üzemelteti.</li>
      <li><Strong>Példány:</Strong> a Bérlő részére átadott, branding-szinten testreszabott webshop-instancia.</li>
      <li><Strong>Bruttó forgalom:</Strong> a Példányon keresztül ténylegesen befolyt, vissza nem térített, áfával növelt vételárak összege egy naptári hónapban.</li>
    </UL>

    <H2>2. Az együttműködés tárgya</H2>
    <P>
      Az Üzemeltető a Bérlő részére használati jogot biztosít a platform egy példányára, biztosítja annak
      üzemeltetését, biztonsági karbantartását, frissítéseit és support-szolgáltatását. A Bérlő ezért a
      Példányon keresztül lebonyolított <Strong>bruttó forgalom után jutalékot</Strong> fizet az
      Üzemeltetőnek.
    </P>

    <H2>3. Jutalék · kötelező minimum</H2>
    <Box variant="warn">
      A jutalék mértéke a havi bruttó forgalom <Strong>minimum 5,00%-a</Strong>. Ennél magasabb mértékben
      a felek szabadon megállapodhatnak, alacsonyabb mértékben <Strong>semmilyen körülmény között nem</Strong>.
      Az ezt sértő bármely megállapodás a Ptk. 6:95. § alapján semmis.
    </Box>
    <UL>
      <li>Elszámolási időszak: naptári hónap.</li>
      <li>Számla kiállítás: tárgyhót követő hó 5. napjáig.</li>
      <li>Fizetési határidő: a számla kézhezvételétől számított 8 naptári nap.</li>
      <li>Késedelmi kamat: jegybanki alapkamat + 8 százalékpont (Ptk. 6:155. §).</li>
      <li>Behajtási költségátalány: 40 EUR / lejárt számla (2016. évi IX. tv.).</li>
    </UL>

    <H2>4. Forgalmi mérés · audit jog</H2>
    <P>
      A forgalmat a Példányba beépített, manipulálhatatlan analitikai modul (event-log, order-ledger,
      append-only revenue_ledger) rögzíti. Ez a mérés <Strong>elsődleges bizonyítéknak minősül</Strong>{" "}
      a felek közti elszámolásban.
    </P>
    <P>
      Az Üzemeltető évente kétszer, saját költségén, 15 napos előzetes értesítéssel jogosult a Bérlő
      könyvelésének vonatkozó tételeibe betekinteni vagy független könyvvizsgálót megbízni. Ha az audit
      ≥ 3% eltérést tár fel a Bérlő terhére, az audit teljes költségét a Bérlő viseli.
    </P>

    <H2>5. Szellemi tulajdon · tilalmak</H2>
    <P>
      A platform teljes forráskódja, adatbázis-sémája, design-rendszere és minden szellemi alkotása
      az Üzemeltető <Strong>kizárólagos tulajdona marad</Strong> (1999. évi LXXVI. tv. — Szjt.). A Bérlő
      nem szerez tulajdonjogot, kizárólag <em>nem kizárólagos, át nem ruházható, al-licenc adásra nem
      jogosító</em> használati jogot kap a szerződés időtartamára.
    </P>
    <Box variant="warn">
      <Strong>Tilos:</Strong> a forráskód kivonása, dekompilálása, reverse engineeringje, klónozása,
      harmadik félnek továbbadása, AI-tréningadatként felhasználása.
      <br />
      Megsértés esetén: <Strong>10 000 000 Ft (tízmillió forint) kötbér</Strong> esetenként, a tényleges
      kár érvényesítésén felül (Ptk. 6:186. §).
    </Box>

    <H2>6. Adatvédelem · GDPR szerepkörök</H2>
    <P>
      A Bérlő Példányán keletkező vásárlói adatok tekintetében:
    </P>
    <UL>
      <li>A <Strong>Bérlő az adatkezelő</Strong> (GDPR 4. cikk 7. pont).</li>
      <li>Az <Strong>Üzemeltető adatfeldolgozó</Strong> (GDPR 4. cikk 8. pont, 28. cikk).</li>
      <li>A felek külön <Strong>adatfeldolgozói szerződést (DPA)</Strong> kötnek, amely a fő szerződés elválaszthatatlan melléklete.</li>
      <li>Adatszivárgás esetén az Üzemeltető <Strong>72 órán belül</Strong> értesíti a Bérlőt (GDPR 33. cikk).</li>
    </UL>
    <Box variant="info">
      <Strong>Fizetési adatok korlátozása:</Strong> a platform kizárólag a kártyabirtokos nevét és a
      kártyaszám utolsó 4 számjegyét tárolja. Teljes PAN, CVC, lejárati dátum tárolása <Strong>tilos</Strong>;
      a tranzakciós feldolgozás PCI-DSS-megfelelő külső szolgáltatón (pl. Stripe, Barion, SimplePay)
      keresztül történik.
    </Box>

    <H2>7. SLA · rendelkezésre állás</H2>
    <UL>
      <li>Garantált havi uptime: <Strong>99,5%</Strong> (tervezett karbantartás nélkül).</li>
      <li>P1 (kritikus) hibajegy válaszidő: ≤ 4 óra.</li>
      <li>P2 (magas) hibajegy válaszidő: ≤ 24 óra.</li>
      <li>P3 (normál) hibajegy válaszidő: ≤ 5 munkanap.</li>
    </UL>
    <P>
      SLA-megsértés esetén jutalék-jóváírás: minden megkezdett 0,1% downtime után a havi jutalék 2%-ának
      visszatérítése, max. a havi jutalék 50%-áig.
    </P>

    <H2>8. Felelősség · korlátozás</H2>
    <P>
      Az Üzemeltető felel a platform technológiai üzemképességéért, a biztonsági frissítésekért és a saját
      szándékos vagy súlyosan gondatlan magatartásából eredő károkért.
    </P>
    <P>
      A Bérlő <Strong>kizárólagos felelősséget vállal</Strong> a saját termékei jogszerűségéért, minőségéért,
      készletéért, a vásárlói reklamációk kezeléséért, a saját számlázásáért, ÁFA-bevallásáért, a
      vásárlóival szembeni szavatossági és jótállási kötelezettségekért, valamint a brand-kommunikációjáért.
    </P>
    <Box variant="warn">
      Az Üzemeltető kártérítési felelősségének felső határa: a kárt megelőző 12 hónapban a Bérlő által
      ténylegesen kifizetett jutalék összege. Közvetett kárért, elmaradt haszonért, jó hírnév-sérelemért
      az Üzemeltető <Strong>nem felel</Strong> (Ptk. 6:152–6:153. §).
    </Box>

    <H2>9. Időtartam · felmondás</H2>
    <UL>
      <li><Strong>Határozott időtartam:</Strong> 12 hónap, amely 12 hónappal automatikusan meghosszabbodik, ha 60 nappal a lejárat előtt egyik fél sem mond fel írásban.</li>
      <li><Strong>Rendes felmondás:</Strong> 60 napos felmondási idővel, írásban (e-mail visszaigazolással elfogadott).</li>
      <li><Strong>Azonnali hatályú felmondás</Strong> az Üzemeltető részéről, ha a Bérlő: 15 napon túli fizetési késedelembe esik; a Példányt jogellenes tevékenységre használja; megsérti az 5. pont szerinti IP-védelmet; ellene csőd- vagy felszámolási eljárás indul.</li>
      <li>Megszűnéskor az Üzemeltető a Bérlő vásárlói adatait gépi olvasható formátumban (CSV/JSON) 30 napon belül átadja, majd a Példányt deaktiválja és 90 nap után véglegesen törli.</li>
    </UL>

    <H2>10. Versenytilalom · titoktartás</H2>
    <P>
      A Bérlő a szerződés időtartama alatt és annak megszűnését követő <Strong>24 hónapig</Strong> nem
      fejleszt, nem üzemeltet és nem támogat az Üzemeltető platformjával lényegében azonos funkcionalitású,
      magyar piacra szánt versenyterméket.
    </P>
    <P>
      A felek minden, a szerződés teljesítése során megismert információt <Strong>üzleti titokként</Strong>{" "}
      kezelnek (2018. évi LIV. tv.). Megsértés esetén <Strong>5 000 000 Ft kötbér</Strong> + tényleges
      kártérítés.
    </P>

    <H2>11. Vis maior</H2>
    <P>
      Egyik fél sem felel olyan kötelezettsége nem teljesítéséért, amelyet rajta kívül álló, elháríthatatlan
      ok (háború, természeti katasztrófa, állami korlátozás, országos internet- vagy áramkimaradás,
      pandémia) okozott. A vis maior 30 napon túli fennállása esetén bármely fél jogosult azonnali hatállyal
      felmondani.
    </P>

    <H2>12. Irányadó jog · jogviták</H2>
    <P>
      A szerződésre a <Strong>magyar jog</Strong> irányadó (Ptk., Szjt., 2001. évi CVIII. tv. — Eker.,
      GDPR). A felek a vitáikat elsősorban 30 napos egyeztetési időszak során, békés úton rendezik.
      Eredménytelenség esetén kikötik a <Strong>Budapesti II. és III. Kerületi Bíróság</Strong>, illetve
      hatáskör függvényében a <Strong>Fővárosi Törvényszék</Strong> kizárólagos illetékességét.
    </P>

    <H2>13. Záró rendelkezések</H2>
    <P>
      A szerződés bármely módosítása kizárólag írásban, mindkét fél által aláírva érvényes (eIDAS
      910/2014/EU rendelet szerinti minősített e-aláírás elfogadott). Ha bármely rendelkezés érvénytelennek
      minősülne, az nem érinti a többi rendelkezés érvényességét; az érvénytelen rendelkezés helyébe a
      felek által célzott gazdasági eredményhez legközelebb álló érvényes rendelkezés lép.
    </P>

    <Box variant="info">
      <Strong>Kapcsolat partner-ügyekben:</Strong>{" "}
      <a href={`mailto:${L.legalEmail}`} className="text-accent underline">{L.legalEmail}</a>
      <br />
      A jelen szabályzat keretjelleg; a végleges, aláírható szerződést ügyvédi ellenjegyzéssel, az egyedi
      adatok (felek, jutalék %, domain, indulási dátum) kitöltésével állítjuk ki.
    </Box>
  </LegalLayout>
);

export default PartnerSzabalyzat;
