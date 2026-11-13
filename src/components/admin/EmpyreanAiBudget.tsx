import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { budgetMessage, type AiBudget } from "@/lib/empyrean-ai-budget";

export default function EmpyreanAiBudget() {
  const [b, setB] = useState<AiBudget | null>(null);
  const [form, setForm] = useState({ limit: "5", warn: "80", block: true });
  const [msg, setMsg] = useState("");
  const [price, setPrice] = useState({ v: "", cur: "USD" });
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("empyrean_ai_budget");
    if (error) { setMsg(error.message); return; }
    const d = data as unknown as AiBudget; setB(d);
    setForm({ limit: String(d.limit), warn: String(d.warn_pct), block: d.block_at_limit });
    setPrice({ v: d.credit_price == null ? "" : String(d.credit_price), cur: d.credit_currency || "USD" });
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    setMsg("");
    const { error } = await supabase.rpc("empyrean_set_ai_budget", { _limit: Number(form.limit), _warn_pct: Number(form.warn), _block: form.block });
    if (error) setMsg(error.message); else { setMsg("Mentve, naplózva."); await load(); }
  };
  const savePrice = async () => {
    setMsg("");
    const { error } = await supabase.rpc("empyrean_set_ai_credit_price", { _price: price.v === "" ? null : Number(price.v), _currency: price.cur });
    if (error) setMsg(error.message); else { setMsg("Számlázási ár mentve, naplózva."); await load(); }
  };
  if (!b) return msg ? <p role="alert" className="text-sm text-destructive">{msg}</p> : null;
  const m = budgetMessage(b);
  const pct = Math.min(100, b.pct ?? 0);
  return (
    <section className="space-y-3 border border-border p-4" aria-labelledby="ai-budget">
      <h2 id="ai-budget" className="text-lg font-medium">AI-költségkeret (havi)</h2>
      <div role={m.level === "ok" ? undefined : "alert"} className={`text-sm ${m.level === "ok" ? "text-muted-foreground" : "text-destructive"}`}>{m.text}</div>
      <div className="h-2 bg-muted" aria-label={`Felhasználva ${pct}%`}><div className={`h-2 ${m.level === "ok" ? "bg-primary" : "bg-destructive"}`} style={{ width: `${pct}%` }} /></div>
      <p className="text-xs text-muted-foreground">{b.used.toFixed(4)} / {b.limit} kredit · {b.calls} hívás · {b.tokens.toLocaleString("hu-HU")} token (becsült költség, e hónap)</p>
      <p className="text-sm">{b.monthly_cost != null
        ? <>Havi költség: <strong>{b.monthly_cost.toLocaleString("hu-HU")} {b.credit_currency}</strong> <span className="text-xs text-muted-foreground">({b.credit_price} {b.credit_currency} / kredit)</span></>
        : <span className="text-muted-foreground">Add meg a kredit számlázási árát, hogy pénzben is lásd a havi költséget.</span>}</p>
      {b.by_function.length > 0 && <ul className="text-xs divide-y divide-border border border-border">{b.by_function.map((f) => (
        <li key={f.fn} className="p-2 flex justify-between gap-2"><span className="truncate">{f.fn}</span><span className="shrink-0">{f.calls} hívás · {Number(f.cost).toFixed(4)}</span></li>))}</ul>}
      <div className="grid grid-cols-2 gap-2 items-end">
        <label className="text-xs text-muted-foreground space-y-1"><span>Havi keret (kredit)</span><Input type="number" min={0} step="0.5" className="rounded-none h-9" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground space-y-1"><span>Figyelmeztetés %-nál</span><Input type="number" min={1} max={100} className="rounded-none h-9" value={form.warn} onChange={(e) => setForm({ ...form, warn: e.target.value })} /></label>
        <label className="text-xs flex items-center gap-2 col-span-2"><Switch checked={form.block} onCheckedChange={(v) => setForm({ ...form, block: v })} />A keret elérésekor az AI segédek álljanak meg</label>
      </div>
      <Button size="sm" className="rounded-none" onClick={save}>Keret mentése</Button>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <label className="text-xs text-muted-foreground space-y-1"><span>Számlázási ár / kredit</span><Input type="number" min={0} step="0.01" className="rounded-none h-9" value={price.v} onChange={(e) => setPrice({ ...price, v: e.target.value })} /></label>
        <select aria-label="Pénznem" className="h-9 border border-input bg-background px-2 text-sm" value={price.cur} onChange={(e) => setPrice({ ...price, cur: e.target.value })}>{["USD","EUR","HUF"].map((c) => <option key={c}>{c}</option>)}</select>
        <Button size="sm" variant="outline" className="rounded-none h-9" onClick={savePrice}>Ár mentése</Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </section>
  );
}
