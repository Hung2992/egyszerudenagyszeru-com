import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useWorkforceLive } from "@/hooks/useWorkforceLive";
import { supabase } from "@/integrations/supabase/client";
import { departments } from "@/lib/ai-world";
import { useWorkforceStaff } from "@/hooks/useWorkforceStaff";
import { ownsPlan, openPlans, deptStatus, planOverdue, planStage, staffLabel, type RolePlan, type DeptStatus } from "@/lib/workforce-roles";

type Step = { plan_id: string; status: string };
const order: DeptStatus[] = ["dolgozik", "vár", "aktív", "nincs munka"];

// Munkatárs-státusz: ki dolgozik, ki vár jóváhagyásra, kinek nincs munkája, és milyen tervet kapott. Élőben frissül.
const AiWorkforceStatus = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<RolePlan[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const { staff } = useWorkforceStaff();
  const [filter, setFilter] = useState<DeptStatus | "">("");
  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      supabase.from("workforce_plans").select("id,goal,status,owner,due_date,plan").neq("status", "cancelled").order("created_at", { ascending: false }).limit(300),
      supabase.from("workforce_plan_steps").select("plan_id,status").limit(3000),
    ]);
    setPlans((p.data ?? []) as RolePlan[]); setSteps((s.data ?? []) as Step[]);
  }, []);
  useEffect(() => { if (!loading && !isAdmin) navigate("/"); }, [loading, isAdmin, navigate]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  useWorkforceLive(load);
  if (loading || !isAdmin) return null;

  const rows = departments.map(d => { const mine = openPlans(plans.filter(p => ownsPlan(d, p))); return { d, mine, st: deptStatus(mine) }; })
    .sort((a, b) => order.indexOf(a.st) - order.indexOf(b.st));
  const count = (s: DeptStatus) => rows.filter(r => r.st === s).length;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="p-4 border-b border-border space-y-3">
        <Link to="/admin/ai-asszisztensek" className="flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
        <h1 className="font-display text-lg">Munkatárs-státusz</h1>
        <div className="grid grid-cols-4 gap-px bg-border">
          {order.map(s => (
            <button key={s} onClick={() => setFilter(filter === s ? "" : s)} aria-pressed={filter === s} className={`bg-background p-2 text-left ${filter === s ? "outline outline-1 outline-primary -outline-offset-1" : ""}`}>
              <div className="text-[11px] text-muted-foreground">{s}</div><div className="font-display text-xl text-primary">{count(s)}</div>
            </button>))}
        </div>
      </header>
      <main className="divide-y divide-border">
        {rows.filter(r => !filter || r.st === filter).map(({ d, mine, st }) => (
          <section key={d.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Link to={`/admin/ai-asszisztensek/${d.id}`} className="font-display text-sm truncate"><span className="text-primary">{d.id}</span> · {d.name}<span className="block text-[11px] text-muted-foreground font-sans">{staffLabel(staff[d.id], "Nincs megadott munkatárs")}</span></Link>
              <span className={`text-[11px] px-2 py-0.5 border ${st === "dolgozik" ? "border-primary text-primary" : st === "nincs munka" ? "border-border text-muted-foreground" : "border-foreground"}`}>{st}</span>
            </div>
            {!mine.length && <p className="text-xs text-muted-foreground">Nincs kapott terv.</p>}
            {mine.map(p => { const s = steps.filter(x => x.plan_id === p.id); const done = s.filter(x => x.status === "done").length; const late = planOverdue(p); return (
              <div key={p.id} className="text-xs flex gap-2"><span className="flex-1 min-w-0 break-words">{p.goal}</span>
                <span className={`shrink-0 ${late ? "text-destructive" : "text-muted-foreground"}`}>{late ? "LEJÁRT" : planStage(p, done)} · {done}/{s.length}</span></div>); })}
          </section>))}
      </main>
    </div>
  );
};
export default AiWorkforceStatus;
