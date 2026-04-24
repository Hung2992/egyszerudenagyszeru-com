import LegalLayout from "@/components/legal/LegalLayout";
import { H2, H3, P, UL, OL, Strong, Box, Definition } from "@/components/legal/LegalProse";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const Aszf = () => (
  <LegalLayout
    slug="aszf"
    title="Általános Szerződési Feltételek"
    subtitle={`A ${L.website} webáruház (üzemelteti: ${L.ownerName}) használatára és a webáruházon keresztül kötött adásvételi szerződésekre vonatkozó általános feltételek.`}
    effectiveDate={L.effectiveDate}
  >
    <Box variant="info">
      <Strong>Kérjük, megrendelés leadása előtt figyelmesen olvasd el a jelen ÁSZF-et.</Strong> A megrendelés
      leadásával — illetve regisztrációval — kifejezetten elfogadod a benne foglaltakat. Az ÁSZF a Polgári
      Törvénykönyvről szóló 2013. évi V. törvény (Ptk.) 6:77. §-a szerinti általános szerződési feltételnek minősül.
    </Box>

    <H2 id="1">1. A Szolgáltató adatai</H2>
    <UL>
      <li><Strong>Név:</Strong> {L.ownerName} ({L.legalForm})</li>
      <li><Strong>Székhely:</Strong> {L.registeredOffice}</li>
      <li><Strong>Levelezési cím:</Strong> {L.mailingAddress}</li>
      <li><Strong>Adószám:</Strong> {L.taxId}</li>
      <li><Strong>Nyilvántartási szám:</Strong> {L.registryNumber}</li>
      <li><Strong>E-mail:</Strong> {L.email} (általános), {L.legalEmail} (jogi)</li>
      <li><Strong>Telefon:</Strong> {L.phone}</li>
      <li><Strong>Ügyfélszolgálati nyitva tartás:</Strong> {L.customerHours}</li>
      <li><Strong>Adatvédelmi felelős elérhetősége:</Strong> {L.privacyEmail}</li>
    </UL>

    <H3 id="1-1">1.1. Tárhelyszolgáltató</H3>
    <UL>
      <li><Strong>Név:</Strong> {L.hostingProvider}</li>
      <li><Strong>Cím:</Strong> {L.hostingAddress}</li>
      <li><Strong>E-mail:</Strong> {L.hostingEmail}</li>
    </UL>

    <H2 id="2">2. Fogalom-meghatározások</H2>
    <Definition term="Szolgáltató">
      A {L.brandName} márka tulajdonosa és üzemeltetője ({L.ownerName}), aki a webáruházban a termékeket
      értékesíti és a kapcsolódó szolgáltatásokat nyújtja.
    </Definition>
    <Definition term="Vásárló / Felhasználó">
      Bármely természetes személy (16. életévét betöltött, korlátozottan cselekvőképes vagy cselekvőképes),
      jogi személy vagy jogi személyiséggel nem rendelkező szervezet, aki a webáruházban megrendelést ad le,
      regisztrál vagy a szolgáltatást használja.
    </Definition>
    <Definition term="Fogyasztó">
      A Ptk. 8:1. § (1) bek. 3. pontja szerint az önálló foglalkozásán és gazdasági tevékenységén kívül eső
      célok érdekében eljáró természetes személy.
    </Definition>
    <Definition term="Vállalkozás">
      Az önálló foglalkozásával vagy gazdasági tevékenységével összefüggő célok érdekében eljáró személy.
    </Definition>
    <Definition term="Termék">
      A webáruházban értékesítésre kínált, a Szolgáltató által vagy partnereinek bevonásával forgalmazott
      ruházati cikk, kiegészítő vagy egyéb áru.
    </Definition>
    <Definition term="Távollévők között kötött szerződés">
      A 45/2014. (II. 26.) Korm. rendelet 4. § 10. pontja szerint olyan fogyasztói szerződés, amelyet a
      szerződés szerinti termék vagy szolgáltatás nyújtására szervezett távértékesítési rendszer keretében a
      felek egyidejű fizikai jelenléte nélkül kötnek meg, kizárólag távollévők közötti kommunikációt lehetővé
      tévő eszköz alkalmazásával.
    </Definition>

    <H2 id="3">3. Az ÁSZF hatálya, módosítása</H2>
    <P>
      A jelen ÁSZF {L.effectiveDate} napjától hatályos, és visszavonásig vagy módosításig érvényes. A
      Szolgáltató fenntartja a jogot az ÁSZF egyoldalú módosítására, melyet a webáruház felületén legalább
      <Strong> 15 nappal a hatálybalépést megelőzően</Strong> közzétesz. A módosítás a már leadott
      megrendelésekre nem visszamenőleges hatályú — azokra a megrendelés leadásakor hatályos ÁSZF az irányadó.
    </P>
    <P>
      A felek között létrejövő szerződés nyelve a <Strong>magyar</Strong>. A szerződés nem minősül írásbeli
      szerződésnek, azt a Szolgáltató nem iktatja, így utólag nem hozzáférhető — a megrendelés visszaigazolása
      e-mailben kerül megküldésre.
    </P>

    <H2 id="4">4. A vásárlás menete, a szerződés létrejötte</H2>
    <OL>
      <li>
        <Strong>Termékkiválasztás:</Strong> A Vásárló a webáruházban válogat, a kiválasztott terméket méret/szín
        megadásával a kosárba helyezi.
      </li>
      <li>
        <Strong>Kosár ellenőrzése:</Strong> A megrendelés véglegesítése előtt a Vásárló a kosár oldalán
        ellenőrizheti, módosíthatja vagy törölheti a tételeket.
      </li>
      <li>
        <Strong>Adatok megadása:</Strong> A Vásárló megadja a szállítási és számlázási adatait, kiválasztja a
        szállítási és fizetési módot.
      </li>
      <li>
        <Strong>ÁSZF + Adatvédelem elfogadása:</Strong> A megrendelés leadásához a Vásárlónak kifejezetten el
        kell fogadnia a jelen ÁSZF-et és az Adatkezelési tájékoztatót.
      </li>
      <li>
        <Strong>Megrendelés leadása:</Strong> A „Megrendelés véglegesítése / Fizetésre kötelező" gomb
        megnyomásával a Vásárló <Strong>fizetési kötelezettséggel járó</Strong> ajánlatot tesz a Szolgáltatónak.
      </li>
      <li>
        <Strong>Visszaigazolás:</Strong> A Szolgáltató a megrendelést automatikusan, e-mailben visszaigazolja
        legkésőbb <Strong>48 órán belül</Strong>. Ha ezen időn belül nem érkezik visszaigazolás, a Vásárló
        ajánlati kötöttsége megszűnik.
      </li>
      <li>
        <Strong>Szerződés létrejötte:</Strong> A felek közötti adásvételi szerződés a megrendelés
        Szolgáltató általi visszaigazolásával jön létre.
      </li>
    </OL>
    <Box variant="warn">
      <Strong>Adatbeviteli hibák javítása:</Strong> A Vásárló a megrendelés véglegesítése előtt minden
      adatbeviteli hibát javíthat. Téves adatmegadás esetén a Vásárló a beérkezést követően haladéktalanul
      köteles azt jelezni a {L.email} címen.
    </Box>

    <H2 id="5">5. Árak, fizetés</H2>
    <P>
      A webáruházban feltüntetett árak <Strong>magyar forintban (HUF)</Strong> értendőek és a vonatkozó
      jogszabályok szerinti közterheket (ÁFÁ-t) tartalmazzák. A feltüntetett árak nem tartalmazzák a
      szállítási költséget, melyet a megrendelés véglegesítése előtt a rendszer külön feltüntet.
    </P>
    <P>Adózási státusz: <Strong>{L.vatStatus}</Strong>.</P>
    <H3>5.1. Fizetési módok</H3>
    <UL>
      <li><Strong>Online bankkártyás fizetés</Strong> a Stripe Payments Europe Ltd. (Írország) rendszerén keresztül</li>
      <li><Strong>Banki átutalás</Strong> a visszaigazolásban szereplő számlaszámra</li>
      <li><Strong>Utánvét</Strong> (ahol elérhető) — a futárnál készpénzben vagy bankkártyával</li>
    </UL>
    <P>
      Sikertelen fizetés esetén a Szolgáltató fenntartja a jogot a megrendelés törlésére. A Stripe általi
      fizetés során bankkártya-adatokat a Szolgáltató <Strong>nem lát és nem tárol</Strong>.
    </P>

    <H2 id="6">6. Számlázás</H2>
    <P>
      A Szolgáltató a teljesítésről a hatályos jogszabályoknak megfelelő, <Strong>elektronikus számlát</Strong>
      állít ki, amelyet a Vásárló által megadott e-mail címre küld meg. A Vásárló a megrendelés leadásával
      kifejezetten hozzájárul az elektronikus számla kibocsátásához (2007. évi CXXVII. tv. 175. §).
    </P>

    <H2 id="7">7. Szállítás, teljesítés</H2>
    <P>
      A részletes szállítási feltételeket a <Strong>Szállítási tájékoztató</Strong> tartalmazza
      (<a className="text-accent underline" href="/legal/szallitas">/legal/szallitas</a>). A teljesítési határidő
      általában <Strong>2–10 munkanap</Strong> (előrendelhető termékek esetén ettől eltérő, a termékadatlapon
      feltüntetett idő). A Szolgáltató legkésőbb a megrendelés visszaigazolásától számított
      <Strong> 30 napon belül</Strong> köteles teljesíteni (Ptk. 6:220. §).
    </P>
    <P>
      <Strong>Kárveszély átszállása:</Strong> Fogyasztó esetén a kárveszély a termék fogyasztó (vagy az általa
      kijelölt harmadik személy) általi átvételével száll át (Ptk. 6:219. §).
    </P>

    <H2 id="8">8. Elállási jog (14 nap)</H2>
    <P>
      A Fogyasztónak joga van a szerződéstől <Strong>14 napon belül indokolás nélkül elállni</Strong> a
      45/2014. (II. 26.) Korm. rendelet alapján. A részletes szabályokat és a nyilatkozatmintát az
      <a className="text-accent underline" href="/legal/elallas"> Elállási tájékoztató</a> tartalmazza.
    </P>

    <H2 id="9">9. Szavatosság, jótállás, panaszkezelés</H2>
    <P>
      A Szolgáltatót <Strong>kellékszavatosság, termékszavatosság</Strong> és — bizonyos termékek esetén —
      <Strong> jótállás</Strong> terheli. A részletes szabályokat a
      <a className="text-accent underline" href="/legal/garancia"> Garancia és panaszkezelés</a> tájékoztató
      tartalmazza. A 19/2014. (IV. 29.) NGM rendelet 4. § alapján a panaszt 30 napon belül érdemben kivizsgáljuk.
    </P>

    <H2 id="10">10. A felek jogai és kötelezettségei</H2>
    <H3>10.1. Vásárló</H3>
    <UL>
      <li>Köteles a valós, pontos adatok megadására; téves adatból eredő kárért a felelősség őt terheli.</li>
      <li>Jogosult a megrendelt termék átvételére, vagy elállásra a jogszabályi feltételek szerint.</li>
      <li>Köteles a vételár és a szállítási költség határidőben történő megfizetésére.</li>
      <li>Köteles a webáruházat rendeltetésszerűen, jóhiszeműen használni, harmadik fél jogait nem sértve.</li>
    </UL>
    <H3>10.2. Szolgáltató</H3>
    <UL>
      <li>Köteles a megrendelést a jogszabályok és az ÁSZF szerint teljesíteni.</li>
      <li>Jogosult a megrendelést indokolt esetben (pl. készlethiány, csalásgyanú, hibás ár) törölni — ilyenkor a már megfizetett összeget hiánytalanul visszatéríti.</li>
      <li>Fenntartja a jogot a webáruház átmeneti vagy tartós szüneteltetésére, karbantartására.</li>
    </UL>

    <Box variant="warn">
      <Strong>Hibás ár / nyilvánvaló elírás:</Strong> Amennyiben a webáruházban nyilvánvalóan téves ár (pl. 0
      Ft, irreálisan alacsony ár) jelenik meg, a Szolgáltató nem köteles a terméket az így feltüntetett áron
      értékesíteni — a Vásárlót haladéktalanul értesíti, és felajánlja a helyes áron történő teljesítést vagy
      a megrendelés törlését.
    </Box>

    <H2 id="11">11. Felelősségkorlátozás</H2>
    <P>
      A Szolgáltató felelőssége — a hatályos jogszabályok keretei között, a fogyasztói jogokat nem érintve —
      kizárólag a Vásárló által ténylegesen megfizetett vételár erejéig terjed. A Szolgáltató nem felel az
      olyan károkért, amelyek a webáruház vis maior, üzemszünet, harmadik fél magatartása vagy a Vásárló saját
      hibájából eredő használatából származnak.
    </P>

    <H2 id="12">12. Szellemi tulajdon</H2>
    <P>
      A webáruház teljes tartalma (logók, szövegek, képek, kódok, design) a Szolgáltató vagy partnereinek
      szellemi tulajdona, és a szerzői jogról szóló 1999. évi LXXVI. tv. védelme alatt áll. Bármilyen másolás,
      letöltés, terjesztés, módosítás csak előzetes írásbeli engedéllyel megengedett.
    </P>

    <H2 id="13">13. Adatvédelem</H2>
    <P>
      A Szolgáltató a Vásárló személyes adatait a GDPR (EU) 2016/679 rendelet és a 2011. évi CXII. tv. (Infotv.)
      előírásainak megfelelően kezeli. A részleteket az
      <a className="text-accent underline" href="/legal/adatvedelem"> Adatkezelési tájékoztató</a> tartalmazza.
    </P>

    <H2 id="14">14. Vitarendezés</H2>
    <P>
      A Vásárló panaszát elsősorban a Szolgáltató felé jelezheti a {L.email} címen. Amennyiben a panaszra adott
      válasszal nem ért egyet, az alábbi fórumokhoz fordulhat:
    </P>
    <UL>
      <li>
        <Strong>Békéltető testület</Strong> (fogyasztói jogvita esetén, ingyenes eljárás): {L.arbitrationBoard},
        {" "}{L.arbitrationAddress}, e-mail: {L.arbitrationEmail}.
      </li>
      <li>
        <Strong>Fogyasztóvédelmi hatóság:</Strong> {L.consumerAuthority}, {L.consumerAuthorityAddress}.
      </li>
      <li>
        <Strong>Online vitarendezési platform (ODR):</Strong>{" "}
        <a className="text-accent underline" href="https://ec.europa.eu/odr" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/odr
        </a> — az EU 524/2013/EU rendelete alapján.
      </li>
      <li><Strong>Bíróság:</Strong> {L.jurisdiction}.</li>
    </UL>
    <P>Az alkalmazandó jog: <Strong>{L.governingLaw}</Strong>.</P>

    <H2 id="15">15. Záró rendelkezések</H2>
    <P>
      Ha a jelen ÁSZF bármely rendelkezése érvénytelennek vagy végrehajthatatlannak bizonyulna, az nem érinti a
      többi rendelkezés érvényességét. A felek a jelen ÁSZF-ben nem szabályozott kérdésekben a magyar jog —
      különösen a Ptk., a 45/2014. (II. 26.) Korm. rendelet, a 19/2014. (IV. 29.) NGM rendelet, a 2001. évi
      CVIII. törvény (Ekertv.) és a GDPR — rendelkezéseit tekintik irányadónak.
    </P>

    <Box variant="law">
      <Strong>Hatályos jogszabályok jegyzéke:</Strong>
      <ul className="list-disc pl-5 mt-2 space-y-1">
        <li>2013. évi V. törvény a Polgári Törvénykönyvről (Ptk.)</li>
        <li>45/2014. (II. 26.) Korm. rendelet a fogyasztó és a vállalkozás közötti szerződések részletes szabályairól</li>
        <li>19/2014. (IV. 29.) NGM rendelet a fogyasztó és vállalkozás közötti szerződés keretében eladott dolgokra vonatkozó szavatossági és jótállási igények intézéséről</li>
        <li>151/2003. (IX. 22.) Korm. rendelet a tartós fogyasztási cikkekre vonatkozó kötelező jótállásról</li>
        <li>2001. évi CVIII. törvény az elektronikus kereskedelmi szolgáltatásokról (Ekertv.)</li>
        <li>1997. évi CLV. törvény a fogyasztóvédelemről</li>
        <li>2011. évi CXII. törvény az információs önrendelkezési jogról és az információszabadságról (Infotv.)</li>
        <li>(EU) 2016/679 rendelet (GDPR)</li>
        <li>2007. évi CXXVII. törvény az általános forgalmi adóról (Áfa tv.)</li>
        <li>1999. évi LXXVI. törvény a szerzői jogról</li>
      </ul>
    </Box>

    <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
      Verzió: {L.version} — Hatályos: {L.effectiveDate} — Utolsó módosítás: {L.lastUpdated}
    </p>
  </LegalLayout>
);

export default Aszf;
