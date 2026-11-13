import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export default function EmpyreanAiInvoice() {
  const [f, setF] = useState({ month: new Date().toISOString().slice(0, 7), credits: "", amount: "", cur: "HUF", ref: "" });
  const [msg, setMsg] = useState("");
  const save = async () => {
    setMsg("");
    const { error } = await supabase.rpc("empyrean_record_ai_invoice", { _month: `${f.month}-01`, _credits: Number(f.credits), _amount: Number(f.amount), _currency: f.cur, _ref: f.ref || null } as never);
    setMsg(error ? error.message : "Számla rögzítve, naplózva. A profitkártya ettől a valós díjat mutatja (frissíts).");
  };
  return (
    <section className="space-y-3 border border-border p-4" aria-labelledby="ai-invoice">
      <h2 id="ai-invoice" className="text-lg font-medium">AI-számla rögzítése (valós díj)</h2>
      <p className="text-xs text-muted-foreground">Ha megérkezik a havi számla, írd be a kreditet és az összeget: az adott hónapban ez felülírja a becslést.</p>
      <div className="grid gap-2 sm:grid-cols-[9rem_1fr_1fr_6rem_1fr_auto] items-end">
        <label className="text-xs text-muted-foreground space-y-1"><span>Hónap</span><Input type="month" className="rounded-none h-9" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground space-y-1"><span>Kredit</span><Input type="number" min={0} className="rounded-none h-9" value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground space-y-1"><span>Összeg</span><Input type="number" min={0} className="rounded-none h-9" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
        <select aria-label="Számla pénzneme" className="h-9 border border-input bg-background px-2 text-sm" value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })}>{["HUF", "USD", "EUR"].map((c) => <option key={c}>{c}</option>)}</select>
        <label className="text-xs text-muted-foreground space-y-1"><span>Számlaszám</span><Input className="rounded-none h-9" value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></label>
        <Button size="sm" className="rounded-none h-9" disabled={!f.credits || !f.amount} onClick={save}>Rögzítés</Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </section>
  );
}
