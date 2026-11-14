import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, Network, RefreshCw, Share2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { departments } from "@/lib/ai-world";
import { visibleTeamRecords } from "../../../supabase/functions/_shared/workforce-team";

type RecordRow = { id: string; value: { title?: string; content?: string; source?: string; target?: string | null; plan_id?: string | null }; updated_at: string; expires_at: string | null };
type Plan = { id: string; goal: string; status: string; owner: string | null; due_date: string | null };
export function WorkforceTeamPanel({ departmentId = "01", draft = "" }: { departmentId?: string; draft?: string }) {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [counts, setCounts] = useState<Record<string, { done: number; total: number }>>({});
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(draft);
  const [target, setTarget] = useState("");
  const [planId, setPlanId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { if (draft) setContent(draft.slice(0, 4000)); }, [draft]);
  const load = useCallback(async () => {
    const [r, p, s] = await Promise.all([
      supabase.from("ai_agent_bus_context").select("id,value,updated_at,expires_at").eq("namespace", "workforce-team").order("updated_at", { ascending: false }).limit(100),
      supabase.from("workforce_plans").select("id,goal,status,owner,due_date").order("created_at", { ascending: false }).limit(60),
      supabase.from("workforce_plan_steps").select("plan_id,status").limit(600),
    ]);
    if (r.error || p.error || s.error) { setError("A csapat adatai nem tölthetők be. Próbáld újra."); return; }
    setRows((r.data ?? []) as RecordRow[]); setPlans(p.data ?? []);
    const totals: Record<string, { done: number; total: number }> = {};
    for (const step of s.data ?? []) { const n = totals[step.plan_id] ?? { done: 0, total: 0 }; n.total++; if (step.status === "done") n.done++; totals[step.plan_id] = n; }
    setCounts(totals);
  }, []);
  useEffect(() => { load(); const timer = window.setInterval(load, 30000); return () => window.clearInterval(timer); }, [load]);
  const save = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: e } = await supabase.rpc("workforce_team_share", { _source: departmentId, _target: target || null, _title: title.trim(), _content: content.trim(), _plan: planId || null });
      if (e) throw e;
      setTitle(""); setContent(""); setNotice(target ? "Átadás rögzítve a címzettnek és a védett naplóba." : "Közös adat rögzítve a csapatnak és a védett naplóba."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : String((e as { message?: string }).message ?? "A megosztás sikertelen.")); }
    finally { setBusy(false); }
  };
  const visible = visibleTeamRecords(rows, departmentId) as RecordRow[];
  const realPlans = plans.filter(p => !/pr[óo]ba|teszt|test/i.test(p.goal));
  const name = (id?: string | null) => departments.find(d => d.id === id)?.name ?? "Teljes csapat";
  return <section className="border-b border-border bg-background p-4 space-y-5">
    <div className="flex items-center justify-between gap-3"><h2 className="font-display flex items-center gap-2"><Network className="h-4 w-4 text-primary" /> Közös munkatér</h2><Button size="icon" variant="ghost" aria-label="Csapatadatok frissítése" title="Frissítés" onClick={load}><RefreshCw /></Button></div>
    <div className="grid grid-cols-3 gap-2 text-center text-xs"><div><strong className="block text-xl font-mono">{departments.length}</strong>Munkatárs</div><div><strong className="block text-xl font-mono">{visible.length}</strong>Fontos adat / átadás</div><div><strong className="block text-xl font-mono">{realPlans.length}</strong>Valós terv</div></div>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); save(); }}>
      <h3 className="text-sm font-display flex gap-2 items-center"><Share2 className="h-4 w-4" /> Fontos adat vagy feladatátadás</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs space-y-1 block">Címzett<select aria-label="Címzett" className="block w-full bg-muted border border-border p-2 text-sm" value={target} onChange={e => setTarget(e.target.value)}><option value="">Teljes csapat · közös fontos adat</option>{departments.filter(d => d.id !== departmentId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label className="text-xs space-y-1 block">Kapcsolódó terv<select aria-label="Kapcsolódó terv" className="block w-full bg-muted border border-border p-2 text-sm" value={planId} onChange={e => setPlanId(e.target.value)}><option value="">Nincs kapcsolódó terv</option>{realPlans.map(p => <option key={p.id} value={p.id}>{p.goal}</option>)}</select></label>
      </div>
      <input aria-label="Fontos adat címe" placeholder="Fontos adat címe" value={title} onChange={e => setTitle(e.target.value)} minLength={3} maxLength={120} required className="w-full bg-muted border border-border px-3 py-2 text-sm" />
      <textarea aria-label="Megosztandó adat" placeholder="Adat, összegzés vagy átadandó feladat…" value={content} onChange={e => setContent(e.target.value)} minLength={10} maxLength={4000} rows={3} required className="w-full bg-muted border border-border px-3 py-2 text-sm" />
      <Button type="submit" disabled={busy || title.trim().length < 3 || content.trim().length < 10} className="rounded-none"><ShieldCheck />{busy ? "Rögzítés…" : target ? "Átadás megerősítése" : "Közös adat megerősítése"}</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    <div className="space-y-3"><h3 className="text-sm font-display">Csapatadatok és átadások</h3>{!visible.length && <p className="text-xs text-muted-foreground">Még nincs megosztott adat.</p>}{visible.map(r => <article key={r.id} className="border-l-2 border-primary pl-3 space-y-1"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span>{name(r.value.source)}</span><ArrowRightLeft className="h-3 w-3 shrink-0" /><span>{name(r.value.target)}</span></div><h4 className="font-display text-sm break-words">{r.value.title}</h4><p className="text-sm whitespace-pre-wrap break-words">{r.value.content}</p><p className="text-[10px] text-muted-foreground">Felhasználó által megerősített · {new Date(r.updated_at).toLocaleString("hu-HU")}</p>{r.value.target && <Button variant="link" className="p-0 h-auto" asChild><Link to={`/admin/ai-asszisztensek/${r.value.target}`}>Címzett megnyitása</Link></Button>}</article>)}</div>
    <div className="space-y-2"><h3 className="text-sm font-display">Valós munkák · közös tervlista</h3>{!realPlans.length && <p className="text-xs text-muted-foreground">Nincs valós terv.</p>}{realPlans.map(p => <div key={p.id} className="border-b border-border py-2"><div className="text-sm break-words">{p.goal}</div><div className="text-xs text-muted-foreground">{p.owner ?? "Nincs felelős"} · {counts[p.id]?.done ?? 0}/{counts[p.id]?.total ?? 0} lépés kész · {p.status}</div></div>)}<Button variant="link" className="p-0" asChild><Link to="/admin/ai-workforce">Munka állapot és jóváhagyások →</Link></Button></div>
  </section>;
}