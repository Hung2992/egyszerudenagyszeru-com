// Munkatárs-szerep és tervtulajdon: egy terv akkor egy munkatársé, ha a terv
// department mezője az ő azonosítója, vagy a felelős neve a területét nevezi meg.
import type { Department } from "@/lib/ai-world";

export type RolePlan = { id: string; goal: string; status: string; owner: string | null; due_date: string | null; plan?: unknown };
export type RoleStep = { plan_id: string; status: string; owner?: string | null };

const norm = (s: string) => s.toLocaleLowerCase("hu-HU").trim();

export function ownsPlan(dept: Pick<Department, "id" | "name">, p: RolePlan): boolean {
  const meta = (p.plan && typeof p.plan === "object" ? (p.plan as Record<string, unknown>).department : null);
  if (meta === dept.id) return true;
  if (meta && meta !== dept.id) return false;
  return !!p.owner && norm(p.owner).includes(norm(dept.name));
}

export type DeptStatus = "dolgozik" | "vár" | "aktív" | "nincs munka";
export function deptStatus(plans: RolePlan[]): DeptStatus {
  if (plans.some(p => p.status === "in_progress" || p.status === "approved")) return "dolgozik";
  if (plans.some(p => p.status === "draft")) return "vár";
  return plans.length ? "aktív" : "nincs munka";
}

export const openPlans = (plans: RolePlan[]) => plans.filter(p => p.status !== "cancelled" && p.status !== "done");

export function isOverdue(due: string | null, now = new Date()): boolean {
  if (!due) return false;
  return new Date(`${due}T23:59:59`).getTime() < now.getTime();
}

export const proposalGoal = (dept: Pick<Department, "name" | "roles">) =>
  `${dept.name}: heti munkaterv (${dept.roles.slice(0, 2).join(", ")})`;
