import { workforcePerformance, type RolePlan, type RoleStep } from "@/lib/workforce-roles";

export function WorkforcePerformance({ plans, steps }: { plans: RolePlan[]; steps: RoleStep[] }) {
  const p = workforcePerformance(plans, steps);
  return <div className="text-[11px] space-y-1" aria-label="Munkatársi teljesítmény">
    <div>Kész lépések: <strong>{p.completed}/{p.total}</strong> · Teljesítés: <strong>{p.completionPercent}%</strong></div>
    <div className="text-muted-foreground">Részesedés az összes kész lépésből: {p.participationPercent}%</div>
  </div>;
}