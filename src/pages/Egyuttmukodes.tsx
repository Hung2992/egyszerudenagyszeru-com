import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Handshake, FileText, User, Mail, ShieldCheck, Percent, Scale, CheckCircle2, Gavel, Lock, AlertTriangle, Download, UserPlus, LogIn } from "lucide-react";

const Egyuttmukodes = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      {/* HERO */}
      <section className="relative border-b border-border bg-gradient-to-br from-background via-background to-accent/5">
        <div className="mx-auto max-w-5xl px-5 py-16 md:py-24">
          <div className="inline-flex items-center gap-2 bg-accent/15 border border-accent/40 px-4 py-1.5 mb-6">
            <Handshake className="h-3.5 w-3.5 text-accent" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
              Együttműködés
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-[0.95]">
            Saját webshop <br /><span className="text-accent">teljes platformmal</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
            Bérbe adom a saját kezűleg felépített webshop rendszeremet márkáknak, viszonteladóknak,
            kreatív kollektíváknak — szerződéses, forgalom-arányos jutalék alapján. Te kapsz egy
            kész, működő boltot saját domainen; én adom a technológiát és a karbantartást.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate("/auth?mode=signup&redirect=/partner-onboarding")}>
              <UserPlus className="h-4 w-4 mr-2" /> Regisztráció
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth?mode=signin&redirect=/partner-onboarding")}>
              <LogIn className="h-4 w-4 mr-2" /> Belépés
            </Button>
          </div>
        </div>
      </section>

      {/* RÓLAM */}
      <section id="rolam" className="border-b border-border">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 border border-accent/40 bg-accent/10 flex items-center justify-center">
              <User className="h-5 w-5 text-accent" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Rólam</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4 text-sm md:text-base text-foreground/90 leading-relaxed">
              <p>
                Az „Egyszerű de Nagyszerű" mögött egyetlen ember áll — én. Évek óta építem saját kezűleg
                ezt a webshop rendszert, ami nem csak egy bolt: 300+ adattáblás, teljes vállalatirányítási
                háttér, beépített AI marketing studio, könyvelői modul, partner program, hűségrendszer és
                lokalizált jogi keret.
              </p>
              <p>
                Hiszek a tiszta, szögletes designban, az átlátható szerződésekben és abban, hogy a jó
                technológia akkor működik, ha más is haszonra tudja váltani. Ezért nyitottam meg
                bérbeadásra — nem előfizetés, nem licensz, hanem **valódi partnerség eladás-arányos
                jutalékkal**.
              </p>
              <p>
                Te a saját márkádra koncentrálsz; én biztosítom a stabil platformot, a fejlesztéseket,
                a hibajavításokat és a háttér-üzemeltetést.
              </p>
            </div>
            <div className="space-y-3">
              <Stat label="Adattábla" value="300+" />
              <Stat label="Modul" value="45+" />
              <Stat label="Min. jutalék" value="5%" />
              <Stat label="Előfizetés" value="0 Ft" />
            </div>
          </div>
        </div>
      </section>

      {/* HOGYAN MŰKÖDIK */}
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-8">
            Hogyan működik
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Step n={1} title="Szerződés">
              Aláírjuk a szerződést, ami rögzíti a jutalék mértékét (minimum 5% bruttó eladásból)
              és a fix időtartamot.
            </Step>
            <Step n={2} title="Saját bolt">
              Megkapod a teljes platformot saját domainen, saját brandinggal. Beállítom az
              alapokat és átadom az admin felületet.
            </Step>
            <Step n={3} title="Havi elszámolás">
              Minden hónapban automatikus forgalmi jelentés alapján számolunk el. Transzparens,
              követhető, számla ellenében.
            </Step>
          </div>
        </div>
      </section>

      {/* JOGI */}
      <section id="jogi" className="border-b border-border">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 border border-accent/40 bg-accent/10 flex items-center justify-center">
              <Scale className="h-5 w-5 text-accent" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Jogi keret</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <LegalCard icon={FileText} title="Szerződéses alapok">
              Az együttműködés minden esetben írásos szerződéssel indul. Tartalmazza a felek
              adatait, a jutalék mértékét (min. 5%), az időtartamot, a felmondási feltételeket
              és a felelősségi köröket.
            </LegalCard>
            <LegalCard icon={Percent} title="Forgalmi részesedés">
              Nincs előfizetés és fix díj. Az elszámolás kizárólag a tényleges, befolyt bruttó
              forgalom alapján történik. A pontos százalék szerződésenként egyedileg kerül
              meghatározásra, de soha nem alacsonyabb 5%-nál.
            </LegalCard>
            <LegalCard icon={ShieldCheck} title="Adatkezelés">
              A bérlő webshopjának vásárlói adatai a bérlő adatkezelői hatáskörébe tartoznak.
              Én adatfeldolgozóként járok el, GDPR-megfelelő adatfeldolgozói szerződéssel
              (DPA), titoktartással.
            </LegalCard>
            <LegalCard icon={CheckCircle2} title="Felelősség & SLA">
              A platform üzemeltetéséért, a biztonsági frissítésekért és a kritikus
              hibajavításokért én felelek. A bérlő felel a saját termékeiért, készletéért,
              vásárlói kommunikációjáért és számlázásáért.
            </LegalCard>
          </div>

          <div className="mt-8 border border-border bg-card p-5 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Fontos:</strong> Ez az oldal tájékoztató jellegű és
            nem minősül szerződéses ajánlatnak. A pontos jogi feltételeket az egyedi szerződés
            tartalmazza. A webshop általános jogi dokumentumai (ÁSZF, adatvédelem, impresszum)
            megtekinthetők a{" "}
            <button onClick={() => navigate("/legal")} className="text-accent underline underline-offset-2">
              Jogi központban
            </button>.
          </div>
        </div>
      </section>

      {/* SZERZŐDÉS — JOGILAG LEGERŐSEBB MINTA */}
      <section id="szerzodes" className="border-b border-border bg-muted/10">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 border border-accent/40 bg-accent/10 flex items-center justify-center">
              <Gavel className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">
                Szerződéses keret — mintaszerződés
              </h2>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                Magyar jog · Ptk. 6:272–6:280 § (megbízási / vállalkozási vegyes) · ÁSZF-kiegészítés
              </p>
            </div>
          </div>

          <div className="border-2 border-accent/40 bg-card p-6 md:p-8 space-y-6 text-sm leading-relaxed">

            <Clause num="1." title="Szerződő felek">
              <p><strong>Üzemeltető (Licencadó):</strong> az „Egyszerű de Nagyszerű" platform tulajdonosa,
              mint a teljes szoftverforráskód, adatbázis-architektúra és szellemi alkotás kizárólagos jogosultja.</p>
              <p><strong>Bérlő (Licencvevő):</strong> a webshop-példányt saját domainen, saját brand alatt
              üzemeltető magánszemély vagy gazdálkodó szervezet, aki/amely a jelen szerződést aláírja.</p>
            </Clause>

            <Clause num="2." title="A szerződés tárgya">
              <p>Az Üzemeltető biztosítja a Bérlő részére az „Egyszerű de Nagyszerű" webshop-platform
              egy elkülönített, branding-szinten testreszabott példányát (a továbbiakban: <em>Példány</em>),
              annak technológiai üzemeltetését, frissítését, biztonsági karbantartását és support-szolgáltatását.</p>
              <p>A Bérlő ezért a saját nevében, saját kockázatára, saját termékkínálattal kereskedik a Példányon
              keresztül, és az ebből származó <strong>bruttó forgalom után jutalékot</strong> fizet
              az Üzemeltetőnek.</p>
            </Clause>

            <Clause num="3." title="Jutalék — kötelező minimum 5%">
              <p>A jutalék mértéke a <strong>tényleges befolyt bruttó forgalom (áfa nélküli nettó értéke
              + áfa) minimum 5,00%-a</strong>. A felek ennél magasabb mértékben szabadon megállapodhatnak,
              de <strong>5% alá semmilyen körülmény között nem mehetnek</strong> — az ezt sértő bármely
              megállapodás semmis (Ptk. 6:95. §).</p>
              <p>Elszámolási időszak: naptári hónap. Az Üzemeltető minden hónap 5. napjáig kiállítja
              a jutalék-számlát, amelyet a Bérlő <strong>8 naptári napon belül</strong> banki átutalással teljesít.</p>
              <p><strong>Késedelmi kamat:</strong> a mindenkori jegybanki alapkamat + 8 százalékpont
              (Ptk. 6:155. §). <strong>Behajtási költségátalány:</strong> 40 EUR / lejárt számla
              (2016. évi IX. tv.).</p>
            </Clause>

            <Clause num="4." title="Forgalmi adatok ellenőrzése · audit jog">
              <p>Az Üzemeltető a Példányba beépített, manipulálhatatlan analitikai modul (event-log,
              order-ledger, append-only revenue_ledger tábla) alapján rögzíti a forgalmat.
              A Bérlő ezt a mérést <strong>elfogadja mint elsődleges bizonyítékot</strong>.</p>
              <p>Az Üzemeltető évente <strong>kétszer, saját költségén, előzetes 15 napos értesítéssel</strong>
              jogosult a Bérlő könyvelésébe a vonatkozó tételek erejéig betekinteni vagy független
              könyvvizsgálót megbízni. Ha az audit ≥ 3% eltérést tár fel a Bérlő terhére,
              az audit teljes költségét a Bérlő viseli.</p>
            </Clause>

            <Clause num="5." title="Szellemi tulajdon · forráskód">
              <p>A Példány teljes forráskódja, adatbázis-sémája, design-rendszere és minden szellemi alkotása
              <strong> az Üzemeltető kizárólagos tulajdona marad</strong> (Szjt. 1999. évi LXXVI. tv.).
              A Bérlő <strong>nem szerez tulajdonjogot</strong>, kizárólag <em>nem kizárólagos, át nem ruházható,
              al-licenc adásra nem jogosító használati jogot</em> kap a szerződés időtartamára.</p>
              <p>Tilos: forráskód-kivonás, dekompilálás, reverse engineering, klónozás, harmadik félnek
              továbbadás, AI-tréningadatként felhasználás. Bármely megsértése esetén
              <strong> 10 000 000 Ft (tízmillió forint) kötbér</strong> jár esetenként, a tényleges kár
              érvényesítésén felül (Ptk. 6:186. §).</p>
            </Clause>

            <Clause num="6." title="Adatvédelem · GDPR DPA">
              <p>A vásárlói adatok tekintetében a <strong>Bérlő az adatkezelő</strong>, az Üzemeltető
              az <strong>adatfeldolgozó</strong> (GDPR 28. cikk). A felek külön adatfeldolgozói szerződést
              (DPA) kötnek, amely a jelen szerződés elválaszthatatlan melléklete.</p>
              <p>Adatszivárgás esetén az Üzemeltető <strong>72 órán belül</strong> értesíti a Bérlőt
              a NAIH-bejelentési kötelezettsége teljesítéséhez (GDPR 33. cikk).</p>
              <p><strong>Fizetési adatok:</strong> a platform <em>kizárólag a kártyabirtokos nevét
              és az utolsó 4 számjegyet</em> tárolja; teljes PAN, CVC vagy lejárati adat tárolása
              tilos és a PCI-DSS hatálya alá esik — ezekért az Üzemeltető szavatol.</p>
            </Clause>

            <Clause num="7." title="SLA · rendelkezésre állás">
              <p>Az Üzemeltető <strong>99,5% havi uptime</strong>-ot garantál (tervezett karbantartás nélkül).
              Hibajegy-válaszidő: kritikus (P1) ≤ 4 óra, magas (P2) ≤ 24 óra, normál (P3) ≤ 5 munkanap.</p>
              <p>SLA-megsértés esetén jutalék-jóváírás: minden megkezdett 0,1% downtime után
              a havi jutalék 2%-ának visszatérítése, max. a havi jutalék 50%-áig.</p>
            </Clause>

            <Clause num="8." title="Felelősség és felelősségkorlátozás">
              <p>Az Üzemeltető felel a platform technológiai üzemképességéért, a biztonsági frissítésekért
              és a saját szándékos vagy súlyosan gondatlan magatartásából eredő károkért.</p>
              <p>A Bérlő <strong>kizárólagos felelősséget vállal</strong>: a termékei jogszerűségéért,
              minőségéért, készletéért, a vásárlói reklamációk kezeléséért, a saját számlázásáért,
              ÁFA-bevallásáért, a vásárlóival szembeni szavatossági és jótállási kötelezettségekért,
              valamint a saját brand-kommunikációjáért.</p>
              <p>Az Üzemeltető <strong>kártérítési felelősségének felső határa</strong>: a kárt megelőző
              12 hónapban a Bérlő által ténylegesen kifizetett jutalék összege.
              Közvetett kárért, elmaradt haszonért, jó hírnév-sérelemért az Üzemeltető nem felel
              (Ptk. 6:152–6:153. §).</p>
            </Clause>

            <Clause num="9." title="Időtartam · felmondás">
              <p><strong>Határozott időtartam:</strong> 12 hónap, amely automatikusan 12 hónappal meghosszabbodik,
              ha bármelyik fél a lejárat előtt 60 nappal írásban nem mond fel.</p>
              <p><strong>Rendes felmondás:</strong> 60 napos felmondási idővel, írásban (e-mail is elfogadott
              tértivevény-egyenértékű olvasási visszaigazolással).</p>
              <p><strong>Azonnali hatályú felmondás</strong> az Üzemeltető részéről, ha a Bérlő: (a) 15 napon
              túli fizetési késedelembe esik, (b) a Példányt jogellenes tevékenységre használja,
              (c) megsérti az 5. pont szerinti IP-védelmet, (d) ellene csőd/felszámolási eljárás indul.</p>
              <p>Megszűnéskor az Üzemeltető a Bérlő vásárlói adatait gépi olvasható formátumban
              (CSV/JSON) <strong>30 napon belül</strong> átadja, majd a Példányt deaktiválja és
              további 90 nap után véglegesen törli.</p>
            </Clause>

            <Clause num="10." title="Versenytilalom · titoktartás">
              <p>A Bérlő a szerződés időtartama alatt és annak megszűnését követő 24 hónapig <strong>nem
              fejleszt, nem üzemeltet és nem támogat</strong> az Üzemeltető platformjával lényegében
              azonos funkcionalitású, magyar piacra szánt versenytermék létrehozását.</p>
              <p>A felek minden, a szerződés teljesítése során megismert információt <strong>üzleti
              titokként</strong> kezelnek (2018. évi LIV. tv.). Megsértés esetén <strong>5 000 000 Ft
              kötbér</strong> + tényleges kártérítés.</p>
            </Clause>

            <Clause num="11." title="Vis maior">
              <p>Egyik fél sem felel olyan kötelezettsége nem teljesítéséért, amelyet rajta kívül álló,
              elháríthatatlan ok (háború, természeti katasztrófa, állami korlátozás, országos
              internet-/áramkimaradás, pandémia) okozott. A vis maior 30 napon túli fennállása
              esetén bármely fél jogosult azonnali hatállyal felmondani.</p>
            </Clause>

            <Clause num="12." title="Irányadó jog · jogviták">
              <p>A szerződésre a <strong>magyar jog</strong> irányadó, különösen a Ptk., az Szjt.,
              az Eker. tv. (2001. évi CVIII.) és a GDPR.</p>
              <p>A felek a vitáikat elsősorban békés úton, 30 napos egyeztetési időszak alatt rendezik.
              Eredménytelenség esetén kikötik a <strong>Budapesti II. és III. Kerületi Bíróság,
              illetve hatáskör függvényében a Fővárosi Törvényszék</strong> kizárólagos illetékességét.</p>
            </Clause>

            <Clause num="13." title="Záró rendelkezések">
              <p>A szerződés bármely módosítása <strong>kizárólag írásban</strong>, mindkét fél által
              aláírva érvényes (e-aláírás elfogadott, eIDAS 910/2014/EU rendelet szerint).</p>
              <p>Ha bármely rendelkezés érvénytelennek minősülne, az nem érinti a többi rendelkezés
              érvényességét (severability). Az érvénytelen rendelkezés helyébe a felek által
              célzott gazdasági eredményhez legközelebb álló érvényes rendelkezés lép.</p>
            </Clause>

            <div className="border-t border-border pt-5 mt-2 grid md:grid-cols-2 gap-5">
              <div className="border border-border p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Üzemeltető</p>
                <div className="h-12 border-b border-dashed border-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">aláírás, dátum, hely</p>
              </div>
              <div className="border border-border p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Bérlő</p>
                <div className="h-12 border-b border-dashed border-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">aláírás, dátum, hely</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" /> Nyomtatás / PDF mentés
            </Button>
            <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-xl">
              <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>
                Ez egy <strong>mintaszerződés-keret</strong>. A végleges, aláírható példányt
                ügyvédi ellenjegyzéssel, az egyedi adatok (felek, jutalék %, domain, indulási dátum)
                kitöltésével állítjuk ki. Az itt szereplő minimum-feltételek (5% jutalék, IP-védelem,
                GDPR DPA, magyar jog) <strong>nem alku tárgya</strong>.
              </span>
            </div>
          </div>
        </div>
      </section>


      <section className="bg-accent/5">
        <div className="mx-auto max-w-5xl px-5 py-16 text-center">
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tight">
            Indítsd el saját webshopodat
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Regisztrálj vagy lépj be — utána egyeztetjük a szerződés részleteit és élesítjük a saját Példányodat.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/auth?mode=signup&redirect=/partner-onboarding")}>
              <UserPlus className="h-4 w-4 mr-2" /> Regisztráció
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth?mode=signin&redirect=/partner-onboarding")}>
              <LogIn className="h-4 w-4 mr-2" /> Belépés
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-border bg-card p-4">
    <p className="text-2xl font-black text-accent">{value}</p>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
  </div>
);

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="border border-border bg-card p-5">
    <div className="text-3xl font-black text-accent/40 mb-2">{String(n).padStart(2, "0")}</div>
    <h3 className="font-bold uppercase tracking-tight mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
  </div>
);

const LegalCard = ({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) => (
  <div className="border border-border bg-card p-5">
    <div className="flex items-center gap-3 mb-3">
      <Icon className="h-4 w-4 text-accent" />
      <h3 className="font-bold uppercase tracking-tight text-sm">{title}</h3>
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
  </div>
);

const Clause = ({ num, title, children }: { num: string; title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="font-bold uppercase tracking-tight text-foreground text-sm">
      <span className="text-accent mr-2">{num}</span>{title}
    </h3>
    <div className="space-y-2 text-muted-foreground pl-6 border-l-2 border-accent/20">{children}</div>
  </div>
);

export default Egyuttmukodes;
