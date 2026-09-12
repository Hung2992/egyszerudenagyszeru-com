import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface HealthDimension {
  key: string;
  label: string;
  score: number;
  reasons: string[];
  tab: string;
}

const toneFor = (score: number) =>
  score >= 85 ? "bg-emerald-500" : score >= 65 ? "bg-accent" : score >= 45 ? "bg-amber-500" : "bg-destructive";

const HealthMetric = ({ dim, onOpen }: { dim: HealthDimension; onOpen: (tab: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-foreground/10 last:border-b-0 py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="text-xs w-28 shrink-0 truncate">{dim.label}</span>
        <span className="flex-1 h-1.5 bg-foreground/10 overflow-hidden">
          <span className={`block h-full ${toneFor(dim.score)} transition-all duration-500`} style={{ width: `${dim.score}%` }} />
        </span>
        <span className="text-xs font-bold tabular-nums w-8 text-right">{dim.score}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pl-1 pt-2 space-y-1">
          {dim.reasons.map((r, i) => (
            <p key={i} className="text-[11px] text-muted-foreground">• {r}</p>
          ))}
          <button
            type="button"
            onClick={() => onOpen(dim.tab)}
            className="text-[11px] text-accent underline underline-offset-2"
          >
            Terület megnyitása
          </button>
        </div>
      )}
    </div>
  );
};

export default HealthMetric;
