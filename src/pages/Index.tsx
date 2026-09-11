import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  FileSignature,
  FileText,
  Globe2,
  Lock,
  Mail,
  Menu,
  MessageSquareText,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import heroImage from "@/assets/apex-business-platform-hero.jpg";
import { PARTNER_CONTRACT_TEMPLATE } from "@/content/partnerContractTemplate";

const modules = [
  {
    icon: Globe2,
    label: "Weboldal & márkaoldal motor",
    title: "Saját domain, saját dizájn.",
    description: "Weboldal, landing oldalak, blog, SEO metaadatok, mobilos megjelenés, verziókezelés és egykattintásos visszaállítás.",
    className: "md:col-span-1",
  },
  {
    icon: ShoppingCart,
    label: "Webshop & termékkezelés",
    title: "Fizikai, digitális, kurzus, szolgáltatás.",
    description: "Variánsok, méretek, színek, készlet, licenc-kulcsok, letöltések, árazási szabályok és kosárelhagyás kezelés.",
    className: "md:col-span-2",
  },
  {
    icon: Users,
    label: "CRM & ügyfélkapcsolatok",
    title: "Minden érintkezés egy helyen.",
    description: "Érdeklődők, vásárlók, foglalások, előzmények, címkék, csoportok és napi teendők közvetlenül az ügyfél mellől.",
    className: "md:col-span-1",
  },
  {
    icon: CalendarDays,
    label: "Naptár & online foglalás",
    title: "Foglalás alvás közben is.",
    description: "Szolgáltatásidőpontok, szabad idősávok, automatikus visszaigazolás, emlékeztetők és napi ügyféllista.",
    className: "md:col-span-1",
  },
  {
    icon: Mail,
    label: "Marketing & kampányközpont",
    title: "Hírlevél, SMS, QR, UTM, A/B.",
    description: "Segmentált kampányok, automatikus tölcsérek, közösségi poszt-javaslatok és teljes analitikai visszakövetés.",
    className: "md:col-span-2",
  },
  {
    icon: Bot,
    label: "AI munkatársak",
    title: "Szöveg, kép, videó, kód.",
    description: "AI fejlesztő építi az oldalaidat, ír termékleírásokat, SEO-t, hirdetéseket és generál médiafájlokat saját AI szerveren is.",
    className: "md:col-span-1",
  },
  {
    icon: Smartphone,
    label: "APEX kommunikációs platform",
    title: "Email, SMS, WhatsApp, hang.",
    description: "Saját CPaaS motor DLR-ekkel, opt-outtal, routinggal, retry-jel és szállítási központtal. Nem kell külön Twilio.",
    className: "md:col-span-1",
  },
  {
    icon: BarChart3,
    label: "Vezetői & pénzügyi központ",
    title: "Rendelés, bevétel, jutalék, KPI.",
    description: "Élő dashboard, audit napló, partner kifizetések, visszatérítések és döntéstámogató mutatók.",
    className: "md:col-span-1",
  },
  {
    icon: ShieldCheck,
    label: "Biztonság & tenant isolation",
    title: "Adatod, jogosultságod, auditod.",
    description: "Row-level security, szerepkörök, több-bérlős architektúra, változás-nyomon követés és egykattintásos rollback.",
    className: "md:col-span-1",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const goToRegistration = () => navigate("/partner-regisztracio");
  const scrollToModules = () => document.getElementById("modulok")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3" aria-label="Egyszerű de Nagyszerű főoldal">
            <span className="flex h-8 w-8 items-center justify-center border border-accent text-xs font-bold text-accent">EN</span>
            <span className="font-heading text-sm font-bold uppercase tracking-[0.12em]">Egyszerű <span className="text-accent">de</span> Nagyszerű</span>
          </button>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Fő navigáció">
            <button onClick={scrollToModules} className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground">Képességek</button>
            <a href="#mukodes" className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground">Hogyan működik</a>
            <a href="#biztonsag" className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground">Biztonság</a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" className="rounded-none text-xs uppercase tracking-[0.12em]" onClick={() => navigate("/auth")}>Belépés</Button>
            <Button className="rounded-none bg-accent px-5 text-xs font-bold uppercase tracking-[0.12em] text-accent-foreground hover:bg-accent/90" onClick={goToRegistration}>Regisztráció</Button>
          </div>

          <Button variant="ghost" size="icon" className="rounded-none md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Menü bezárása" : "Menü megnyitása"}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && (
          <nav className="border-t border-border bg-background px-5 py-5 md:hidden">
            <button onClick={() => { scrollToModules(); setMenuOpen(false); }} className="block w-full border-b border-border py-4 text-left text-sm">Képességek</button>
            <a href="#mukodes" onClick={() => setMenuOpen(false)} className="block border-b border-border py-4 text-sm">Hogyan működik</a>
            <a href="#biztonsag" onClick={() => setMenuOpen(false)} className="block border-b border-border py-4 text-sm">Biztonság</a>
            <Button className="mt-5 w-full rounded-none bg-accent text-accent-foreground" onClick={goToRegistration}>Regisztráció <ArrowRight /></Button>
          </nav>
        )}
      </header>

      <main>
        <section className="relative flex min-h-[720px] items-end overflow-hidden pt-16 md:min-h-[760px]">
          <img src={heroImage} alt="Az APEX üzleti platform kezelőfelülete munka közben" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover object-[68%_center] md:object-center" {...({ fetchpriority: "high" } as Record<string, string>)} />
          <div className="absolute inset-0 bg-background/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />

          <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-32 lg:px-8 lg:pb-24">
            <div className="max-w-3xl">
              <div className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                <span className="h-px w-8 bg-accent" />
                Bérelhető üzleti szoftver · Végpontig
              </div>
              <h1 className="max-w-4xl text-4xl font-bold leading-[0.98] md:text-6xl lg:text-7xl">
                Weboldal. Webshop.<br /><span className="text-accent">Ügyvitel. AI.</span><br />Egy rendszerben.
              </h1>
              <p className="mt-7 max-w-2xl text-lg font-medium leading-relaxed text-foreground md:text-xl">
                Az Egyszerű de Nagyszerű nem weboldalkészítő. Komplett, bérelhető vállalkozásirányítási platform.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Építs saját weboldalt és webshopot, árulj terméket, szolgáltatást, kurzust és digitális tartalmat, kezeld ügyfeleidet, naptáradat, kampányaidat, SMS/email kommunikációdat, szállításodat és pénzügyeidet — mindezt egy központból, saját márkáddal.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-14 rounded-none bg-accent px-8 text-xs font-bold uppercase tracking-[0.14em] text-accent-foreground hover:bg-accent/90" onClick={goToRegistration}>
                  Saját rendszer indítása <ArrowRight />
                </Button>
                <Button size="lg" variant="outline" className="h-14 rounded-none border-foreground/30 bg-background/30 px-8 text-xs uppercase tracking-[0.14em] backdrop-blur-sm hover:bg-secondary" onClick={scrollToModules}>
                  Megnézem a rendszert
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
                {["Saját domain", "Saját adatok", "Bérelhető rendszer", "Végpontig"].map((item) => (
                  <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border px-5 md:grid-cols-4 lg:px-8">
            {[
              ["1", "Egy rendszer"], ["0", "Külső eszköz"], ["Saját", "Domain & márka"], ["∞", "Modul & ügyfél"],
            ].map(([value, label]) => (
              <div key={label} className="px-4 py-7 text-center md:py-9">
                <p className="text-2xl font-bold text-accent md:text-3xl">{value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="modulok" className="mx-auto max-w-7xl px-5 py-20 md:py-28 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Modulok végpontig</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">Nem weboldalkészítő.<br /><span className="text-muted-foreground">Komplett üzleti szoftver.</span></h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">Minden modul ugyanabban a rendszerben fut: egyetlen admin, egyetlen ügyfélbázis, egyetlen bevételi- és marketingadat. Nincs szükség külön Shopify-ra, Webflow-ra, Calendly-re, Mailchimpre vagy CRM-re.</p>
          </div>

          <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
            {modules.map(({ icon: Icon, label, title, description, className }) => (
              <article key={label} className={`group min-h-[270px] bg-card p-7 transition-colors hover:bg-secondary md:p-9 ${className}`}>
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center border border-border text-accent transition-colors group-hover:border-accent"><Icon className="h-5 w-5" /></span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </div>
                <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">{label}</p>
                <h3 className="mt-3 text-2xl font-bold">{title}</h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="mukodes" className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[0.8fr_1.2fr]">
            <div className="border-b border-border px-5 py-16 lg:border-b-0 lg:border-r lg:px-8 lg:py-24">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Hogyan épül fel</p>
              <h2 className="mt-4 text-4xl font-bold md:text-5xl">A nullától az élő üzletig.</h2>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Nincs szükség külön dizájnerre, fejlesztőre, webshopmotorra vagy CRM-re. A rendszer végigvezet a teljes digitális működés kialakításán.</p>
              <Button variant="outline" className="mt-8 h-12 rounded-none border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={goToRegistration}>Kezdés most <ArrowRight /></Button>
            </div>
            <div className="px-5 py-12 lg:px-14 lg:py-20">
              {[
                ["01", "Regisztrálsz partnerként", "Saját fiók, saját domain, saját márka. Azonnal elérhető admin felület."],
                ["02", "AI felméri a vállalkozásod", "Kiválasztja a szükséges modulokat, dizájnt és tartalmi struktúrát."],
                ["03", "AI fejlesztő megépíti", "Weboldal, webshop, termékkategóriák, szolgáltatás- és foglalási oldalak."],
                ["04", "Feltöltöd a portfóliót", "Termékek, variánsok, készlet, digitális licenc, kurzus, árak, időpontok."],
                ["05", "Elindítod a forgalmat", "SEO, hírlevél, SMS, QR, UTM, közösségi kampányok és automatizált tölcsérek."],
                ["06", "Kezeled az üzletet", "Rendelések, foglalások, ügyfelek, szállítás, kifizetések, riportok — egy képernyőn."],
              ].map(([number, title, description]) => (
                <div key={number} className="grid grid-cols-[48px_1fr] gap-4 border-b border-border py-6 first:pt-0 last:border-0 last:pb-0">
                  <span className="font-mono text-sm text-accent">{number}</span>
                  <div><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="biztonsag" className="mx-auto max-w-7xl px-5 py-20 md:py-28 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Biztonság és adattulajdonlás</p>
              <h2 className="mt-4 text-4xl font-bold md:text-6xl">A te adatod.<br />A te jogosultságod.</h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">Minden partner saját bérlőben fut: row-level security, szerepkör-alapú hozzáférés, audit napló és változáskövetés. Az AI javasol, de a pénzügyi, jogi és adatkezelési műveletek csak emberi jóváhagyással élesednek. Bármely változtatás visszaállítható.</p>
            </div>
            <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
              {[
                [ShieldCheck, "RLS & tenant isolation"], [Lock, "Szerepkörös jogosultságok"],
                [PackageCheck, "Verziókezelés & rollback"], [FileText, "Audit napló & követhetőség"],
              ].map(([Icon, text]) => {
                const FeatureIcon = Icon as typeof ShieldCheck;
                return <div key={text as string} className="flex min-h-36 flex-col justify-between bg-card p-6"><FeatureIcon className="h-6 w-6 text-accent" /><p className="text-sm font-bold">{text as string}</p></div>;
              })}
            </div>
          </div>
        </section>

        <section id="szerzodes" className="border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-5 py-20 md:py-28 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Partneri együttműködés</p>
                <h2 className="mt-4 text-4xl font-bold md:text-6xl">A szerződés.<br />Pontosan ezt írod alá.</h2>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">Ez a teljes, nyilvános szerződéssablon (v1.1). A zárójeles mezők a KYC jóváhagyása után töltődnek ki a te adataiddal és az üzemeltető cégadataival. Az aláírt szerződés lezárul, SHA-256 hash-sel hitelesített, és módosíthatatlan marad.</p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Button className="rounded-none bg-accent px-6 text-xs font-bold uppercase tracking-[0.12em] text-accent-foreground hover:bg-accent/90" onClick={goToRegistration}>Regisztráció és aláírás <ArrowRight /></Button>
                  <p className="text-xs text-muted-foreground">Nem érsz el semmit rejtve – előbb olvasod, aztán írod alá.</p>
                </div>
              </div>
              <div className="border border-border bg-background">
                <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                  <FileSignature className="h-4 w-4 text-accent" />
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">Partneri szerződés · sablon v1.1</p>
                </div>
                <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-muted-foreground">{PARTNER_CONTRACT_TEMPLATE}</pre>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-accent bg-accent text-accent-foreground">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 md:flex-row md:items-center lg:px-8">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">Készen állsz?</p><h2 className="mt-2 text-3xl font-bold md:text-5xl">Béreld a teljes digitális rendszered egy helyről.</h2></div>
            <Button size="lg" className="h-14 rounded-none border border-accent-foreground bg-accent-foreground px-8 text-xs font-bold uppercase tracking-[0.14em] text-accent hover:bg-accent-foreground/90" onClick={goToRegistration}>Saját rendszer indítása <ArrowRight /></Button>
          </div>
        </section>
      </main>

      <footer className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 lg:px-8">
          <div><p className="font-heading text-sm font-bold uppercase tracking-[0.12em]">Egyszerű <span className="text-accent">de</span> Nagyszerű</p><p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">Bérelhető weboldal-, webshop-, CRM-, naptár-, marketing-, kommunikációs és AI rendszer vállalkozásoknak. Egy platform, egy adatmodell, egy igazság.</p></div>
          <nav className="flex flex-col gap-3 text-xs text-muted-foreground"><button onClick={scrollToModules} className="text-left hover:text-foreground">Képességek</button><button onClick={() => navigate("/partner-regisztracio")} className="text-left hover:text-foreground">Partner regisztráció</button><button onClick={() => navigate("/auth")} className="text-left hover:text-foreground">Belépés</button></nav>
          <nav className="flex flex-col gap-3 text-xs text-muted-foreground"><button onClick={() => navigate("/legal/adatvedelem")} className="text-left hover:text-foreground">Adatvédelem</button><button onClick={() => navigate("/legal/aszf")} className="text-left hover:text-foreground">Általános feltételek</button><button onClick={() => navigate("/contact")} className="text-left hover:text-foreground">Kapcsolat</button></nav>
        </div>
        <div className="border-t border-border px-5 py-5 text-center text-[10px] uppercase tracking-[0.16em] text-muted-foreground">© 2026 Egyszerű de Nagyszerű · Minden jog fenntartva</div>
      </footer>
    </div>
  );
};

export default Index;