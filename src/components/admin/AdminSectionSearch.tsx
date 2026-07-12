import { useEffect, useMemo, useState } from "react";
import { Search, Command as CommandIcon, X, Star } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface SectionTab {
  key: string;
  label: string;
  icon: any;
}

interface Props {
  tabs: SectionTab[];
  currentKey: string;
  onSelect: (key: string) => void;
}

const STORAGE_KEY = "admin_section_search_recents_v1";
const PIN_KEY = "admin_section_search_pins_v1";

// Bővített kulcsszavak a kereséshez (kulcs -> keresési szinonimák)
const KEYWORD_MAP: Record<string, string[]> = {
  dashboard: ["áttekintés", "kezdő", "home", "összesítés", "kpi"],
  products: ["termék", "katalógus", "árucikk", "shop"],
  orders: ["rendelés", "vásárlás", "order", "megrendelés"],
  coupons: ["kupon", "kedvezmény", "code", "voucher"],
  users: ["felhasználó", "vevő", "ügyfél", "customer", "user"],
  reviews: ["vélemény", "értékelés", "review", "csillag"],
  shipping_mgmt: ["szállítás", "futár", "kézbesítés", "logisztika"],
  inventory: ["készlet", "raktár", "stock"],
  seo_marketing: ["seo", "marketing", "google", "kereső"],
  ai_marketing_studio: ["ai", "mesterséges", "stúdió", "reklám", "videó", "kreatív"],
  visual_search: ["vizuális", "kép", "fotó", "keresés", "camera", "visual", "photo", "search"],
  fb_studio: ["facebook", "meta", "fb"],
  ig_studio: ["instagram", "ig", "reel"],
  tt_studio: ["tiktok", "tt"],
  yt_studio: ["youtube", "yt", "video"],
  gads_studio: ["google ads", "adwords", "ppc", "hirdetés"],
  ai_bookkeeper: ["könyvelő", "ai", "számla", "költség"],
  accounting: ["könyvelés", "számvitel", "pénzügy"],
  tax_invoice: ["adó", "áfa", "számla", "nav", "invoice"],
  legal_center: ["jogi", "gdpr", "ászf", "cookie", "elállás"],
  gdpr: ["gdpr", "adatvédelem"],
  partners: ["partner", "affiliate", "márka"],
  partner_contracts: ["szerződés", "partner"],
  settings: ["beállítás", "config", "options"],
  email_templates: ["email", "levél", "sablon", "mail"],
  email_automation: ["email", "automatizáció", "trigger"],
  payment_methods: ["fizetés", "kártya", "stripe", "payment"],
  payment_integrations: ["fizetés", "stripe", "gateway"],
  financial_center: ["pénzügy", "banki", "kifizetés"],
  loyalty_tiers: ["hűség", "vip", "szint"],
  loyalty_dashboard: ["hűség", "pont"],
  giveaway_wheel: ["nyereményjáték", "sorsolás", "kerék"],
};

export default function AdminSectionSearch({ tabs, currentKey, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [pins, setPins] = useState<string[]>([]);

  useEffect(() => {
    try {
      setRecents(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
      setPins(JSON.parse(localStorage.getItem(PIN_KEY) || "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const select = (key: string) => {
    onSelect(key);
    setOpen(false);
    setQ("");
    const next = [key, ...recents.filter((r) => r !== key)].slice(0, 8);
    setRecents(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const togglePin = (key: string) => {
    const next = pins.includes(key) ? pins.filter((p) => p !== key) : [...pins, key].slice(0, 12);
    setPins(next);
    localStorage.setItem(PIN_KEY, JSON.stringify(next));
  };

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    if (!q.trim()) return [];
    const nq = norm(q.trim());
    return tabs
      .map((t) => {
        const hay = [t.label, t.key, ...(KEYWORD_MAP[t.key] || [])].map(norm).join(" ");
        let score = 0;
        if (norm(t.label).startsWith(nq)) score += 100;
        if (hay.includes(nq)) score += 50;
        // fuzzy: minden karakter sorrendben szerepeljen
        let i = 0;
        for (const ch of hay) {
          if (ch === nq[i]) i++;
          if (i === nq.length) break;
        }
        if (i === nq.length) score += 10;
        return { t, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((x) => x.t);
  }, [q, tabs]);

  const recentTabs = recents.map((k) => tabs.find((t) => t.key === k)).filter(Boolean) as SectionTab[];
  const pinTabs = pins.map((k) => tabs.find((t) => t.key === k)).filter(Boolean) as SectionTab[];

  return (
    <div className="border border-border bg-card">
      {/* Kereső sáv */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Keresés admin szekciók között… (pl. ‘rendelés’, ‘seo’, ‘fizetés’)"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => setOpen(true)}
          className="hidden sm:flex items-center gap-1 border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted"
          title="Parancspaletta"
        >
          <CommandIcon className="h-3 w-3" /> K
        </button>
      </div>

      {/* Talált találatok grid */}
      {q.trim() && (
        <div className="p-3">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nincs találat „{q}”-re.</p>
          ) : (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {filtered.length} találat
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {filtered.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => select(t.key)}
                    className={`group flex items-center gap-2 border px-3 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${
                      currentKey === t.key
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background hover:border-accent hover:text-accent"
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Pinek + Recents (csak ha nincs aktív keresés) */}
      {!q.trim() && (pinTabs.length > 0 || recentTabs.length > 0) && (
        <div className="p-3 space-y-3">
          {pinTabs.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" /> Kedvencek
              </div>
              <div className="flex flex-wrap gap-2">
                {pinTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => select(t.key)}
                    className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-xs ${
                      currentKey === t.key
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background hover:border-accent"
                    }`}
                  >
                    <t.icon className="h-3 w-3" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {recentTabs.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Legutóbbi
              </div>
              <div className="flex flex-wrap gap-2">
                {recentTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => select(t.key)}
                    className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-xs hover:border-accent"
                  >
                    <t.icon className="h-3 w-3" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parancspaletta (Ctrl+K) */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Ugrás szekcióhoz…" />
        <CommandList>
          <CommandEmpty>Nincs találat.</CommandEmpty>
          {pinTabs.length > 0 && (
            <CommandGroup heading="Kedvencek">
              {pinTabs.map((t) => (
                <CommandItem key={`pin-${t.key}`} onSelect={() => select(t.key)} value={`pin ${t.label} ${t.key}`}>
                  <t.icon className="h-4 w-4 mr-2" /> {t.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Összes szekció">
            {tabs.map((t) => (
              <CommandItem
                key={t.key}
                value={`${t.label} ${t.key} ${(KEYWORD_MAP[t.key] || []).join(" ")}`}
                onSelect={() => select(t.key)}
              >
                <t.icon className="h-4 w-4 mr-2" />
                <span className="flex-1">{t.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(t.key);
                  }}
                  className="text-muted-foreground hover:text-accent"
                  title={pins.includes(t.key) ? "Eltávolítás a kedvencekből" : "Hozzáadás a kedvencekhez"}
                >
                  <Star className={`h-3.5 w-3.5 ${pins.includes(t.key) ? "fill-accent text-accent" : ""}`} />
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
