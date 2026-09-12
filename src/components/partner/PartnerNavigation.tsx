// Partner OS – asztali csoportos navigáció + breadcrumb + legutóbbiak.
import { NAV_GROUPS, groupForTab, labelForTab } from "./partner-navigation";

interface Props {
  tab: string;
  onNavigate: (tab: string) => void;
  recent: string[];
}

const PartnerNavigation = ({ tab, onNavigate, recent }: Props) => {
  const activeGroupKey = groupForTab(tab);
  const activeGroup = NAV_GROUPS.find((g) => g.key === activeGroupKey) ?? NAV_GROUPS[0];

  return (
    <nav aria-label="Partner OS navigáció" className="hidden md:block space-y-3">
      <div className="flex flex-wrap gap-1 border-b border-foreground/10 pb-2">
        {NAV_GROUPS.map((g) => {
          const active = g.key === activeGroupKey;
          const Icon = g.icon;
          return (
            <button
              key={g.key}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(g.items[0].tab)}
              className={`flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {g.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {activeGroup.items.map((i) => {
          const active = i.tab === tab;
          return (
            <button
              key={i.tab}
              type="button"
              title={i.description}
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(i.tab)}
              className={`px-3 py-1.5 text-xs border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active ? "border-accent text-accent" : "border-foreground/15 text-muted-foreground hover:text-foreground"
              }`}
            >
              {i.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-muted-foreground">
          {activeGroup.label} <span className="mx-1">/</span> <span className="text-foreground">{labelForTab(tab)}</span>
        </p>
        {recent.length > 0 && (
          <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
            Legutóbbiak:
            {recent.map((r) => (
              <button key={r} type="button" onClick={() => onNavigate(r)} className="underline underline-offset-2 hover:text-accent">
                {labelForTab(r)}
              </button>
            ))}
          </p>
        )}
      </div>
    </nav>
  );
};

export default PartnerNavigation;
