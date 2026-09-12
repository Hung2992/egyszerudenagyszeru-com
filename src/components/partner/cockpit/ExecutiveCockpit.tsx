// Partner OS – Executive Cockpit: KPI-k, üzleti egészség, napi AI jelentés,
// prioritások, rendszerállapot és üzleti események egy képernyőn.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import KpiCard, { type KpiMetric } from "./KpiCard";
import BusinessHealthScore from "./BusinessHealthScore";
import type { HealthDimension } from "./HealthMetric";
import DailyBriefing, { type Briefing } from "./DailyBriefing";
import PriorityList from "./PriorityList";
import type { Priority } from "./PriorityItem";
import { QUICK_ACTIONS } from "../partner-navigation";

interface Pulse {
  generated_at: string;
  metrics: KpiMetric[];
  health: { score: number; dimensions: HealthDimension[] };
  priorities: Priority[];
  events: { at: string; type: string; text: string }[];
  system_status: { key: string; label: string; state: "ok" | "attention" | "error"; note: string; tab: string }[];
  setup: { key: string; label: string; done: boolean; tab: string }[];
  briefing: Briefing;
  partner: { id: string; name: string };
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 10) return "Jó reggelt";
  if (h < 18) return "Szép napot";
  return "Jó estét";
};

const STATE_DOT: Record<string, string> = { ok: "bg-emerald-500", attention: "bg-amber-500", error: "bg-destructive" };

const ExecutiveCockpit = ({ partnerId, partnerName, onNavigate }: { partnerId: string; partnerName: string; onNavigate: (tab: string) => void }) => {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("partner-business-pulse", {
        body: { partner_id: partnerId },
      });
      if (err) throw new Error(err.message);
      if (data?.error) throw new Error(String(data.error));
      setPulse(data as Pulse);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("not_partner") ? "Ehhez a partnerfiókhoz nincs jogosultságod."
        : msg.includes("unauthorized") ? "Jelentkezz be újra."
        : "Az üzleti adatok most nem tölthetők be.",
      );
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const openSetup = pulse?.setup.filter((s) => !s.done) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">{greeting()}, {partnerName}!</h2>
          <p className="text-xs text-muted-foreground">
            Így teljesít az üzleted az elmúlt 30 napban
            {pulse?.generated_at && ` · Frissítve: ${new Date(pulse.generated_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-none" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Frissítés
        </Button>
      </div>

      {error && (
        <Card className="rounded-none border-destructive/40 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="text-sm">{error}</p>
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => void load()}>Újrapróbálás</Button>
          </div>
        </Card>
      )}

      {loading && !pulse && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 border border-foreground/10 animate-pulse bg-foreground/[0.03]" />
          ))}
        </div>
      )}

      {pulse && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {pulse.metrics.map((m) => <KpiCard key={m.key} metric={m} onDrill={onNavigate} />)}
          </div>

          {openSetup.length > 0 && (
            <Card className="rounded-none border-accent/40 p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Üzletindítási állapot</p>
              <p className="text-sm">{pulse.setup.length - openSetup.length} / {pulse.setup.length} lépés kész</p>
              <div className="flex flex-wrap gap-2">
                {openSetup.map((s) => (
                  <Button key={s.key} size="sm" variant="outline" className="rounded-none h-8 text-xs" onClick={() => onNavigate(s.tab)}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <DailyBriefing briefing={pulse.briefing} loading={false} />
              <PriorityList items={pulse.priorities} onOpen={onNavigate} />
            </div>
            <div className="space-y-4">
              <BusinessHealthScore score={pulse.health.score} dimensions={pulse.health.dimensions} onOpen={onNavigate} />

              <Card className="rounded-none border-foreground/15 p-5 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rendszerállapot</p>
                {pulse.system_status.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onNavigate(s.tab)}
                    className="w-full flex items-center gap-2 py-1 text-left text-xs hover:text-accent"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATE_DOT[s.state]}`} aria-hidden="true" />
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground truncate">— {s.note}</span>
                  </button>
                ))}
              </Card>

              <Card className="rounded-none border-foreground/15 p-5 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Üzleti események</p>
                {pulse.events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Az elmúlt 30 napban nem érkezett rendelés.</p>
                ) : pulse.events.map((e, i) => (
                  <div key={i} className="flex gap-3 text-xs py-1 border-b border-foreground/5 last:border-b-0">
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {new Date(e.at).toLocaleString("hu-HU", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="truncate">{e.text}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>

          <Card className="rounded-none border-foreground/15 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Gyors műveletek</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((a) => (
                <Button key={a.tab} size="sm" variant="outline" className="rounded-none h-8 text-xs" onClick={() => onNavigate(a.tab)}>
                  {a.label}
                </Button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ExecutiveCockpit;
