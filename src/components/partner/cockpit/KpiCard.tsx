import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface KpiMetric {
  key: string;
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
  previous: number | null;
  change_pct: number | null;
  comparable: boolean;
  drill_tab: string;
}

export const formatMetric = (m: { value: number; format: string }) => {
  if (m.format === "currency") return `${Math.round(m.value).toLocaleString("hu-HU")} Ft`;
  if (m.format === "percent") return `${m.value}%`;
  return m.value.toLocaleString("hu-HU");
};

const KpiCard = ({ metric, onDrill }: { metric: KpiMetric; onDrill: (tab: string) => void }) => {
  const up = (metric.change_pct ?? 0) > 0;
  const flat = (metric.change_pct ?? 0) === 0;
  const Icon = metric.change_pct === null ? Minus : up ? TrendingUp : flat ? Minus : TrendingDown;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onDrill(metric.drill_tab)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDrill(metric.drill_tab); } }}
      aria-label={`${metric.label}: ${formatMetric(metric)} – részletek megnyitása`}
      className="rounded-none border-foreground/15 p-4 cursor-pointer transition-colors hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
      <p className="mt-2 text-xl md:text-2xl font-bold tabular-nums">{formatMetric(metric)}</p>
      <p className={`mt-1 flex items-center gap-1 text-[11px] ${
        metric.change_pct === null ? "text-muted-foreground" : up ? "text-emerald-500" : flat ? "text-muted-foreground" : "text-destructive"
      }`}>
        <Icon className="h-3 w-3 shrink-0" />
        {metric.comparable && metric.change_pct !== null
          ? `${metric.change_pct > 0 ? "+" : ""}${metric.change_pct}% az előző 30 naphoz képest`
          : "Nincs elegendő korábbi adat"}
      </p>
    </Card>
  );
};

export default KpiCard;
