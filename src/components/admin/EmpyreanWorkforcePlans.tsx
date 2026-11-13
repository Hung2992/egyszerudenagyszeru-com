import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { nextRunnable } from "@/lib/ai-workforce";
import { toast } from "sonner";

type Plan = { id: string; goal: string; risk: string; status: string; owner: string; due_date: string | null; created_at: string; approval_expires_at: string | null; payload_hash: string | null };
type Step = { id: string; plan_id: string; idx: number; phase: string; owner: string; reviewer: string; task: string; evidence: string; due_date: string | null; status: "pending" | "done" | "failed"; result: string | null; executed_at: string | null };
type Audit = { id: string; plan_id: string; action: string; detail: Record<string, unknown>; created_at: string };

const statusLabel: Record<string, string> = { draft: "Tervezet", approved: "Jóváhagyva", in_progress: "Folyamatban", done: "Kész", cancelled: "Megszakítva", pending: "Vár", failed: "Hibás" };
const actionLabel: Record<string, string> = { created: "Mentve", approved: "Jóváhagyva", cancelled: "Megszakítva", step_done: "Lépés kész", step_failed: "Lépés hibás", done: "Terv kész", aegis_blocked: "AEGIS blokkolta", reapproved: "Jóváhagyás megújítva", aegis_tamper: "AEGIS: a tartalom eltért a jóváhagyottól — terv leállítva" };

export default function EmpyreanWorkforcePlans({ reloadKey }: { reloadKey: number }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [run, setRun] = useState<{ step: Step; ok: boolean } | null>(null);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, s, a] = await Promise.all([
      supabase.from("workforce_plans").select("id,goal,risk,status,owner,due_date,created_at,approval_expires_at,payload_hash").order("created_at", { ascending: false }).limit(50),
      supabase.from("workforce_plan_steps").select("*").order("idx"),
      supabase.from("workforce_audit").select("id,plan_id,action,detail,created_at").order("created_at", { ascending: false }).limit(500),
    ]);
    setPlans((p.data ?? []) as Plan[]); setSteps((s.data ?? []) as Step[]); setAudit((a.data ?? []) as Audit[]);
  }, []);
  useEffect(() => { load(); }, [load, reloadKey]);

  const [note, setNote] = useState("");
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.rpc("workforce_set_status", { _plan: id, _status: status, _note: note || undefined });
    if (error) toast.error(error.message); else { toast.success(statusLabel[status]); load(); }
  };
  const reapprove = async (id: string) => {
    const { error } = await supabase.rpc("workforce_reapprove", { _plan: id, _note: note });
    if (error) toast.error(error.message); else { toast.success("Jóváhagyás megújítva (72 óra)"); load(); }
  };
  const execute = async () => {
    if (!run) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("workforce_execute_step", { _step: run.step.id, _confirmed: true, _ok: run.ok, _result: result });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data === "aegis_tamper") { toast.error("AEGIS: a terv tartalma eltér attól, amit jóváhagytál. A tervet leállította és naplózta."); load(); return; }
    if (data === "aegis_blocked") { toast.error("AEGIS blokkolta: az eredmény titkot, kártyaadatot vagy tiltott utasítást tartalmaz. Naplózva."); load(); return; }
    toast.success(run.ok ? "Lépés kész, naplózva" : "Hiba naplózva");
    setRun(null); setResult(""); load();
  };

  if (!plans.length) return <p className="text-xs text-muted-foreground">Még nincs mentett munkaterv.</p>;
  return (
    <div className="space-y-2" aria-label="Mentett munkatervek">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Mentett munkatervek</p>
      {plans.map((p) => {
        const ps = steps.filter((s) => s.plan_id === p.id);
        const done = ps.filter((s) => s.status === "done").length;
        const expired = p.status === "approved" && !!p.approval_expires_at && new Date(p.approval_expires_at) < new Date();
        const next = expired ? null : nextRunnable(p.status, ps);
        const late = p.due_date && p.status !== "done" && p.due_date < new Date().toISOString().slice(0, 10);
        return (
          <div key={p.id} className="border border-border">
            <button type="button" className="w-full p-2 text-left hover:bg-muted" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
              <p className="text-sm font-medium break-words">{p.goal}</p>
              <p className="text-xs text-muted-foreground">{statusLabel[p.status]} · {p.risk === "red" ? "🔴" : p.risk === "yellow" ? "🟡" : "🟢"} · {done}/{ps.length} lépés · felelős: {p.owner} · határidő: <span className={late ? "text-destructive" : ""}>{p.due_date ?? "nincs"}</span></p>
            </button>
            {open === p.id && (
              <div className="p-2 border-t border-border space-y-2">
                <div className="flex flex-wrap gap-2">
                  {p.status === "draft" && <Button size="sm" className="rounded-none" onClick={() => setStatus(p.id, "approved")}>Terv jóváhagyása</Button>}
                  {["draft", "approved", "in_progress"].includes(p.status) && <Button size="sm" variant="outline" className="rounded-none" onClick={() => setStatus(p.id, "cancelled")}>Megszakítás</Button>}
                </div>
                {p.status === "draft" && p.risk === "red" && <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="AEGIS: piros kockázat — írásos indoklás a jóváhagyáshoz (min. 10 karakter)" className="rounded-none text-xs" />}
                {p.status === "approved" && p.approval_expires_at && <p className={`text-xs ${expired ? "text-destructive" : "text-muted-foreground"}`}>{expired ? "AEGIS: a jóváhagyás lejárt" : "Jóváhagyás érvényes"}: {new Date(p.approval_expires_at).toLocaleString("hu-HU")}{expired && <Button size="sm" variant="outline" className="rounded-none h-7 ml-2" onClick={() => reapprove(p.id)}>Megújítás</Button>}</p>}
                {p.status === "draft" && <p className="text-xs text-muted-foreground">Lépés csak a terv jóváhagyása után hajtható végre.</p>}
                <ol className="text-xs space-y-1">
                  {ps.map((s) => (
                    <li key={s.id} className="border-l border-border pl-2">
                      <span className="font-medium">{s.phase}</span> · {statusLabel[s.status]} · {s.owner} → ellenőr: {s.reviewer}{s.due_date ? ` · határidő: ${s.due_date}` : ""}
                      <div className="text-muted-foreground">{s.task} — bizonyíték: {s.evidence}</div>
                      {s.result && <div>Eredmény: {s.result}</div>}
                      {next?.id === s.id && (
                        <div className="flex gap-2 mt-1">
                          <Button size="sm" className="rounded-none h-7" onClick={() => setRun({ step: s, ok: true })}>Végrehajtás</Button>
                          <Button size="sm" variant="outline" className="rounded-none h-7" onClick={() => setRun({ step: s, ok: false })}>Hiba rögzítése</Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Ellenőrzési napló</p>
                  <ul className="text-xs space-y-0.5">
                    {audit.filter((a) => a.plan_id === p.id).map((a) => (
                      <li key={a.id}>{new Date(a.created_at).toLocaleString("hu-HU")} · {actionLabel[a.action] ?? a.action}{a.detail?.phase ? ` · ${a.detail.phase}` : ""}{a.detail?.result ? ` — ${a.detail.result}` : ""}{a.detail?.note ? ` — indoklás: ${a.detail.note}` : ""}{Array.isArray(a.detail?.findings) ? ` — ${(a.detail.findings as string[]).join(", ")}` : ""}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <AlertDialog open={!!run} onOpenChange={(o) => { if (!o) { setRun(null); setResult(""); } }}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>{run?.ok ? "Megerősíted a lépés végrehajtását?" : "Hibát rögzítesz?"}</AlertDialogTitle>
            <AlertDialogDescription>{run?.step.phase}: {run?.step.task}. Szükséges bizonyíték: {run?.step.evidence}. Az eredmény naplózásra kerül.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={result} onChange={(e) => setResult(e.target.value)} maxLength={2000} placeholder="Eredmény / bizonyíték (kötelező)" className="rounded-none" />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Mégse</AlertDialogCancel>
            <AlertDialogAction className="rounded-none" disabled={busy || result.trim().length < 3} onClick={(e) => { e.preventDefault(); execute(); }}>Megerősítés</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
