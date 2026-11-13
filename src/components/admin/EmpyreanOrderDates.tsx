import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { huf } from "@/lib/empyrean-bi";

type Row = { id: string; order_number: string; total_huf: number; shipping_huf: number; shipped: string; delivered: string; paid: string };
const d = (v: string | null) => (v ? v.slice(0, 10) : "");

export default function EmpyreanOrderDates() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("partner_orders").select("id,order_number,total_huf,shipping_huf,shipped_at,delivered_at,paid_at").order("created_at", { ascending: false }).limit(50);
    if (error) { setMsg(error.message); return; }
    setRows((data ?? []).map((o) => ({ id: o.id, order_number: o.order_number, total_huf: Number(o.total_huf), shipping_huf: Number(o.shipping_huf), shipped: d(o.shipped_at), delivered: d(o.delivered_at), paid: d(o.paid_at) })));
  }, []);
  useEffect(() => { void load(); }, [load]);
  const set = (id: string, k: "shipped" | "delivered" | "paid", v: string) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const save = async (r: Row) => {
    setMsg("");
    const { error } = await supabase.rpc("empyrean_set_order_dates", { _order_id: r.id, _shipped: r.shipped || null, _delivered: r.delivered || null, _paid: r.paid || null } as never);
    setMsg(error ? `${r.order_number}: ${error.message === "invalid dates" ? "hibás dátum (átvétel nem lehet feladás előtt, jövőbeli nap nem adható)" : error.message}` : `${r.order_number}: mentve, naplózva.`);
    await load();
  };
  return (
    <section className="space-y-3 border border-border p-4" aria-labelledby="order-dates">
      <h2 id="order-dates" className="text-lg font-medium">Rendelések: feladás, átvétel, kifizetés</h2>
      <p className="text-xs text-muted-foreground">Itt írd be a valós dátumokat. Mentés után az Üzleti intelligencia (szállítási kártyák, befolyt bevétel) és a profitkártya ebből számol.</p>
      <ul className="divide-y divide-border border border-border">{rows.map((r) => (
        <li key={r.id} className="p-2 grid gap-2 sm:grid-cols-[1fr_repeat(3,9.5rem)_auto] items-end text-sm">
          <span className="min-w-0"><strong className="block truncate">{r.order_number}</strong><span className="text-xs text-muted-foreground">{huf(r.total_huf)} · szállítás {huf(r.shipping_huf)}</span></span>
          {(["shipped", "delivered", "paid"] as const).map((k) => (
            <label key={k} className="text-xs text-muted-foreground space-y-1"><span>{k === "shipped" ? "Feladva" : k === "delivered" ? "Átvéve" : "Kifizetve"}</span>
              <Input type="date" className="rounded-none h-9" value={r[k]} onChange={(e) => set(r.id, k, e.target.value)} /></label>))}
          <Button size="sm" className="rounded-none h-9" onClick={() => save(r)}>Mentés</Button>
        </li>))}</ul>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </section>
  );
}
