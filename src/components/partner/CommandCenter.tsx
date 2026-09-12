// Partner OS – parancsközpont: gyors navigációs kereső (Ctrl/Cmd + K) minden
// üzleti terület fölött. Az AI parancsmező külön komponens (PartnerCommandBar).
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, CornerDownLeft } from "lucide-react";
import { ALL_NAV_ITEMS } from "./partner-navigation";

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const CommandCenter = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const term = normalize(q.replace(/^\//, "").trim());
    if (!term) return [];
    return ALL_NAV_ITEMS.filter(
      (i) => normalize(i.label).includes(term) || normalize(i.groupLabel).includes(term) || normalize(i.tab).includes(term),
    ).slice(0, 8);
  }, [q]);

  const go = (tab: string) => { onNavigate(tab); setQ(""); setOpen(false); };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border border-foreground/15 px-3">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && results[0]) go(results[0].tab); }}
          placeholder="Keresés a rendszerben: rendelés, termék, webshop, pénzügy…"
          aria-label="Gyors keresés a Partner OS területei között"
          className="rounded-none border-0 focus-visible:ring-0 px-0 h-11"
        />
        <kbd className="hidden md:inline text-[10px] text-muted-foreground border border-foreground/15 px-1.5 py-0.5">⌘K</kbd>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-40 mt-1 w-full border border-foreground/15 bg-background shadow-lg">
          {results.map((r) => (
            <button
              key={r.tab}
              type="button"
              onClick={() => go(r.tab)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-foreground/5"
            >
              <span>{r.label}</span>
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {r.groupLabel} <CornerDownLeft className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommandCenter;
