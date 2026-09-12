import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, AlertTriangle, Lightbulb, AlertCircle, Star, Loader2 } from "lucide-react";

export interface Briefing {
  available: boolean;
  summary?: string;
  positive?: string;
  problem?: string;
  opportunity?: string;
  warning?: string;
  priority?: string;
  error?: string;
}

const CARDS = [
  { key: "positive", label: "Pozitívum", Icon: CheckCircle2, tone: "text-emerald-500" },
  { key: "problem", label: "Probléma", Icon: AlertCircle, tone: "text-destructive" },
  { key: "opportunity", label: "Lehetőség", Icon: Lightbulb, tone: "text-accent" },
  { key: "warning", label: "Figyelmeztetés", Icon: AlertTriangle, tone: "text-amber-500" },
  { key: "priority", label: "Prioritás", Icon: Star, tone: "text-sky-500" },
] as const;

const DailyBriefing = ({ briefing, loading }: { briefing: Briefing | null; loading: boolean }) => {
  const [open, setOpen] = useState(false);

  return (
    <Card className="rounded-none border-foreground/15 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Mai üzleti jelentés</p>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Az AI most értelmezi az üzleti adataidat…
        </p>
      )}

      {!loading && briefing && !briefing.available && (
        <p className="text-sm text-muted-foreground">{briefing.error || "Az AI jelentés most nem érhető el. Az üzleti adatok elérhetők."}</p>
      )}

      {!loading && briefing?.available && (
        <>
          <p className="text-sm leading-relaxed">{briefing.summary}</p>
          <Button variant="ghost" size="sm" className="rounded-none h-7 text-[11px] px-0" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "Kevesebb" : "Részletek"}
          </Button>
          {open && (
            <div className="grid gap-2 sm:grid-cols-2">
              {CARDS.map(({ key, label, Icon, tone }) => {
                const text = (briefing as unknown as Record<string, unknown>)[key];
                if (!text || typeof text !== "string") return null;
                return (
                  <div key={key} className="border border-foreground/10 p-3 space-y-1">
                    <p className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] ${tone}`}>
                      <Icon className="h-3 w-3" /> {label}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default DailyBriefing;
