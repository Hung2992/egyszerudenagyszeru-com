import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { huf } from "@/lib/empyrean-bi";
import { RETURN_STATUS_LABELS, nextReturnActions, type ReturnStatus } from "@/lib/empyrean-returns";

type Ret = { id: string; order_id: string; reason: string; amount_huf: number; status: ReturnStatus; decision_note: string | null; created_at: string };
type Ord = { id: string; order_number: string | null; total_huf: number; status: string };

export default function EmpyreanReturns() {
  const [rows, setRows] = useState<Ret[]>([]);
  const [orders, setOrders] = useState<Ord[]>([]);
  const [form, setForm] = useState({ order: "", reason: "", amount: "" });
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [r, o] = await Promise.all([
      supabase.from("partner_order_returns").select("id,order_id,reason,amount_huf,status,decision_note,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("partner_orders").select("id,order_number,total_huf,status").order("created_at", { ascending: false }).limit(50),
    ]);
    if (r.error) setMsg(r.error.message);
    setRows((r.data ?? []) as Ret[]); setOrders((o.data ?? []) as Ord[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const num = (id: string) => orders.find((o) => o.id === id)?.order_number ?? id.slice(0, 8);
  const request = async () => {
    setMsg("");
    const { error } = await supabase.rpc("empyrean_request_return", { _order_id: form.order, _reason: form.reason, _amount: Number(form.amount) });
    if (error) setMsg(error.message); else { setMsg("Visszaküldési kérés rögzítve, jóváhagyásra vár."); setForm({ order: "", reason: "", amount: "" }); await load(); }
  };
  const act = async (id: string, action: string) => {
    setMsg("");
    const { error } = await supabase.rpc("empyrean_decide_return", { _return_id: id, _action: action, _note: null });
    if (error) setMsg(error.message); else { setMsg("Mentve, naplózva."); await load(); }
  };
  const label: Record<string, string> = { approve: "Jóváhagyás", reject: "Elutasítás", refund: "Visszatérítve" };
  return (
    <section className="space-y-3 border border-border p-4" aria-labelledby="returns">
      <h2 id="returns" className="text-lg font-medium">Visszaküldések (kérés → jóváhagyás → visszatérítés)</h2>
      <p className="text-xs text-muted-foreground">A visszatérített összeg az Üzleti intelligenciában levonódik a befolyt bevételből. Minden lépés naplózott.</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem_auto] items-end">
        <select aria-label="Rendelés" className="h-9 border border-input bg-background px-2 text-sm" value={form.order}
          onChange={(e) => { const o = orders.find((x) => x.id === e.target.value); setForm({ ...form, order: e.target.value, amount: o ? String(o.total_huf) : "" }); }}>
          <option value="">Rendelés…</option>
          {orders.map((o) => <option key={o.id} value={o.id}>{o.order_number ?? o.id.slice(0, 8)} · {huf(o.total_huf)}</option>)}
        </select>
        <Input aria-label="Ok" placeholder="Ok (pl. sérült termék)" className="rounded-none h-9" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <Input aria-label="Összeg" type="number" min={0} className="rounded-none h-9" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Button size="sm" className="rounded-none h-9" disabled={!form.order || form.reason.length < 3} onClick={request}>Kérés</Button>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Nincs visszaküldés.</p> :
        <ul className="divide-y divide-border border border-border text-sm">{rows.map((r) => (
          <li key={r.id} className="p-2 flex flex-wrap items-center gap-2 justify-between">
            <span className="min-w-0"><strong>{num(r.order_id)}</strong> · {huf(Number(r.amount_huf))} · {RETURN_STATUS_LABELS[r.status]}<span className="block text-xs text-muted-foreground truncate">{r.reason}</span></span>
            <span className="flex gap-1">{nextReturnActions(r.status).map((a) => (
              <Button key={a} size="sm" variant={a === "reject" ? "outline" : "default"} className="rounded-none h-8" onClick={() => act(r.id, a)}>{label[a]}</Button>))}</span>
          </li>))}</ul>}
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </section>
  );
}
