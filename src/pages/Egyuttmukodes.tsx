import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Handshake, FileText, User, Mail, ShieldCheck, Percent, Scale, CheckCircle2 } from "lucide-react";

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
            <Button size="lg" onClick={() => navigate("/contact")}>
              <Mail className="h-4 w-4 mr-2" /> Érdekel — vegyük fel a kapcsolatot
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/about")}>
              Tudj meg többet rólam
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

      {/* CTA */}
      <section className="bg-accent/5">
        <div className="mx-auto max-w-5xl px-5 py-16 text-center">
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tight">
            Beszélgessünk az együttműködésről
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Írj egy üzenetet, és 48 órán belül visszajelzek a részletekkel.
          </p>
          <Button size="lg" className="mt-6" onClick={() => navigate("/contact")}>
            <Mail className="h-4 w-4 mr-2" /> Kapcsolatfelvétel
          </Button>
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

export default Egyuttmukodes;
