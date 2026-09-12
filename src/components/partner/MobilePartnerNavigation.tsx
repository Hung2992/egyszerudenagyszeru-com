// Partner OS – mobil alsó parancssáv + "Több" panel.
import { useState } from "react";
import { NAV_GROUPS, MOBILE_PRIMARY, QUICK_ACTIONS } from "./partner-navigation";
import { Home, ShoppingCart, Sparkles, Globe, Menu, X, Plus } from "lucide-react";

const ICONS: Record<string, typeof Home> = { cockpit: Home, orders: ShoppingCart, advisor: Sparkles, storefront: Globe };

const MobilePartnerNavigation = ({ tab, onNavigate }: { tab: string; onNavigate: (tab: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(false);

  const go = (t: string) => { onNavigate(t); setOpen(false); setQuick(false); };

  return (
    <>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
            <p className="text-sm font-bold uppercase tracking-[0.2em]">Minden terület</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Bezárás"><X className="h-5 w-5" /></button>
          </div>
          <div className="px-4 py-4 space-y-5 pb-28">
            {NAV_GROUPS.map((g) => (
              <div key={g.key}>
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  <g.icon className="h-3.5 w-3.5" /> {g.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((i) => (
                    <button
                      key={i.tab}
                      type="button"
                      onClick={() => go(i.tab)}
                      className={`border px-3 py-3 text-left text-xs ${i.tab === tab ? "border-accent text-accent" : "border-foreground/15"}`}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {quick && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end" onClick={() => setQuick(false)}>
          <div className="w-full border-t border-foreground/15 bg-background p-4 space-y-2 pb-24" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Gyors művelet</p>
            {QUICK_ACTIONS.map((a) => (
              <button key={a.tab} type="button" onClick={() => go(a.tab)} className="w-full border border-foreground/15 px-3 py-3 text-left text-sm">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-foreground/15 bg-background/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {MOBILE_PRIMARY.map((m) => {
            const Icon = ICONS[m.tab] ?? Home;
            const active = m.tab === tab;
            return (
              <button
                key={m.tab}
                type="button"
                onClick={() => go(m.tab)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${active ? "text-accent" : "text-muted-foreground"}`}
              >
                <Icon className="h-4 w-4" /> {m.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Több terület"
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${open || !MOBILE_PRIMARY.some((m) => m.tab === tab) ? "text-accent" : "text-muted-foreground"}`}
          >
            <Menu className="h-4 w-4" /> Több
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setQuick(true)}
        aria-label="Gyors művelet"
        className="md:hidden fixed bottom-16 right-4 z-40 h-12 w-12 bg-accent text-accent-foreground flex items-center justify-center shadow-lg"
      >
        <Plus className="h-5 w-5" />
      </button>
    </>
  );
};

export default MobilePartnerNavigation;
