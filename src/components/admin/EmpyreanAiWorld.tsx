import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { departments, totals, type Risk } from "@/lib/ai-world";
import { buildWorkOrder, levels } from "@/lib/ai-workforce";

const riskLabel: Record<Risk, string> = { green: "🟢 elemzés", yellow: "🟡 jóváhagyás", red: "🔴 emberi döntés" };

export default function EmpyreanAiWorld() {
  const [goal, setGoal] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const plan = useMemo(() => (submitted ? buildWorkOrder(submitted) : null), [submitted]);
  return (
    <section className="space-y-3" aria-labelledby="ai-world">
      <div>
        <h2 id="ai-world" className="text-lg font-medium">AI WORKFORCE · Central AI + AEGIS őr</h2>
        <p className="text-xs text-muted-foreground">{totals.departments} terület · {totals.specialists} specialista. Csak munkatervet készít, semmit nem hajt végre.</p>
      </div>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); setSubmitted(goal); }}>
        <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={1000} placeholder="Mit szeretnél elérni? Pl. Indíts SEO kampányt a lassan fogyó termékekre" className="rounded-none" />
        <Button type="submit" size="sm" className="rounded-none" disabled={!goal.trim()}>Munkaterv</Button>
      </form>
      {plan && (
        <div className="border border-border p-3 space-y-2">
          <p className={`text-sm ${plan.blocked ? "text-destructive" : ""}`}><strong>{riskLabel[plan.risk]}</strong> — {plan.approval}</p>
          {plan.findings.length > 0 && (
            <ul className="text-xs space-y-1" aria-label="AEGIS találatok">
              {plan.findings.map((f) => <li key={f.code} className={f.severity === "block" ? "text-destructive" : "text-muted-foreground"}>AEGIS · {f.label} ({f.severity === "block" ? "blokk" : "figyelmeztetés"})</li>)}
            </ul>
          )}
          {plan.assignments.length > 0 && (
            <ol className="text-sm space-y-1">
              {plan.assignments.map((a, i) => (
                <li key={a.department.id} className="flex flex-wrap gap-x-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="font-medium">{a.department.name}</span>
                  <span>felelős: {a.owner}</span>
                  <span className="text-muted-foreground">ellenőr: {a.reviewer}</span>
                </li>
              ))}
            </ol>
          )}
          {plan.steps.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Munkarend · {plan.taskAgents} feladatügynök</p>
              <ol className="text-xs space-y-1">
                {plan.steps.map((s, i) => (
                  <li key={i} className="border-l border-border pl-2">
                    <span className="font-medium">{s.phase}</span> · szint {s.level} · {s.owner} → ellenőr: {s.reviewer}
                    <div className="text-muted-foreground">{s.task} — bizonyíték: {s.evidence}</div>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {plan.missing.length > 0 && <p className="text-xs">Hiányzik: {plan.missing.join(" · ")}</p>}
          {plan.decisions.length > 0 && <p className="text-xs">Emberi döntés: {plan.decisions.join(" · ")}</p>}
          {plan.done.length > 0 && <p className="text-xs text-muted-foreground">Kész, ha: {plan.done.join(" · ")}</p>}
        </div>
      )}
      <ol className="border border-border divide-y divide-border text-xs" aria-label="Hierarchia">
        {levels.map((l) => <li key={l.id} className="p-2 flex gap-2"><span className="text-muted-foreground w-4">{l.id}</span><span className="font-medium w-36 shrink-0">{l.name}</span><span className="text-muted-foreground">{l.duty}</span></li>)}
      </ol>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
        {departments.map((d) => (
          <button key={d.id} type="button" onClick={() => setOpen(open === d.id ? null : d.id)} className="bg-background p-2 text-left hover:bg-muted" aria-expanded={open === d.id}>
            <p className="text-xs text-muted-foreground">{d.id} · {riskLabel[d.risk]}</p>
            <p className="text-sm">{d.name}</p>
            {open === d.id && <ul className="mt-1 text-xs text-muted-foreground">{d.roles.map((r) => <li key={r}>{r}</li>)}</ul>}
          </button>
        ))}
      </div>
    </section>
  );
}
