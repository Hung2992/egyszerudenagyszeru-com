import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { aov, BusinessSnapshot, collectionRate, runRateForecast, delta, huf, METRIC_DEFINITIONS, pct } from "@/lib/empyrean-bi";

const WINDOWS = [7, 30, 90] as const;

export default function EmpyreanBusinessIntelligence() {
  const [days, setDays] = useState<number>(30);
  const [snap, setSnap] = useState<BusinessSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const { data, error: e } = await supabase.rpc("empyrean_business_snapshot", { _days: days });
    if (e) { setError(e.message); setSnap(null); } else setSnap(data as unknown as BusinessSnapshot);
    setLoading(false);
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  const c = snap?.current ?? {}; const p = snap?.previous ?? {};
  const rows = snap ? [
    { label: "Foglalt bevétel", value: huf(c.booked ?? 0), d: delta(c.booked ?? 0, p.booked ?? 0), def: METRIC_DEFINITIONS.booked },
    { label: "Befolyt bevétel", value: huf(c.paid ?? 0), d: delta(c.paid ?? 0, p.paid ?? 0), def: METRIC_DEFINITIONS.paid },
    { label: "Platform díj", value: huf(c.fee ?? 0), d: delta(c.fee ?? 0, p.fee ?? 0), def: METRIC_DEFINITIONS.fee },
    { label: "Átlagos kosárérték", value: huf(aov(c)), d: delta(aov(c), aov(p)), def: METRIC_DEFINITIONS.aov },
    { label: "Beszedési arány", value: pct(collectionRate(c)), d: null, def: METRIC_DEFINITIONS.collection },
    { label: "Rendelés", value: String(c.orders ?? 0), d: delta(c.orders ?? 0, p.orders ?? 0), def: "Nem sztornózott partnerrendelések száma." },
  ] : [];

  return (
    <section className="space-y-4" aria-labelledby="empyrean-bi">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="empyrean-bi" className="text-lg font-medium">Üzleti intelligencia</h2>
        <div className="flex gap-1" role="group" aria-label="Időablak">
          {WINDOWS.map((w) => (
            <Button key={w} size="sm" variant={days === w ? "secondary" : "ghost"} className="rounded-none" disabled={loading} onClick={() => setDays(w)}>{w} nap</Button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive border border-destructive p-3">UNKNOWN · {error}</p>}
      {snap && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 border border-border divide-x divide-y divide-border">
            {rows.map((r) => (
              <div key={r.label} className="p-4" title={r.def}>
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className="text-xl mt-1 break-words">{r.value}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.d === null ? "nincs összehasonlítási alap" : `${r.d >= 0 ? "+" : ""}${(r.d * 100).toFixed(0)}% vs. előző ${snap.window_days} nap`}
                </p>
              </div>
            ))}
          </div>
          <div className="border border-border p-4 text-sm space-y-1">
            <p className="text-xs text-muted-foreground">FORECAST · lineáris run-rate, következő 90 nap</p>
            {runRateForecast(c.booked ?? 0, snap.window_days, 90) === null
              ? <p className="text-muted-foreground">Nincs elég adat előrejelzéshez — nem becsülünk kitalált számot.</p>
              : <p>Foglalt: {huf(runRateForecast(c.booked ?? 0, snap.window_days, 90))} · Befolyt: {huf(runRateForecast(c.paid ?? 0, snap.window_days, 90))}</p>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border border border-border text-sm">
            {[
              ["Aktív partner", snap.active_partners], ["Publikált bolt", snap.published_storefronts],
              ["Aktív termék", snap.active_products], ["Alacsony készlet (≤3)", snap.low_stock_products],
              ["Átutalásra vár", c.awaiting_transfer ?? 0],
            ].map(([l, v]) => (
              <div key={String(l)} className="bg-background p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-lg">{v}</p></div>
            ))}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Top partnerek · foglalt bevétel</p>
            {snap.top_partners.length === 0 ? <p className="text-sm text-muted-foreground">Nincs rendelés ebben az időablakban.</p> : (
              <ul className="divide-y divide-border border-y border-border">
                {snap.top_partners.map((t) => (
                  <li key={t.partner_id} className="flex justify-between gap-2 py-2 text-sm"><span className="truncate">{t.name}</span><span className="shrink-0">{huf(t.booked)} · {t.orders} db</span></li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted-foreground">FACT · szerveroldali, csak adminnak · {new Date(snap.generated_at).toLocaleString("hu-HU")}</p>
        </>
      )}
    </section>
  );
}
