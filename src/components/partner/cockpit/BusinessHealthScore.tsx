import { Card } from "@/components/ui/card";
import HealthMetric, { type HealthDimension } from "./HealthMetric";

interface Props {
  score: number;
  dimensions: HealthDimension[];
  onOpen: (tab: string) => void;
}

const ring = (score: number) =>
  score >= 85 ? "text-emerald-500" : score >= 65 ? "text-accent" : score >= 45 ? "text-amber-500" : "text-destructive";

const BusinessHealthScore = ({ score, dimensions, onOpen }: Props) => {
  const circumference = 2 * Math.PI * 42;
  return (
    <Card className="rounded-none border-foreground/15 p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Üzleti egészség</p>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6" className="stroke-foreground/10" />
            <circle
              cx="50" cy="50" r="42" fill="none" strokeWidth="6" strokeLinecap="butt"
              className={`${ring(score)} transition-all duration-700`}
              stroke="currentColor"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - score / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{score}</span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {score >= 85 ? "Az üzlet erősen teljesít" : score >= 65 ? "Az üzlet stabilan működik" : score >= 45 ? "Több terület figyelmet igényel" : "Az üzlet több ponton beavatkozást igényel"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Hét terület pontszámából. Kattints egy sorra a magyarázatért.
          </p>
        </div>
      </div>
      <div className="mt-4">
        {dimensions.map((d) => <HealthMetric key={d.key} dim={d} onOpen={onOpen} />)}
      </div>
    </Card>
  );
};

export default BusinessHealthScore;
