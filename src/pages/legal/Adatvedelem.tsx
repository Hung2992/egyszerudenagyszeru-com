import LegalLayout from "@/components/legal/LegalLayout";
import { H2, H3, P, UL, OL, Strong, Box } from "@/components/legal/LegalProse";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const Adatvedelem = () => (
  <LegalLayout
    slug="adatvedelem"
    title="Adatkezelési Tájékoztató"
    subtitle="Az Európai Parlament és a Tanács (EU) 2016/679 rendelete (GDPR) és a 2011. évi CXII. törvény (Infotv.) szerint."
    effectiveDate={L.effectiveDate}
  >
    <Box variant="info">
      <Strong>Tiszteljük a magánszférád.</Strong> Ez a tájékoztató részletesen bemutatja, hogyan kezeljük a
      személyes adataidat a {L.website} oldal és a {L.brandName} márka szolgáltatásai során. Olvasd el — ez a
      jogod, és a mi felelősségünk.
    </Box>

    <H2 id="1">1. Az adatkezelő</H2>
    <UL>
      <li><Strong>Adatkezelő:</Strong> {L.ownerName} ({L.legalForm})</li>
      <li><Strong>Székhely:</Strong> {L.registeredOffice}</li>
      <li><Strong>Adószám:</Strong> {L.taxId}</li>
      <li><Strong>Adatvédelmi kapcsolattartó e-mail:</Strong> {L.privacyEmail}</li>
      <li><Strong>Általános e-mail:</Strong> {L.email}</li>
    </UL>
    <P>
      Adatvédelmi tisztviselő (DPO) kijelölésére jelenleg a GDPR 37. cikke alapján nem vagyunk kötelezettek;
      adatvédelmi kérdésekben a fenti címen tudsz hozzánk fordulni.
    </P>

    <H2 id="2">2. Az adatkezelés alapelvei</H2>
    <P>A GDPR 5. cikke alapján az alábbi alapelveket tartjuk be:</P>
    <UL>
      <li><Strong>Jogszerűség, tisztesség, átláthatóság</Strong></li>
      <li><Strong>Célhoz kötöttség</Strong> — csak meghatározott, egyértelmű és jogszerű célból</li>
      <li><Strong>Adattakarékosság</Strong> — csak a szükséges adat</li>
      <li><Strong>Pontosság</Strong></li>
      <li><Strong>Korlátozott tárolhatóság</Strong></li>
      <li><Strong>Integritás és bizalmas jelleg</Strong> (titkosítás, hozzáférés-korlátozás)</li>
      <li><Strong>Elszámoltathatóság</Strong></li>
    </UL>

    <H2 id="3">3. A kezelt adatok köre, célja, jogalapja és időtartama</H2>

    <H3>3.1. Regisztráció / fiók</H3>
    <UL>
      <li><Strong>Adatok:</Strong> e-mail, jelszó (titkosítva), név (opcionális)</li>
      <li><Strong>Cél:</Strong> fiók létrehozása, belépés, megrendelések követése</li>
      <li><Strong>Jogalap:</Strong> GDPR 6. cikk (1) b) — szerződés teljesítése</li>
      <li><Strong>Időtartam:</Strong> a fiók törléséig, illetve az utolsó belépéstől számított 5 évig</li>
    </UL>

    <H3>3.2. Megrendelés</H3>
    <UL>
      <li><Strong>Adatok:</Strong> név, szállítási cím, számlázási cím, telefonszám, e-mail, megrendelt termékek, fizetési mód</li>
      <li><Strong>Cél:</Strong> a szerződés teljesítése, számlázás, szállítás</li>
      <li><Strong>Jogalap:</Strong> GDPR 6. cikk (1) b) — szerződés; c) — jogi kötelezettség (számviteli)</li>
      <li><Strong>Időtartam:</Strong> a számvitelről szóló 2000. évi C. tv. 169. §-a alapján <Strong>8 év</Strong> a számlán szereplő adatokra</li>
    </UL>

    <H3>3.3. Bankkártya-adatok</H3>
    <Box variant="info">
      Bankkártya-adatokat <Strong>nem látunk és nem tárolunk</Strong>. A fizetést a Stripe Payments Europe Ltd.
      (Írország) PCI-DSS tanúsított rendszere bonyolítja. A Stripe adatkezelési tájékoztatója:{" "}
      <a className="text-accent underline" href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
        stripe.com/privacy
      </a>
    </Box>

    <H3>3.4. Hírlevél, marketing</H3>
    <UL>
      <li><Strong>Adatok:</Strong> e-mail, név (opcionális), érdeklődési kategóriák</li>
      <li><Strong>Cél:</Strong> hírlevél, kedvezmények, új termékek bemutatása</li>
      <li><Strong>Jogalap:</Strong> GDPR 6. cikk (1) a) — hozzájárulás (külön opt-in)</li>
      <li><Strong>Időtartam:</Strong> a hozzájárulás visszavonásáig (egy kattintás minden e-mailben)</li>
    </UL>

    <H3>3.5. Panaszkezelés, ügyfélszolgálat</H3>
    <UL>
      <li><Strong>Adatok:</Strong> név, e-mail, panasz tartalma, kapcsolódó megrendelés</li>
      <li><Strong>Jogalap:</Strong> 1997. évi CLV. tv. 17/A. §; GDPR 6. cikk (1) c)</li>
      <li><Strong>Időtartam:</Strong> 5 év (Fgytv. szerint)</li>
    </UL>

    <H3>3.6. Cookie-k és analitika</H3>
    <P>
      Részletesen lásd a <a className="text-accent underline" href="/legal/cookie">Cookie szabályzatban</a>.
    </P>

    <H3>3.7. Csalás-megelőzés</H3>
    <UL>
      <li><Strong>Adatok:</Strong> IP-cím, eszközazonosító, vásárlási minta, AI-elemzés</li>
      <li><Strong>Jogalap:</Strong> GDPR 6. cikk (1) f) — jogos érdek (csalás-megelőzés, vagyon védelme)</li>
      <li><Strong>Időtartam:</Strong> 1 év</li>
    </UL>

    <H2 id="4">4. Adatfeldolgozók (címzettek)</H2>
    <P>Az alábbi feldolgozók férnek hozzá az adatokhoz a feladatuk ellátásához szükséges mértékben:</P>
    <UL>
      <li><Strong>Tárhely:</Strong> {L.hostingProvider} ({L.hostingAddress}) — EU/EGT-n belüli régió</li>
      <li><Strong>Fizetés:</Strong> Stripe Payments Europe Ltd. (Írország)</li>
      <li><Strong>Számlázás:</Strong> elektronikus számlázó rendszer ({L.email}-en keresztül elérhető)</li>
      <li><Strong>Szállítás:</Strong> a választott futárszolgálat (GLS, Foxpost, MPL, DPD stb.)</li>
      <li><Strong>E-mail küldés:</Strong> tranzakciós e-mail szolgáltató (Resend / Brevo)</li>
      <li><Strong>AI-asszisztens:</Strong> Lovable AI Gateway (csak admin használatra, vásárlói adatok nem)</li>
    </UL>
    <P>
      <Strong>Harmadik országba történő adattovábbítás:</Strong> A Stripe és bizonyos szolgáltatók USA-beli
      anyacéggel rendelkeznek; az adattovábbítás az EU Bizottság megfelelőségi határozata (Data Privacy
      Framework) vagy szabványos szerződéses feltételek (SCC) alapján történik.
    </P>

    <H2 id="5">5. Az érintett jogai (GDPR III. fejezet)</H2>
    <UL>
      <li><Strong>Hozzáférési jog</Strong> (15. cikk) — másolatot kérhetsz a kezelt adatokról</li>
      <li><Strong>Helyesbítéshez való jog</Strong> (16. cikk)</li>
      <li><Strong>Törléshez való jog / „elfeledtetéshez"</Strong> (17. cikk)</li>
      <li><Strong>Adatkezelés korlátozása</Strong> (18. cikk)</li>
      <li><Strong>Adathordozhatóság</Strong> (20. cikk) — gépi olvasású formátumban</li>
      <li><Strong>Tiltakozás joga</Strong> (21. cikk) — különösen jogos érdeken alapuló kezeléssel szemben</li>
      <li><Strong>Hozzájárulás visszavonása</Strong> bármikor (7. cikk (3))</li>
      <li><Strong>Automatizált döntéshozatal alóli mentesség</Strong> (22. cikk)</li>
    </UL>
    <P>
      Kérelmedet a {L.privacyEmail} címen jelezheted. A kérelemre <Strong>30 napon belül</Strong> érdemben
      válaszolunk (indokolt esetben +60 nappal hosszabbítható).
    </P>

    <H2 id="6">6. Adatbiztonság</H2>
    <UL>
      <li>HTTPS (TLS 1.3) titkosítás minden átvitelnél</li>
      <li>Jelszavak titkosított tárolása (bcrypt)</li>
      <li>Soronkénti biztonság (RLS) az adatbázisban — minden vásárló csak a saját adatát látja</li>
      <li>Hozzáférés-korlátozás, audit napló</li>
      <li>Rendszeres biztonsági frissítések</li>
    </UL>

    <H2 id="7">7. Adatvédelmi incidens kezelése</H2>
    <P>
      Adatvédelmi incidens esetén — amennyiben az valószínűsíthetően magas kockázattal jár az érintettek
      jogaira — <Strong>72 órán belül</Strong> bejelentjük a NAIH-nak (GDPR 33. cikk), és indokolt esetben az
      érintetteket is haladéktalanul tájékoztatjuk (GDPR 34. cikk).
    </P>

    <H2 id="8">8. Jogorvoslat</H2>
    <P>Panaszt tehetsz az alábbi hatóságnál vagy bíróság előtt:</P>
    <UL>
      <li><Strong>{L.dataAuthority}</Strong></li>
      <li>Cím: {L.dataAuthorityAddress}</li>
      <li>Telefon: {L.dataAuthorityPhone}</li>
      <li>E-mail: {L.dataAuthorityEmail}</li>
      <li>Weboldal: <a className="text-accent underline" href="https://naih.hu" target="_blank" rel="noopener noreferrer">naih.hu</a></li>
    </UL>

    <H2 id="9">9. Gyermekek adatai</H2>
    <P>
      Szolgáltatásunk <Strong>16. életévét betöltött</Strong> személyek számára nyújtott. 16 év alatti
      személytől tudatosan nem gyűjtünk adatot; ha tudomásunkra jut, hogy ilyen adat került hozzánk, azt
      haladéktalanul töröljük.
    </P>

    <H2 id="10">10. A tájékoztató módosítása</H2>
    <P>
      Fenntartjuk a jogot a tájékoztató módosítására. A módosítást a webáruházban tesszük közzé, lényeges
      változás esetén külön e-mailben is értesítünk.
    </P>

    <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
      Verzió: {L.version} — Hatályos: {L.effectiveDate} — Utolsó módosítás: {L.lastUpdated}
    </p>
  </LegalLayout>
);

export default Adatvedelem;
