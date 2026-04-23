import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  Truck,
  RotateCcw,
  CreditCard,
  Ruler,
  Package,
  Shield,
  Gift,
  Star,
  Mail,
  Phone,
  MessageCircle,
  HelpCircle,
  ShoppingBag,
  User,
  AlertTriangle,
} from "lucide-react";

const QUICK_LINKS = [
  { icon: Truck, label: "Szállítás", path: "/shipping", desc: "Szállítási idők és díjak" },
  { icon: RotateCcw, label: "Visszaküldés", path: "/shipping", desc: "30 napos visszaküldés" },
  { icon: Ruler, label: "Mérettáblázat", path: "/size-guide", desc: "Találd meg a tökéletes méretet" },
  { icon: Package, label: "Rendeléseim", path: "/orders", desc: "Kövesd a csomagod" },
  { icon: User, label: "Profilom", path: "/profile", desc: "Adatok, címek, beállítások" },
  { icon: Gift, label: "Ajándékutalvány", path: "/gift-cards", desc: "Ajándékozz stílust" },
  { icon: Star, label: "Hűségprogram", path: "/loyalty", desc: "Pontok és kedvezmények" },
  { icon: Mail, label: "Kapcsolat", path: "/contact", desc: "Írj nekünk közvetlenül" },
];

const CATEGORIES = [
  {
    id: "orders",
    icon: ShoppingBag,
    title: "Rendelés és vásárlás",
    items: [
      {
        q: "Hogyan adhatok le rendelést?",
        a: "Válaszd ki a terméket, méretet és színt, tedd a kosárba, majd a Pénztár oldalon add meg a szállítási és fizetési adataidat. A rendelés véglegesítése után e-mailben visszaigazolást küldünk.",
      },
      {
        q: "Módosíthatom vagy lemondhatom a rendelésem?",
        a: "A feldolgozás megkezdéséig (általában 1-2 órán belül) lehetséges módosítás. Írj azonnal a info@egyszerudenagyszeru.hu címre a rendelésszámmal.",
      },
      {
        q: "Hol nézhetem meg a korábbi rendeléseimet?",
        a: "Bejelentkezés után a Profilom → Rendeléseim menüpontban minden korábbi rendelésed megtalálod, állapotukkal és számlájukkal együtt.",
      },
      {
        q: "Kapok számlát a vásárlásomról?",
        a: "Igen, automatikusan generálunk elektronikus számlát, amit e-mailben küldünk és a Rendeléseim oldalról is letölthető.",
      },
    ],
  },
  {
    id: "shipping",
    icon: Truck,
    title: "Szállítás",
    items: [
      {
        q: "Mennyi a szállítási idő?",
        a: "Magyarországon belül 1-3 munkanap. Csomagküldővel (GLS, Foxpost, MPL) szállítunk. Hétvégén feladott rendelések hétfőn indulnak.",
      },
      {
        q: "Mennyibe kerül a szállítás?",
        a: "15 000 Ft feletti rendelés esetén INGYENES! Az alatt 1490 Ft házhozszállítás, 990 Ft csomagautomata.",
      },
      {
        q: "Külföldre is szállítotok?",
        a: "Jelenleg Magyarországon belül szállítunk. Hamarosan bevezetjük az EU-s szállítást is.",
      },
      {
        q: "Hogyan követhetem a csomagomat?",
        a: "A feladás után e-mailben kapsz egy nyomkövetési kódot, amivel a futár oldalán követheted a csomagod útját. A Rendeléseim oldalon is megtalálod.",
      },
    ],
  },
  {
    id: "returns",
    icon: RotateCcw,
    title: "Visszaküldés és csere",
    items: [
      {
        q: "Hány napon belül küldhetem vissza a terméket?",
        a: "30 napod van a kézhezvételtől számítva, hogy meggondold magad. A termék legyen eredeti állapotú, címkével.",
      },
      {
        q: "Hogyan kezdeményezhetek visszaküldést?",
        a: "Bejelentkezés után a Rendeléseim oldalon kattints a Visszaküldés gombra a megfelelő rendelésnél. Kiválasztod az okot, és mi küldjük a címkét.",
      },
      {
        q: "Kicserélhetem másik méretre?",
        a: "Igen! A visszaküldési kérelemnél válaszd a Csere opciót, és add meg a kívánt méretet/színt. Ingyenes a csere.",
      },
      {
        q: "Mikor kapom vissza a pénzem?",
        a: "A visszaküldött termék beérkezése után 3-5 munkanapon belül visszautaljuk az eredeti fizetési módon.",
      },
    ],
  },
  {
    id: "payment",
    icon: CreditCard,
    title: "Fizetés",
    items: [
      {
        q: "Milyen fizetési módokat fogadtok el?",
        a: "Bankkártya (Visa, Mastercard), Apple Pay, Google Pay, banki átutalás és utánvét. Minden tranzakció biztonságos SSL titkosítással történik.",
      },
      {
        q: "Biztonságos a kártyás fizetés?",
        a: "Igen, a Stripe biztonságos fizetési rendszerét használjuk. A kártyaadataidat soha nem tároljuk, közvetlenül a banki rendszerben kezelődnek.",
      },
      {
        q: "Lehet részletre fizetni?",
        a: "Bizonyos összeg felett 2-3 részletes fizetés is elérhető a pénztárnál.",
      },
      {
        q: "Felhasználhatok kupont vagy ajándékutalványt?",
        a: "Igen, a pénztár oldalon van egy mező, ahova beírhatod a kuponkódot vagy az ajándékutalvány kódját.",
      },
    ],
  },
  {
    id: "products",
    icon: Ruler,
    title: "Termékek és méretek",
    items: [
      {
        q: "Honnan tudom, milyen méret a megfelelő?",
        a: "Minden termékoldalon találsz részletes mérettáblázatot. A Mérettáblázat oldalon általános útmutató is van. Bizonytalan? Az AI méretajánlónk segít!",
      },
      {
        q: "Milyen anyagból készülnek a ruháitok?",
        a: "Minden termékleírásban megtalálod a pontos anyagösszetételt. Prémium pamut, biopamut és tartós szintetikus keverékek a fő alapanyagaink.",
      },
      {
        q: "Hogyan mossam a ruhákat?",
        a: "Minden terméken belül találsz ápolási címkét. Általában 30°C-on, fonákjára fordítva mosható.",
      },
    ],
  },
  {
    id: "account",
    icon: User,
    title: "Fiók és belépés",
    items: [
      {
        q: "Kell regisztrálnom a vásárláshoz?",
        a: "Nem kötelező, vendégként is rendelhetsz. De regisztrálva könnyebben követed a rendeléseidet, gyűjtesz hűségpontokat és gyorsabban fizethetsz legközelebb.",
      },
      {
        q: "Elfelejtettem a jelszavam, mit tegyek?",
        a: "A bejelentkezés oldalon kattints az Elfelejtett jelszó linkre. E-mailben küldünk egy újrabeállító linket.",
      },
      {
        q: "Hogyan törölhetem a fiókomat?",
        a: "A Profil oldalon a beállításoknál kérhető a fiók törlése, vagy írj a info@egyszerudenagyszeru.hu címre.",
      },
    ],
  },
  {
    id: "loyalty",
    icon: Star,
    title: "Hűségprogram és kedvezmények",
    items: [
      {
        q: "Hogyan működik a hűségprogram?",
        a: "Minden 100 Ft elköltése után 1 pontot kapsz. A pontokat kedvezményekre, ingyenes szállításra vagy ajándékokra válthatod a Hűségprogram oldalon.",
      },
      {
        q: "Kapok-e születésnapi kedvezményt?",
        a: "Igen! A Profil oldalon megadott születésnapodon -15% kedvezményre jogosító kupont kapsz e-mailben.",
      },
      {
        q: "Hogyan használhatom az ajándékutalványt?",
        a: "A pénztárnál add meg a 16 jegyű kódot. Az összeg automatikusan levonódik a vásárlás végösszegéből.",
      },
    ],
  },
  {
    id: "security",
    icon: Shield,
    title: "Adatvédelem és biztonság",
    items: [
      {
        q: "Biztonságban vannak az adataim?",
        a: "Abszolút. SSL titkosítást, biztonságos adatbázis hozzáférést és GDPR-megfelelő adatkezelést alkalmazunk. Adataidat sosem adjuk át harmadik félnek marketing célból.",
      },
      {
        q: "Hogyan iratkozhatom le a hírlevélről?",
        a: "Minden hírlevelünk alján található egy Leiratkozás link, vagy a Profil → Beállítások menüben is kikapcsolhatod.",
      },
      {
        q: "Mit tegyek, ha gyanús e-mailt kaptam a nevetekben?",
        a: "Ne kattints a linkekre! Továbbítsd nekünk a info@egyszerudenagyszeru.hu címre, mi pedig azonnal megvizsgáljuk.",
      },
    ],
  },
];

const Help = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (i) =>
          i.q.toLowerCase().includes(q) ||
          i.a.toLowerCase().includes(q) ||
          cat.title.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  return (
    <Layout>
      {/* HERO */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 border border-border">
            <HelpCircle className="h-3 w-3 text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Segítség központ
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-foreground mb-4">
            Miben<span className="text-accent"> segíthetünk?</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-8">
            Találj választ a leggyakoribb kérdéseidre, vagy írj nekünk közvetlenül.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Keress a kérdések között..."
              className="pl-11 h-12 rounded-none border-border bg-background"
            />
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-6">
            Gyors elérés
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_LINKS.map(({ icon: Icon, label, path, desc }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="group border border-border p-4 text-left hover:border-accent hover:bg-accent/5 transition-all"
              >
                <Icon className="h-5 w-5 text-accent mb-3" />
                <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {label}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent mb-2">
              GYIK
            </p>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-foreground">
              Gyakori kérdések
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-border">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Nem találtunk találatot a keresésedre.
              </p>
              <Button onClick={() => navigate("/contact")} variant="outline" className="rounded-none">
                Írj nekünk
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {filtered.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                      <div className="h-9 w-9 flex items-center justify-center bg-accent/10 border border-accent/20">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                        {cat.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {cat.items.length} kérdés
                      </span>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                      {cat.items.map((item, idx) => (
                        <AccordionItem
                          key={idx}
                          value={`${cat.id}-${idx}`}
                          className="border-border"
                        >
                          <AccordionTrigger className="text-left text-sm font-medium hover:text-accent">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="border-t border-border bg-foreground text-background">
        <div className="mx-auto max-w-4xl px-4 py-12 md:py-16 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent mb-3">
            Még mindig kérdésed van?
          </p>
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-4">
            Itt vagyunk neked
          </h2>
          <p className="text-sm text-background/70 mb-8 max-w-md mx-auto">
            Csapatunk hétfőtől péntekig 9-17 óráig válaszol. Általában 2 órán belül.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
            <button
              onClick={() => navigate("/contact")}
              className="border border-background/20 p-5 hover:bg-background/10 transition-colors group"
            >
              <MessageCircle className="h-5 w-5 text-accent mx-auto mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider mb-1">Üzenet írása</p>
              <p className="text-[11px] text-background/60">Válaszadás 2 órán belül</p>
            </button>
            <a
              href="mailto:info@egyszerudenagyszeru.hu"
              className="border border-background/20 p-5 hover:bg-background/10 transition-colors"
            >
              <Mail className="h-5 w-5 text-accent mx-auto mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider mb-1">E-mail</p>
              <p className="text-[11px] text-background/60 break-all">
                info@egyszerudenagyszeru.hu
              </p>
            </a>
            <a
              href="tel:+36707079985"
              className="border border-background/20 p-5 hover:bg-background/10 transition-colors"
            >
              <Phone className="h-5 w-5 text-accent mx-auto mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider mb-1">Telefon</p>
              <p className="text-[11px] text-background/60">+36 70 707 9985</p>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Help;
