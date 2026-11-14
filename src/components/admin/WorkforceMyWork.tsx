import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { departments, type Department } from "@/lib/ai-world";
import { buildWorkOrder } from "@/lib/ai-workforce";
import { ownsPlan, openPlans, isOverdue, proposalGoal, type RolePlan } from "@/lib/workforce-roles";

type Step = { id: string; plan_id: string; idx: number; status: string; task: string | null; due_date: string | null };
const label: Record<string, string> = { draft: "Jóváhagyásra vár", approved: "Jóváhagyva", in_progress: "Folyamatban", done: "Kész", cancelled: "Megszakítva" };

export function WorkforceMyWork({ dept, onChange }: { dept: Department; onChange?: () => void }) {
  const [plans, setPlans] = useState<RolePlan[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [goal, setGoal] = useState(proposalGoal(dept));
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      supabase.from("workforce_plans").select("id,goal,status,owner,due_date,plan").order("created_at", { ascending: false }).limit(200),
      supabase.from("workforce_plan_steps").select("id,plan_id,idx,status,task,due_date").order("idx").limit(2000),
    ]);
    setPlans(((p.data ?? []) as RolePlan[]).filter(x => ownsPlan(dept, x)));
    setSteps((s.data ?? []) as Step[]);
  }, [dept]);
  useEffect(() => { load(); }, [load]);

  const [target, setTarget] = useState("");
  const [handGoal, setHandGoal] = useState("");
  // Tervjavaslat mentése egy munkatársnak (saját magának vagy átadva). Mindig HUMAN GATE-re kerül.
  const savePlan = async (to: Department, t: string) => {
    const w = buildWorkOrder(t);
    const owner = `${to.name} asszisztens`;
    return supabase.rpc("workforce_save_plan", {
      _goal: t, _risk: w.risk, _owner: owner, _due: null,
      _plan: { department: to.id, proposedBy: dept.id, assignments: w.assignments.map(a => ({ dept: a.department.name, owner: a.owner, reviewer: a.reviewer })), missing: w.missing, decisions: w.decisions, done: w.done } as never,
      _steps: w.steps as never,
    });
  };
  const propose = async () => {
    const t = goal.trim(); if (t.length < 5) return;
    setBusy(true); const { error } = await savePlan(dept, t); setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tervjavaslat a HUMAN GATE-en jóváhagyásra vár"); load(); onChange?.();
  };
  const handoff = async () => {
    const to = departments.find(d => d.id === target); const t = handGoal.trim();
    if (!to || t.length < 5) return;
    setBusy(true);
    const { data: planId, error } = await savePlan(to, t);
    if (error) { setBusy(false); return toast.error(error.message); }
    const { error: e2 } = await supabase.rpc("workforce_team_share", { _source: dept.id, _target: to.id, _title: `Tervjavaslat: ${t}`.slice(0, 120), _content: `${dept.name} tervjavaslatot adott át ${to.name} részére: "${t}". Jóváhagyásra vár a HUMAN GATE-en.`, _plan: planId as string });
    setBusy(false);
    if (e2) return toast.error(e2.message);
    toast.success(`Átadva: ${to.name} · HUMAN GATE-en vár`); setHandGoal(""); onChange?.();
  };

  const active = openPlans(plans);
  return (
    <section className="p-4 space-y-3 border-b border-border" aria-label="Saját munkák">
      <div className="flex items-baseline justify-between"><h3 className="font-display text-sm">Saját munkák · {dept.name}</h3><span className="text-xs text-muted-foreground">{active.length} nyitott / {plans.length}</span></div>
      {plans.map(p => {
        const st = steps.filter(s => s.plan_id === p.id); const done = st.filter(s => s.status === "done").length;
        const late = p.status !== "done" && p.status !== "cancelled" && isOverdue(p.due_date);
        return (
          <div key={p.id} className={`border p-3 space-y-2 ${late ? "border-destructive" : "border-border"}`}>
            <div className="text-sm break-words">{p.goal}</div>
            <div className="text-xs text-muted-foreground">{label[p.status] ?? p.status} · határidő: {p.due_date ?? "nincs"}{late && <span className="text-destructive"> · LEJÁRT</span>} · {done}/{st.length} lépés</div>
            <div className="h-1 bg-muted"><div className="h-1 bg-primary" style={{ width: `${st.length ? (done / st.length) * 100 : 0}%` }} /></div>
            <ol className="text-xs space-y-1">{st.map(s => <li key={s.id} className={s.status === "done" ? "text-muted-foreground line-through" : s.status === "failed" ? "text-destructive" : ""}>{s.idx + 1}. {s.task}</li>)}</ol>
          </div>
        );
      })}
      {!active.length && (
        <div className="space-y-2 border border-primary p-3">
          <p className="text-xs">Ennek a munkatársnak nincs nyitott munkája. Kérj tervjavaslatot — a HUMAN GATE-en te hagyod jóvá.</p>
          <input aria-label="Tervjavaslat célja" value={goal} onChange={e => setGoal(e.target.value)} maxLength={300} className="w-full bg-muted px-3 py-2 text-sm" />
          <Button size="sm" className="rounded-none" disabled={busy || goal.trim().length < 5} onClick={propose}>Tervjavaslat kérése</Button>
        </div>
      )}
      <div className="space-y-2 border border-border p-3" aria-label="Munkatársaim">
        <h4 className="text-xs font-display">Munkatársaim · tervjavaslat átadása</h4>
        <select aria-label="Címzett munkatárs" value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-muted px-3 py-2 text-sm">
          <option value="">Válassz munkatársat…</option>
          {departments.filter(d => d.id !== dept.id).map(d => <option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}
        </select>
        <input aria-label="Átadott terv célja" value={handGoal} onChange={e => setHandGoal(e.target.value)} maxLength={300} placeholder="Mit csináljon a munkatárs?" className="w-full bg-muted px-3 py-2 text-sm" />
        <Button size="sm" variant="secondary" className="rounded-none" disabled={busy || !target || handGoal.trim().length < 5} onClick={handoff}>Tervjavaslat átadása</Button>
      </div>
      <Button variant="link" className="p-0 h-auto text-xs" asChild><Link to="/admin/ai-workforce">HUMAN GATE és tervlista →</Link></Button>
    </section>
  );
}
