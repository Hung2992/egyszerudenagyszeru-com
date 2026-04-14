import Layout from "@/components/Layout";
import { Truck, RotateCcw, Clock, Package, MapPin, AlertCircle } from "lucide-react";

const SHIPPING_INFO = [
  {
    icon: Truck,
    title: "Szállítási módok",
    items: [
      { label: "GLS futárszolgálat", detail: "1-3 munkanap", price: "1 490 Ft" },
      { label: "GLS csomagpont", detail: "2-4 munkanap", price: "990 Ft" },
      { label: "MPL Posta", detail: "3-5 munkanap", price: "1 290 Ft" },
      { label: "Személyes átvétel", detail: "Budapest, belváros", price: "Ingyenes" },
    ],
  },
  {
    icon: Package,
    title: "Ingyenes szállítás",
    items: [
      { label: "15 000 Ft feletti rendelés", detail: "Automatikusan alkalmazva", price: "0 Ft" },
    ],
  },
];

const RETURN_STEPS = [
  { step: "1", title: "Jelezd a szándékod", desc: "Írj nekünk emailt vagy használd a kapcsolat űrlapot 14 napon belül." },
  { step: "2", title: "Csomagold be", desc: "Az eredeti csomagolásban, viselet nyomok nélkül, címkékkel együtt." },
  { step: "3", title: "Küldd vissza", desc: "A kapott visszaküldési címkével add fel a csomagot." },
  { step: "4", title: "Visszatérítés", desc: "A csomag beérkezése után 3-5 munkanapon belül visszautaljuk az összeget." },
];

const Shipping = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Információ</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">
            Szállítás & Visszaküldés
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-lg">
            Gyors és megbízható kiszállítás egész Magyarországon. Ha nem vagy elégedett, 14 napon belül kérdés nélkül visszaküldheted.
          </p>
        </div>

        {/* Shipping */}
        <div className="space-y-8 mb-14">
          {SHIPPING_INFO.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-4">
                <section.icon className="h-4 w-4 text-accent" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">{section.title}</h2>
              </div>
              <div className="border border-border bg-card divide-y divide-border">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                    </div>
                    <span className="text-sm font-bold text-accent">{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Delivery info */}
        <div className="border border-border bg-card p-5 mb-14">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Kiszállítási idő</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Munkanapokon 14:00 előtt leadott rendelések <strong className="text-foreground">aznap feladásra</strong> kerülnek.</p>
            <p>• Hétvégén és ünnepnapokon leadott rendelések a következő munkanapon kerülnek feladásra.</p>
            <p>• Nyomon követheted a csomagodat az email-ben kapott tracking linkkel.</p>
          </div>
        </div>

        {/* Returns */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <RotateCcw className="h-4 w-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Visszaküldés menete</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RETURN_STEPS.map((s) => (
              <div key={s.step} className="border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center bg-accent text-accent-foreground text-xs font-bold">
                    {s.step}
                  </span>
                  <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="border border-accent/30 bg-accent/5 p-5 flex gap-3">
          <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">Fontos</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Visszaküldés esetén a terméknek eredeti állapotban, címkékkel ellátva kell lennie. A visszaszállítás költsége a vásárlót terheli, kivéve hibás vagy téves termék esetén.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Shipping;
