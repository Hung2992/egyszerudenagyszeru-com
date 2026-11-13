import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { delay } from "@/lib/empyrean-delays";

type M = { id: string; name: string; promised_days: number | null; partner_id: string };
type D = { order_number: string; delivered_at: string | null; promised_days: number; actual_days: number };

export default function EmpyreanDelays() {
  const [methods, setMethods] = useState<M[]>([]);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<D[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [m, d] = await Promise.all([
      supabase.from("partner_shipping_methods").select("id,name,promised_days,partner_id").eq("is_active", true).order("name"),
      supabase.rpc("empyrean_delivery_delays" as never),
    ]);
    const ms = (m.data ?? []) as M[]; setMethods(ms);
    setEdit(Object.fromEntries(ms.map((x) => [x.id, x.promised_days == null ? "" : String(x.promised_days)])));
    if (d.error) setMsg(d.error.message); else setRows((d.data ?? []) as unknown as D[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async (id: string) => {
    setMsg("");
    const v = edit[id];
    const { error } = await supabase.rpc("empyrean_set_promised_days" as never, { _method_id: id, _days: v === "" ? null : Number(v) } as never);
    setMsg(error ? error.message : "Vállalt idő mentve, naplózva."); await load();
  };
  const late = rows.map((r) => ({ r, d: delay(Number(r.actual_days), r.promised_days) })).filter((x) => x.d?.late);
  return (
    <section className="space-y-3 border border-border p-4" aria-labelledby="delays">
      <h2 id="delays" className="text-lg font-medium">Kézbesítés: vállalt idő és késések</h2>
      <ul className="divide-y divide-border border border-border text-sm">{methods.map((m) => (
        <li key={m.id} className="p-2 grid grid-cols-[1fr_6rem_auto] gap-2 items-center">
          <span className="truncate">{m.name}</span>
          <Input aria-label={`${m.name} vállalt napok`} type="number" min={0} max={60} placeholder="nap" className="rounded-none h-8" value={edit[m.id] ?? ""} onChange={(e) => setEdit({ ...edit, [m.id]: e.target.value })} />
          <Button size="sm" variant="outline" className="rounded-none h-8" onClick={() => save(m.id)}>Mentés</Button>
        </li>))}</ul>
      <p className="text-xs text-muted-foreground">Késést csak azoknál a rendeléseknél számolunk, ahol a rendeléskor ismert volt a szállítási mód és a vállalt idő (új rendelésektől). Úton lévő rendelésnél a mai napig eltelt időt nézzük.</p>
      <h3 className="text-sm font-medium">Késett rendelések ({late.length} / {rows.length} mért)</h3>
      {late.length === 0 ? <p className="text-sm text-muted-foreground">Nincs késés a mért rendelések között.</p> :
        <ul className="divide-y divide-border border border-border text-sm">{late.map(({ r, d }) => (
          <li key={r.order_number} className="p-2 flex justify-between gap-2"><span className="truncate">{r.order_number}{r.delivered_at ? "" : " · úton"}</span>
            <span className="shrink-0 text-destructive">{r.actual_days} nap / vállalt {r.promised_days} · +{d!.extra} nap{d!.ratio ? ` · ${d!.ratio}×` : ""}</span></li>))}</ul>}
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </section>
  );
}
