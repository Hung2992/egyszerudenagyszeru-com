import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { huf, netPaid, type BusinessSnapshot } from "@/lib/empyrean-bi";
import { monthlyProfit } from "@/lib/empyrean-pnl";
import { effectiveAiCost, type AiBudget } from "@/lib/empyrean-ai-budget";

export default function EmpyreanPnl() {
  const [b, setB] = useState<AiBudget | null>(null);
  const [s, setS] = useState<BusinessSnapshot | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const day = new Date().getDate();
    void Promise.all([supabase.rpc("empyrean_ai_budget"), supabase.rpc("empyrean_business_snapshot", { _days: day })]).then(([a, c]) => {
      if (a.error || c.error) { setErr((a.error ?? c.error)!.message); return; }
      setB(a.data as unknown as AiBudget); setS(c.data as unknown as BusinessSnapshot);
    });
  }, []);
  if (err) return <p role="alert" className="text-sm text-destructive">{err}</p>;
  if (!b || !s) return null;
  const rev = netPaid(s.current);
  const ec = effectiveAiCost(b);
  const cost = ec.amount;
  const profit = monthlyProfit(rev, cost, ec.currency);
  const cells: [string, string, string][] = [
    ["Befolyt bevétel (nettó, e hónap)", huf(rev), `Visszatérítve: ${huf(s.current.refunded ?? 0)}`],
    ["AI-költség (e hónap)", cost == null ? "—" : `${cost.toLocaleString("hu-HU")} ${ec.currency}`, ec.source === "invoice" ? `Valós számla alapján (${b.invoice!.credits} kredit${b.invoice!.ref ? ` · ${b.invoice!.ref}` : ""})` : ec.source === "estimate" ? `Becslés: ${b.used.toFixed(4)} kredit × ${b.credit_price} ${b.credit_currency}` : "Nincs számla és kreditár"],
    ["Eredmény", profit == null ? "—" : huf(profit), profit == null ? (cost == null ? "Kreditár kell hozzá" : "Csak Ft-os kreditárnál számolható") : "Bevétel − AI-költség"],
  ];
  return (
    <section className="space-y-3 border border-border p-4" aria-labelledby="pnl">
      <h2 id="pnl" className="text-lg font-medium">Költség és bevétel (havi)</h2>
      <div className="grid gap-px bg-border border border-border sm:grid-cols-3">
        {cells.map(([l, v, h]) => (
          <div key={l} className="bg-background p-3"><p className="text-xs text-muted-foreground">{l}</p><p className={`text-xl ${l === "Eredmény" && profit != null && profit < 0 ? "text-destructive" : ""}`}>{v}</p><p className="text-xs text-muted-foreground">{h}</p></div>
        ))}
      </div>
    </section>
  );
}
