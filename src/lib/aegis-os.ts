// MAXIMUM AI INTELLIGENCE OS — AEGIS nézet tiszta logikája (0., 3.7, 41., 42., 49. pont).
export const PIPELINE = ["Azonosított", "Engedélyezett", "Előzetesen ellenőrzött", "Végrehajtott", "Naplózott", "Visszaellenőrzött", "Értékelt", "Megtanult"] as const;

export type PlanLite = { status: string; risk: string; approval_expires_at: string | null };
export type StepLite = { status: "pending" | "done" | "failed" };

/** 49. STATE MACHINE: a mentett terv állapotát a terv szerinti állapotgépre képezi. */
export function planState(p: PlanLite, steps: StepLite[], now = Date.now()): string {
  if (p.status === "cancelled") return "ESCALATED";
  if (p.status === "done") return "COMPLETED";
  if (steps.some((s) => s.status === "failed")) return "FAILED";
  if (p.status === "draft") return "WAITING_APPROVAL";
  if (p.status === "approved" && p.approval_expires_at && new Date(p.approval_expires_at).getTime() < now) return "ESCALATED";
  if (p.status === "approved") return "ASSIGNED";
  return "EXECUTING";
}

/** 0. alapelv: hány lépésig jutott a terv a 8 lépéses AEGIS-láncon (0–8). */
export function pipelineReach(p: PlanLite, steps: StepLite[]): number {
  if (p.status === "cancelled") return 1;
  if (p.status === "draft") return 1;
  const done = steps.filter((s) => s.status === "done").length;
  if (done === 0) return 3;
  if (p.status !== "done") return 5;
  return 8;
}

export type FailureSignal = { code: string; at: string };
/** 3.7 FAILURE MEMORY: mi nem működött, hányszor, mikor utoljára — gyakoriság szerint. */
export function failureMemory(signals: FailureSignal[]) {
  const m = new Map<string, { code: string; count: number; last: string }>();
  for (const s of signals) {
    const cur = m.get(s.code);
    if (!cur) m.set(s.code, { code: s.code, count: 1, last: s.at });
    else { cur.count++; if (s.at > cur.last) cur.last = s.at; }
  }
  return [...m.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
}

/** 42. HUMAN GATE: mely terveknél kell most emberi döntés. */
export function needsHuman(p: PlanLite, now = Date.now()): boolean {
  if (p.status === "draft") return true;
  return p.status === "approved" && !!p.approval_expires_at && new Date(p.approval_expires_at).getTime() < now;
}
