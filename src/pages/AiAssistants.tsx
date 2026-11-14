import { useWorkforceLive } from "@/hooks/useWorkforceLive";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { departments } from "@/lib/ai-world";
import { ownsPlan, openPlans, deptStatus, planOverdue, type RolePlan } from "@/lib/workforce-roles";
import { WorkforceTeamPanel } from "@/components/admin/WorkforceTeamPanel";
import { WorkforceMyWork, saveProposal } from "@/components/admin/WorkforceMyWork";
import { toast } from "sonner";
import { huVoices, getVoicePref, setVoicePref, pickVoice } from "@/lib/hu-voice";
import { Button } from "@/components/ui/button";

type Step = { plan_id: string; status: string };
type Ev = { id: string; source_agent: string; target_agent: string | null; payload: any; created_at: string };
const dot: Record<string, string> = { "dolgozik": "bg-primary", "vár": "bg-muted-foreground", "aktív": "bg-foreground", "nincs munka": "bg-border" };

const AiAssistants = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<RolePlan[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [sel, setSel] = useState("02");
  const [tick, setTick] = useState(0);
  const [simple, setSimple] = useState(() => typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches);
  const [to, setTo] = useState(""); const [goal, setGoal] = useState(""); const [sending, setSending] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]); const [voice, setVoice] = useState(getVoicePref());
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const f = () => setVoices(huVoices()); f(); speechSynthesis.addEventListener("voiceschanged", f);
    return () => speechSynthesis.removeEventListener("voiceschanged", f);
  }, []);
  const testVoice = () => { const u = new SpeechSynthesisUtterance("Szia! Én vagyok a magyar felolvasó hang."); u.lang = "hu-HU"; const v = pickVoice(); if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u); };
  const propose = async () => {
    const d = departments.find(x => x.id === to); const t = goal.trim(); if (!d || t.length < 5) return;
    setSending(true); const { error } = await saveProposal(d, t, "dashboard"); setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`${d.name}: tervjavaslat a HUMAN GATE-en vár`); setGoal(""); setTick(x => x + 1);
  };
  useWorkforceLive(() => setTick(t => t + 1));
  useEffect(() => { if (!loading && !isAdmin) navigate("/"); }, [loading, isAdmin, navigate]);
  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      supabase.from("workforce_plans").select("id,goal,status,owner,due_date,plan").order("created_at", { ascending: false }).limit(200),
      supabase.from("workforce_plan_steps").select("plan_id,status").limit(2000),
      supabase.from("ai_agent_bus_events").select("id,source_agent,target_agent,payload,created_at").eq("event_type", "workforce.team.shared").order("created_at", { ascending: false }).limit(12),
    ]).then(([p, s, e]) => { setPlans((p.data ?? []) as RolePlan[]); setSteps((s.data ?? []) as Step[]); setEvents((e.data ?? []) as Ev[]); });
  }, [isAdmin, tick]);
  if (loading || !isAdmin) return null;

  const selDept = departments.find(d => d.id === sel);
  const per = departments.map(d => ({ d, mine: plans.filter(p => ownsPlan(d, p)) }));
  const open = per.reduce((n, x) => n + openPlans(x.mine).length, 0);
  const waiting = plans.filter(p => p.status === "draft").length;
  const done = steps.filter(s => s.status === "done").length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const name = (id: string | null) => departments.find(d => d.id === id || d.id === id?.replace(/^workforce:/, ""))?.name ?? id ?? "mindenki";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="p-4 border-b border-border space-y-3">
        <Link to="/admin/ai-workforce" className="flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> AI WORKFORCE</Link>
        <div><h1 className="font-display text-lg">AI munkatársak</h1><p className="text-xs text-muted-foreground">Central AI + AEGIS őr · {departments.length} szerep, saját munkákkal</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
          {[["Munkatárs", departments.length], ["Nyitott munka", open], ["Jóváhagyásra vár", waiting], ["Lépés kész", `${pct}%`]].map(([l, v]) => (
            <div key={l} className="bg-background p-3"><div className="text-[11px] text-muted-foreground">{l}</div><div className="font-display text-xl text-primary">{v}</div></div>
          ))}
        </div>
        <form className="flex flex-col sm:flex-row gap-2" onSubmit={e => { e.preventDefault(); propose(); }} aria-label="Tervjavaslat indítása">
          <select aria-label="Munkatárs" value={to} onChange={e => setTo(e.target.value)} className="bg-muted px-3 py-2 text-sm sm:w-56"><option value="">Munkatárs…</option>{departments.map(d => <option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}</select>
          <input aria-label="Tervjavaslat célja" value={goal} onChange={e => setGoal(e.target.value)} maxLength={300} placeholder="Tervjavaslat célja…" className="flex-1 bg-muted px-3 py-2 text-sm" />
          <Button type="submit" size="sm" className="rounded-none" disabled={sending || !to || goal.trim().length < 5}>Tervjavaslat indítása</Button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Felolvasó hang:</span>
          {voices.length ? <select aria-label="Magyar hang" value={voice || voices[0].name} onChange={e => { setVoice(e.target.value); setVoicePref(e.target.value); }} className="bg-muted px-2 py-1">{voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}</select>
            : <span className="text-destructive">Nincs magyar hang ezen az eszközön</span>}
          <Button type="button" size="sm" variant="outline" className="rounded-none h-7" onClick={testVoice}>Próba ▶</Button>
          <Button type="button" size="sm" variant="ghost" className="rounded-none h-7 ml-auto" onClick={() => setSimple(!simple)} aria-pressed={simple}>{simple ? "Részletes nézet" : "Egyszerű nézet"}</Button>
        </div>
      </header>
      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:border-b lg:border-border">
      <main className={`grid gap-px bg-border content-start ${simple ? "grid-cols-4 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4"}`}>
        {per.map(({ d, mine }) => {
          const st = deptStatus(openPlans(mine)); const late = mine.filter(p => p.status !== "cancelled" && planOverdue(p)).length;
          if (simple) return (
            <div key={d.id} className={`bg-background p-2 min-w-0 ${late ? "outline outline-1 outline-destructive -outline-offset-1" : ""}`}>
              <div className="text-[11px] font-display truncate"><span className="text-primary">{d.id}</span> {d.name}</div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className={`h-1.5 w-1.5 ${dot[st]}`} />{st}</div>
              {late > 0 && <div className="text-[10px] text-destructive">LEJÁRT {late}</div>}
            </div>);
          return (
            <Link key={d.id} to={`/admin/ai-asszisztensek/${d.id}`} onClick={(e) => { e.preventDefault(); setSel(d.id); if (!window.matchMedia("(min-width: 1024px)").matches) setTimeout(() => document.getElementById("wf-selected")?.scrollIntoView({ behavior: "smooth" }), 50); }} className={`bg-background p-3 hover:bg-muted space-y-2 min-w-0 ${sel === d.id ? "outline outline-1 outline-primary -outline-offset-1" : ""}`}>
              <div className="text-sm font-display truncate"><span className="text-primary">{d.id}</span> · {d.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{d.roles[0]}</div>
              <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1"><span className={`h-2 w-2 ${dot[st]}`} />{st}</span><span className={late ? "text-destructive" : "text-muted-foreground"}>{late ? `LEJÁRT ${late}` : `${openPlans(mine).length} munka`}</span></div>
            </Link>
          );
        })}
      </main>
      {selDept && !simple && <aside id="wf-selected" className="scroll-mt-2 border-t lg:border-t-0 lg:border-l border-border lg:max-h-[calc(100dvh-180px)] lg:overflow-y-auto" aria-label="Kiválasztott munkatárs">
        <div className="flex items-center justify-between p-4 border-b border-border"><div><div className="font-display text-primary">{selDept.id} · {selDept.name}</div><div className="text-[11px] text-muted-foreground">{selDept.roles.slice(0, 3).join(" · ")}</div></div><Button size="sm" className="rounded-none" asChild><Link to={`/admin/ai-asszisztensek/${selDept.id}`}>Beszélgetés →</Link></Button></div>
        <WorkforceMyWork key={selDept.id} dept={selDept} onChange={() => setTick(t => t + 1)} />
      </aside>}
      </div>
      <div className="lg:grid lg:grid-cols-2">
      <section className="p-4 space-y-2 border-t lg:border-t-0 lg:border-r border-border" aria-label="Központi koordinációs napló">
        <h2 className="font-display text-sm">Központi koordinációs napló</h2>
        {!events.length && <p className="text-xs text-muted-foreground">Még nincs átadás a munkatársak között.</p>}
        <ol className="space-y-2">{events.map(e => (
          <li key={e.id} className="border-l-2 border-primary pl-3 text-xs"><div><span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("hu-HU", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span> · {name(e.source_agent)} → {name(e.target_agent)}</div><div className="text-muted-foreground break-words">{e.payload?.title ?? ""}</div></li>
        ))}</ol>
      </section>
      <section className="p-4 space-y-2 border-t lg:border-t-0 border-border" aria-label="Tervlista">
        <h2 className="font-display text-sm">Tervlista · munkatársak szerint</h2>
        <ol className="space-y-1">{plans.filter(p => p.status !== "cancelled").slice(0, simple ? 30 : 12).map(p => { const d = departments.find(x => ownsPlan(x, p)); const st = steps.filter(s => s.plan_id === p.id); return (
          <li key={p.id} className="flex gap-2 text-xs border-b border-border py-1"><span className="text-primary w-6 shrink-0">{d?.id ?? "–"}</span><span className="flex-1 min-w-0 truncate">{p.goal}</span><span className={`shrink-0 ${planOverdue(p) ? "text-destructive" : "text-muted-foreground"}`}>{p.due_date ?? "–"} · {st.filter(s => s.status === "done").length}/{st.length} · {planOverdue(p) ? "LEJÁRT" : p.status === "draft" ? "vár" : p.status}</span></li>); })}</ol>
        <Link to="/admin/ai-workforce" className="text-xs underline">HUMAN GATE →</Link>
      </section>
      </div>
      <WorkforceTeamPanel />
    </div>
  );
};
export default AiAssistants;
