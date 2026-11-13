import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { agentScore, cacheHitRatio, costAnomalies, deliveryRate, recommendations, simulateRevenue, type OptSnapshot } from "@/lib/empyrean-optimization";

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const Tile = ({ l, v, warn }: { l: string; v: string | number; warn?: boolean }) => (
  <div className="bg-background p-3"><p className="text-xs text-muted-foreground">{l}</p><p className={`text-xl ${warn ? "text-destructive" : ""}`}>{v}</p></div>
);
const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2"><h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>{children}</div>
);

export default function EmpyreanOptimization() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<OptSnapshot | null>(null);
  const [error, setError] = useState("");
  const [sim, setSim] = useState({ visitors: 1000, conversion: 2, aov: 15000, visitorsPct: 0, conversionPct: 10, aovPct: 0 });
  const load = useCallback(async () => {
    setError("");
    const { data, error: e } = await supabase.rpc("empyrean_optimization_snapshot", { _days: days });
    if (e) setError(e.message); else setS(data as unknown as OptSnapshot);
  }, [days]);
  useEffect(() => { void load(); }, [load]);
  const recs = useMemo(() => (s ? recommendations(s) : []), [s]);
  const simR = simulateRevenue({ visitors: sim.visitors, conversion: sim.conversion / 100, aov: sim.aov }, sim);
  const totalCost = s?.ai_cost_by_function.reduce((t, f) => t + (f.cost ?? 0), 0) ?? 0;
  const num = (k: keyof typeof sim) => (
    <label className="text-xs text-muted-foreground space-y-1"><span>{({ visitors: "Látogató", conversion: "Konverzió %", aov: "Kosárérték Ft", visitorsPct: "Látogató Δ%", conversionPct: "Konverzió Δ%", aovPct: "Kosárérték Δ%" } as const)[k]}</span>
      <Input type="number" className="rounded-none h-9" value={sim[k]} onChange={(e) => setSim({ ...sim, [k]: Number(e.target.value) || 0 })} /></label>
  );

  return (
    <section className="space-y-5" aria-labelledby="empyrean-opt">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="empyrean-opt" className="text-lg font-medium">Folyamatos optimalizálás</h2>
        <div className="flex gap-1">{[7, 30, 90].map((d) => <Button key={d} size="sm" variant={days === d ? "secondary" : "ghost"} className="rounded-none" onClick={() => setDays(d)}>{d} nap</Button>)}</div>
      </div>
      <p className="text-xs text-muted-foreground">Csak elemzés és javaslat. Semmi nem változik jóváhagyás nélkül.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {s && (<>
        <Block title={`Javaslatok (${recs.length})`}>
          {recs.length === 0 ? <p className="text-sm text-muted-foreground">Nincs elég adat vagy nincs teendő.</p> : (
            <ul className="divide-y divide-border border border-border">{recs.map((r) => (
              <li key={r.id} className="p-3 text-sm flex gap-3"><span className={`text-xs uppercase w-14 shrink-0 ${r.severity === "high" ? "text-destructive" : r.severity === "medium" ? "text-primary" : "text-muted-foreground"}`}>{r.severity}</span>
                <div className="min-w-0"><p>{r.title}</p><p className="text-xs text-muted-foreground">{r.area} · {r.why} · KPI: {r.kpi}</p></div></li>))}</ul>)}
        </Block>
        <Block title="AI költség és gyorsítótár">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
            <Tile l="Összes kredit" v={totalCost.toFixed(2)} /><Tile l="Gyorsítótár-találat" v={pct(cacheHitRatio(s.cache))} />
            <Tile l="Élő cache bejegyzés" v={s.cache.live} /><Tile l="Költségcsúcs napok" v={costAnomalies(s.ai_cost_daily).length} warn={costAnomalies(s.ai_cost_daily).length > 0} />
          </div>
          {s.ai_cost_by_function.length > 0 && <ul className="text-xs divide-y divide-border border border-border">{s.ai_cost_by_function.slice(0, 6).map((f) => (
            <li key={f.fn} className="p-2 flex justify-between gap-2"><span className="truncate">{f.fn}</span><span className="shrink-0">{f.requests} kérés · {(f.cost ?? 0).toFixed(2)}</span></li>))}</ul>}
        </Block>
        <Block title="Ügynök-értékelés">
          {s.agents.length === 0 ? <p className="text-sm text-muted-foreground">Nincs ügynökfutás az időszakban.</p> : (
            <ul className="text-xs divide-y divide-border border border-border">{s.agents.map((a) => { const sc = agentScore(a); return (
              <li key={a.slug} className="p-2 flex justify-between gap-2"><span className="truncate">{a.slug}</span><span className={`shrink-0 ${sc != null && sc < 60 ? "text-destructive" : ""}`}>{sc ?? "—"}/100 · {a.runs} futás{a.credit_blocked ? ` · ${a.credit_blocked} keret-hiány` : ""} · {Math.round(a.avg_ms / 1000)} mp</span></li>); })}</ul>)}
          <p className="text-xs text-muted-foreground">AI visszajelzés: {s.feedback.count} db, átlag {s.feedback.avg_rating ?? "—"}, negatív {s.feedback.negative}</p>
        </Block>
        <Block title="Működés">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
            <Tile l="E-mail kézbesítés" v={pct(deliveryRate(s.email, ["sent", "delivered"], ["failed", "bounced", "dlq", "suppressed"]))} />
            <Tile l="Üzenet kézbesítés" v={pct(deliveryRate(s.messaging, ["sent", "delivered"], ["failed", "undelivered", "dead"]))} />
            <Tile l="Sikertelen fizetés" v={`${s.payments.failed}/${s.payments.total}`} warn={s.payments.failed > 0} />
            <Tile l="Átnézendő csalás (magas)" v={`${s.fraud.open} (${s.fraud.high_open})`} warn={s.fraud.high_open > 0} />
            <Tile l="Aktív termék" v={s.stock.active} /><Tile l="Elfogyott" v={s.stock.out} warn={s.stock.out > 0} />
            <Tile l="Alacsony készlet" v={s.stock.low} /><Tile l="30+ napja nem fogyott" v={s.stock.never_sold} />
          </div>
          {s.stock.low_items.length > 0 && <ul className="text-xs divide-y divide-border border border-border">{s.stock.low_items.map((p) => (
            <li key={p.id} className="p-2 flex justify-between gap-2"><span className="truncate">{p.title}</span><span className="shrink-0">{p.stock_qty} db · {p.sales_count ?? 0} eladva</span></li>))}</ul>}
        </Block>
        <Block title="Szimulátor (mi lenne, ha)">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{(["visitors", "conversion", "aov", "visitorsPct", "conversionPct", "aovPct"] as const).map((k) => <div key={k}>{num(k)}</div>)}</div>
          <div className="grid grid-cols-3 gap-px bg-border border border-border">
            <Tile l="Jelenlegi" v={`${simR.baseRevenue.toLocaleString("hu-HU")} Ft`} /><Tile l="Szimulált" v={`${simR.newRevenue.toLocaleString("hu-HU")} Ft`} />
            <Tile l="Különbség" v={`${simR.delta >= 0 ? "+" : ""}${simR.delta.toLocaleString("hu-HU")} Ft`} warn={simR.delta < 0} />
          </div>
        </Block>
      </>)}
    </section>
  );
}
