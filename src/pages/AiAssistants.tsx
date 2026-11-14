import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { departments } from "@/lib/ai-world";
import { ownsPlan, openPlans, deptStatus, type RolePlan } from "@/lib/workforce-roles";
import { WorkforceTeamPanel } from "@/components/admin/WorkforceTeamPanel";
import { WorkforceMyWork } from "@/components/admin/WorkforceMyWork";
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
      </header>
      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:border-b lg:border-border">
      <main className="grid gap-px bg-border grid-cols-2 lg:grid-cols-4 content-start">
        {per.map(({ d, mine }) => {
          const st = deptStatus(openPlans(mine));
          return (
            <Link key={d.id} to={`/admin/ai-asszisztensek/${d.id}`} onClick={(e) => { if (window.matchMedia("(min-width: 1024px)").matches) { e.preventDefault(); setSel(d.id); } }} className={`bg-background p-3 hover:bg-muted space-y-2 min-w-0 ${sel === d.id ? "lg:outline lg:outline-1 lg:outline-primary lg:-outline-offset-1" : ""}`}>
              <div className="text-sm font-display truncate"><span className="text-primary">{d.id}</span> · {d.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{d.roles[0]}</div>
              <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1"><span className={`h-2 w-2 ${dot[st]}`} />{st}</span><span className="text-muted-foreground">{openPlans(mine).length} munka</span></div>
            </Link>
          );
        })}
      </main>
      {selDept && <aside className="hidden lg:block border-l border-border max-h-[calc(100dvh-180px)] overflow-y-auto" aria-label="Kiválasztott munkatárs">
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
        <ol className="space-y-1">{plans.filter(p => p.status !== "cancelled").slice(0, 12).map(p => { const d = departments.find(x => ownsPlan(x, p)); const st = steps.filter(s => s.plan_id === p.id); return (
          <li key={p.id} className="flex gap-2 text-xs border-b border-border py-1"><span className="text-primary w-6 shrink-0">{d?.id ?? "–"}</span><span className="flex-1 min-w-0 truncate">{p.goal}</span><span className="text-muted-foreground shrink-0">{st.filter(s => s.status === "done").length}/{st.length} · {p.status === "draft" ? "vár" : p.status}</span></li>); })}</ol>
        <Link to="/admin/ai-workforce" className="text-xs underline">HUMAN GATE →</Link>
      </section>
      </div>
      <WorkforceTeamPanel />
    </div>
  );
};
export default AiAssistants;
