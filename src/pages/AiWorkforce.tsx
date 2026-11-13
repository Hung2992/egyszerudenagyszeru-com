import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import WorkforceWorkStatus from "@/components/admin/WorkforceWorkStatus";
import EmpyreanAiWorld from "@/components/admin/EmpyreanAiWorld";
import AegisPolicyZeroTrust from "@/components/admin/AegisPolicyZeroTrust";
import AegisApprovalQueue from "@/components/admin/AegisApprovalQueue";
import AegisFullStop from "@/components/admin/AegisFullStop";
import EmpyreanAegisKillSwitch from "@/components/admin/EmpyreanAegisKillSwitch";
import EmpyreanAegisIncidents from "@/components/admin/EmpyreanAegisIncidents";
import EmpyreanAegisEvents, { label as aegisLabel } from "@/components/admin/EmpyreanAegisEvents";
import { PIPELINE, planState, pipelineReach, failureMemory, needsHuman, type PlanLite, type StepLite } from "@/lib/aegis-os";
import { ArrowLeft } from "lucide-react";

type Plan = PlanLite & { id: string; goal: string; owner?: string | null; due_date?: string | null; created_at?: string };
type Step = StepLite & { plan_id: string };
const TABS = ["COMMAND CENTER", "MUNKA ÁLLAPOT", "WORKFORCE", "HUMAN GATE", "POLICY · ZERO-TRUST", "FAILURE MEMORY"] as const;
const failLabel: Record<string, string> = { step_failed: "Hibás lépés", aegis_blocked: "AEGIS blokkolt eredmény", aegis_weak_evidence: "Gyenge bizonyíték", aegis_tamper: "Jóváhagyás utáni átírás", cancelled: "Megszakított terv", aegis_full_stop: "Vészleállítással leállított terv", aegis_policy: "Szabály (policy) tiltotta" };

const AiWorkforce = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState<(typeof TABS)[number]>(new URLSearchParams(window.location.search).get("tab") === "munka" ? "MUNKA ÁLLAPOT" : "COMMAND CENTER");
  useEffect(() => { const h = () => setTab("MUNKA ÁLLAPOT"); window.addEventListener("wf-tab-munka", h); return () => window.removeEventListener("wf-tab-munka", h); }, []);
  const [d, setD] = useState<{ plans: Plan[]; steps: Step[]; audit: { action: string; created_at: string }[]; ev: { action: string; findings: string[]; created_at: string }[]; inc: number; agents: { state: string }[]; paused: boolean; mode: string; ledger: { ok: boolean; checked: number } | null } | null>(null);
  useEffect(() => { if (!loading && !isAdmin) navigate("/"); }, [loading, isAdmin, navigate]);
  useEffect(() => {
    if (!isAdmin) return;
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    Promise.all([
      supabase.from("workforce_plans").select("id,goal,status,risk,approval_expires_at,owner,due_date,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("workforce_plan_steps").select("plan_id,status"),
      supabase.from("workforce_audit").select("action,created_at").gte("created_at", since).limit(1000),
      supabase.from("aegis_events").select("action,findings,created_at").gte("created_at", since).limit(1000),
      supabase.from("aegis_incidents").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("aegis_agent_controls").select("state"),
      supabase.from("empyrean_emergency_controls").select("paused"),
      supabase.from("aegis_settings").select("input_mode").maybeSingle(),
      supabase.rpc("aegis_verify_ledger"),
    ]).then(([p, s, a, e, i, ag, em, st, l]) => setD({
      plans: (p.data ?? []) as Plan[], steps: (s.data ?? []) as Step[], audit: a.data ?? [], ev: (e.data ?? []) as never,
      inc: i.count ?? 0, agents: ag.data ?? [], paused: (em.data ?? []).some((r: { paused: boolean }) => r.paused),
      mode: (st.data as { input_mode?: string } | null)?.input_mode ?? "?", ledger: l.data as never,
    }));
  }, [isAdmin, reload]);
  if (loading || !isAdmin) return <div className="min-h-screen flex items-center justify-center">…</div>;

  const stepsOf = (id: string) => d?.steps.filter((s) => s.plan_id === id) ?? [];
  const states = (d?.plans ?? []).map((p) => planState(p, stepsOf(p.id)));
  const cnt = (x: string) => states.filter((s) => s === x).length;
  const gate = (d?.plans ?? []).filter((p) => needsHuman(p));
  const blocked = d?.ev.filter((e) => e.action === "blocked").length ?? 0;
  const restricted = d?.agents.filter((a) => a.state !== "active").length ?? 0;
  const failures = failureMemory([
    ...(d?.audit ?? []).filter((a) => failLabel[a.action]).map((a) => ({ code: failLabel[a.action], at: a.created_at })),
    ...(d?.ev ?? []).filter((e) => e.action === "blocked").flatMap((e) => (e.findings.length ? e.findings : ["?"]).map((f) => ({ code: "AEGIS · " + (aegisLabel[f.replace(/^(block|warn|global):/, "")] ?? f), at: e.created_at }))),
  ]);
  const kpi: [string, string | number, boolean?][] = [
    ["Aktív terv", cnt("ASSIGNED") + cnt("EXECUTING")], ["Emberi döntésre vár", gate.length, gate.length > 0],
    ["Nyitott incidens", d?.inc ?? "…", (d?.inc ?? 0) > 0], ["AEGIS blokk (30 nap)", blocked],
    ["Korlátozott ügynök", restricted, restricted > 0], ["Vészleállítás", d ? (d.paused ? "AKTÍV" : "ki") : "…", d?.paused],
    ["Bemeneti mód", d?.mode === "block" ? "szigorú" : d?.mode ?? "…", d?.mode !== "block"], ["Napló sértetlen", d?.ledger ? (d.ledger.ok ? `igen (${d.ledger.checked})` : "NEM") : "…", d?.ledger ? !d.ledger.ok : false],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest"><ArrowLeft className="h-3 w-3" /> Admin</Link>
        <header className="space-y-1">
          <p className="text-xs tracking-widest text-accent">AI INTELLIGENCE OPERATING SYSTEM · AEGIS</p>
          <h1 className="text-2xl font-medium">AI WORKFORCE · Central AI + AEGIS őr</h1>
          <p className="text-xs text-muted-foreground">Az AI nem kap korlátlan hatalmat — kapacitást, kontextust, eszközt és felelősségi kört kap.</p>
        </header>
        <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-border border border-border text-[11px]" aria-label="AEGIS lánc">
          {PIPELINE.map((s, i) => <li key={s} className="bg-background p-2"><span className="text-accent">{i + 1}</span> {s}</li>)}
        </ol>
        <nav className="flex flex-wrap gap-px bg-border border border-border">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-xs tracking-widest ${tab === t ? "bg-accent text-accent-foreground" : "bg-background"}`}>{t}</button>)}
        </nav>

        {tab === "COMMAND CENTER" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
              {kpi.map(([l, v, warn]) => <div key={l} className="bg-background p-3"><p className="text-[11px] text-muted-foreground">{l}</p><p onClick={l === "Emberi döntésre vár" ? () => setTab("HUMAN GATE") : undefined} className={`text-xl ${l === "Emberi döntésre vár" ? "cursor-pointer underline " : ""}${warn ? "text-destructive" : ""}`}>{v}</p></div>)}
            </div>
            {(() => {
              const real = (d?.plans ?? []).filter((p) => !/pr[óo]ba|teszt|test/i.test(p.goal) && p.status !== "cancelled");
              const rs = d?.steps.filter((s) => real.some((p) => p.id === s.plan_id)) ?? []; const ok = rs.filter((s) => s.status === "done").length;
              const late = real.filter((p) => p.due_date && p.status !== "done" && new Date(p.due_date + "T23:59:59") < new Date()).length;
              return (
                <section className="border border-border p-3 space-y-2 cursor-pointer" onClick={() => setTab("MUNKA ÁLLAPOT")}>
                  <div className="flex justify-between"><h2 className="text-lg font-medium">Valós munkák</h2><span className="text-xs underline text-accent">Munka állapot →</span></div>
                  <div className="flex flex-wrap gap-4 text-xs"><span>Terv: <strong>{real.length}</strong></span><span>Kész terv: <strong>{real.filter((p) => p.status === "done").length}</strong></span><span>Lépés: <strong>{ok}/{rs.length}</strong></span><span className={late ? "text-destructive" : ""}>Lejárt: <strong>{late}</strong></span></div>
                  <div className="h-1.5 bg-muted"><div className="h-1.5 bg-accent" style={{ width: `${rs.length ? (ok / rs.length) * 100 : 0}%` }} /></div>
                </section>
              );
            })()}
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Állapotgép</h2>
              <div className="flex flex-wrap gap-2 text-xs">
                {["WAITING_APPROVAL", "ASSIGNED", "EXECUTING", "FAILED", "ESCALATED", "COMPLETED"].map((s) => <span key={s} className="border border-border px-2 py-1">{s}: <strong>{cnt(s)}</strong></span>)}
              </div>
              <ul className="space-y-1 text-xs">
                {(d?.plans ?? []).slice(0, 15).map((p, i) => {
                  const reach = pipelineReach(p, stepsOf(p.id));
                  return (
                    <li key={p.id} className="border border-border p-2 space-y-1">
                      <div className="flex justify-between gap-2"><span className="truncate">{p.risk === "red" ? "🔴" : p.risk === "yellow" ? "🟡" : "🟢"} {p.goal}</span><span className="text-muted-foreground shrink-0">{states[i]}</span></div>
                      <div className="grid grid-cols-8 gap-px" aria-label={`${reach}/8`}>{PIPELINE.map((s, k) => <span key={s} title={s} className={`h-1 ${k < reach ? "bg-accent" : "bg-muted"}`} />)}</div>
                    </li>
                  );
                })}
                {d && d.plans.length === 0 && <li className="text-muted-foreground">Még nincs mentett munkaterv.</li>}
              </ul>
            </section>
          </div>
        )}
        {tab === "MUNKA ÁLLAPOT" && <WorkforceWorkStatus />}
        {tab === "WORKFORCE" && <EmpyreanAiWorld />}
        {tab === "HUMAN GATE" && (
          <div className="space-y-8">
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Emberi döntésre vár ({gate.length})</h2>
              <p className="text-xs text-muted-foreground">Magas kockázatnál nincs automatikus végrehajtás: javaslat → kockázat → ellenőrzés → ember → végrehajtás. Itt dönthetsz.</p>
              <AegisApprovalQueue plans={gate} onDone={() => setReload((r) => r + 1)} />
            </section>
            <AegisFullStop />
            <EmpyreanAegisKillSwitch />
            <EmpyreanAegisIncidents />
          </div>
        )}
        {tab === "POLICY · ZERO-TRUST" && <AegisPolicyZeroTrust />}
        {tab === "FAILURE MEMORY" && (
          <div className="space-y-8">
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Hibamemória · elmúlt 30 nap</h2>
              <p className="text-xs text-muted-foreground">Mi nem működött, hányszor, és mikor utoljára — hogy ne ismétlődjön meg.</p>
              <table className="w-full text-xs border border-border">
                <thead><tr className="text-left text-muted-foreground"><th className="p-2">Mi</th><th className="p-2">Hányszor</th><th className="p-2">Utoljára</th></tr></thead>
                <tbody>{failures.map((f) => <tr key={f.code} className="border-t border-border"><td className="p-2">{f.code}</td><td className="p-2">{f.count}</td><td className="p-2">{new Date(f.last).toLocaleString("hu-HU")}</td></tr>)}</tbody>
              </table>
              {d && failures.length === 0 && <p className="text-xs text-muted-foreground">Nincs rögzített hiba.</p>}
            </section>
            <EmpyreanAegisEvents />
          </div>
        )}
      </div>
    </div>
  );
};
export default AiWorkforce;
