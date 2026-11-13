// AI WORKFORCE — cél → teljes munkaszervezet (csak terv, végrehajtás nélkül).
import { planGoal, type Risk, type WorkPlan } from "./ai-world";

export const levels = [
  { id: 0, name: "Ember", duty: "Cél, prioritás, tiltások, költségkeret, kritikus jóváhagyás" },
  { id: 1, name: "AI Company Core", duty: "Cél értelmezése, felbontás, erőforrás-kiosztás" },
  { id: 2, name: "AI vezetés", duty: "CEO/COO/CFO/CTO/CISO/CMO — stratégia és felelősség" },
  { id: 3, name: "AI osztályok", duty: "Területi tervezés és ütemezés" },
  { id: 4, name: "AI munkatársak", duty: "Munkakör szerinti végrehajtás-terv" },
  { id: 5, name: "Specialisták", duty: "Szakmai mélység, független ellenőrzés" },
  { id: 6, name: "Feladatügynökök", duty: "Ideiglenes, egy feladatra szóló végrehajtók" },
] as const;

export type Step = { phase: string; level: number; owner: string; reviewer: string; task: string; evidence: string };
export type WorkOrder = WorkPlan & {
  steps: Step[]; missing: string[]; decisions: string[]; done: string[]; taskAgents: number;
};

const NEEDS: { re: RegExp; missing: string; test: RegExp }[] = [
  { re: /kampány|hírlevél|marketing/i, missing: "Költségkeret (Ft)", test: /\d+\s*(ft|huf|eur|usd)/i },
  { re: /kampány|webshop|oldal|termék/i, missing: "Céldátum / határidő", test: /\d{4}[.-]\d{1,2}|\bnap\b|\bhét\b|\bhónap/i },
  { re: /.*/, missing: "Mérhető siker (KPI, pl. +10% konverzió)", test: /\d+\s*%|\bkpi\b|konverzió|bevétel/i },
];

export function buildWorkOrder(goal: string): WorkOrder {
  const p = planGoal(goal);
  if (p.blocked || !p.assignments.length)
    return { ...p, steps: [], missing: [], decisions: p.blocked ? ["AEGIS blokk — emberi felülvizsgálat"] : [], done: [], taskAgents: 0 };
  const lead = p.assignments[0], qa = p.assignments[p.assignments.length - 1];
  const steps: Step[] = [
    { phase: "1. Értelmezés", level: 1, owner: "AI Company Core", reviewer: "Ember", task: "Cél, korlátok és siker definiálása", evidence: "Jóváhagyott célleírás" },
    { phase: "2. Felelős", level: 2, owner: lead.department.name + " vezető", reviewer: "AI COO", task: "Felelősség és erőforrás kiosztása", evidence: "Kiosztási lista" },
    ...p.assignments.filter((a) => a !== qa).map((a) => ({
      phase: "3. Végrehajtási terv", level: 4, owner: a.owner, reviewer: a.reviewer,
      task: `${a.department.name}: részfeladatok és sorrend`, evidence: "Munkacsomag + bemenetek",
    })),
    { phase: "4. Független QA", level: 5, owner: qa.owner, reviewer: qa.reviewer, task: "Ellenőrzés a végrehajtótól függetlenül", evidence: "QA jegyzőkönyv" },
    { phase: "5. Jóváhagyás", level: 0, owner: "Ember", reviewer: "AEGIS", task: p.approval, evidence: "Aláírt döntés + audit" },
    { phase: "6. Lezárás", level: 1, owner: "AI Company Core", reviewer: "AI CISO", task: "Eredmény mérése, rollback-pont rögzítése", evidence: "KPI-mérés + visszaállítási pont" },
  ];
  const missing = NEEDS.filter((n) => n.re.test(goal) && !n.test.test(goal)).map((n) => n.missing);
  const decisions = [
    ...(p.risk !== "green" ? [p.approval] : []),
    ...p.findings.map((f) => `AEGIS: ${f.label}`),
    ...(missing.length ? ["Hiányzó adatok megadása indulás előtt"] : []),
  ];
  const done = ["Minden lépéshez van bizonyíték", "Független QA elfogadta", "Mért KPI rögzítve", "Visszaállítási pont létezik"];
  return { ...p, steps, missing, decisions, done, taskAgents: (steps.length - 3) * 3 };
}

export const riskOrder: Risk[] = ["green", "yellow", "red"];

// Fokozatos végrehajtás: csak a legelső nem kész lépés futtatható, és csak jóváhagyott tervben.
export type TrackedStep = { idx: number; status: "pending" | "done" | "failed" };
export function nextRunnable<T extends TrackedStep>(planStatus: string, steps: T[]): T | null {
  if (planStatus !== "approved" && planStatus !== "in_progress") return null;
  return [...steps].sort((a, b) => a.idx - b.idx).find((s) => s.status !== "done") ?? null;
}

// AEGIS bizonyítékkövetelés (OMEGA: „a rendszer bizonyítékot követel”) — a szerveroldali workforce_evidence_ok tükre.
const FILLER = /^(ok|oké|kész|done|megvan|megcsinálva|rendben|igen|teszt|test|x+|\.+|-+)[\s.!]*$/i;
export function evidenceOk(r: string): boolean {
  const t = (r ?? "").trim();
  return t.length >= 20 && !FILLER.test(t) && (/\d/.test(t) || /https?:\/\//i.test(t) || t.split(/\s+/).length >= 5);
}
