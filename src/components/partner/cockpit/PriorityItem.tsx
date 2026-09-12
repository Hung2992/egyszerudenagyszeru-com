import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export type PriorityLevel = "critical" | "high" | "opportunity" | "optimization" | "positive";

export interface Priority {
  id: string;
  level: PriorityLevel;
  title: string;
  explanation: string;
  source: string;
  cta_label: string;
  cta_tab: string;
}

const LEVELS: Record<PriorityLevel, { label: string; dot: string; border: string }> = {
  critical: { label: "Kritikus", dot: "bg-destructive", border: "border-l-destructive" },
  high: { label: "Magas", dot: "bg-amber-500", border: "border-l-amber-500" },
  opportunity: { label: "Lehetőség", dot: "bg-accent", border: "border-l-accent" },
  optimization: { label: "Optimalizálás", dot: "bg-sky-500", border: "border-l-sky-500" },
  positive: { label: "Pozitív", dot: "bg-emerald-500", border: "border-l-emerald-500" },
};

const PriorityItem = ({ item, onOpen }: { item: Priority; onOpen: (tab: string) => void }) => {
  const meta = LEVELS[item.level] ?? LEVELS.optimization;
  return (
    <div className={`border-l-2 ${meta.border} bg-foreground/[0.02] px-4 py-3 space-y-2`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{meta.label} · {item.source}</span>
      </div>
      <p className="text-sm font-semibold leading-snug">{item.title}</p>
      {item.explanation && <p className="text-xs text-muted-foreground leading-relaxed">{item.explanation}</p>}
      <Button size="sm" variant="outline" className="rounded-none h-8 text-xs" onClick={() => onOpen(item.cta_tab)}>
        {item.cta_label} <ArrowRight className="h-3 w-3 ml-1.5" />
      </Button>
    </div>
  );
};

export default PriorityItem;
