import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Check, Clock, Crown, ListChecks, Lock, RefreshCw,
  RotateCcw, Shield, Square, Terminal, TriangleAlert, Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { allowedOperations, buildSeoProposal, executiveRoles, hasIndependentVerification } from "@/lib/empyrean-contracts";

type Destination = "ai_command_center" | "permissions" | "platform_kpi" | "products" | "financial_center" | "ai_agent_bus";

type Approval = {
  action_id: string; approved_by: string; payload_hash: string;
  target_version: string; expires_at: string; decided_at: string; decision: string;
};
type Receipt = {
  action_id: string; executor_id: string; executed_at: string; status: string;
  result: Json | null; error: string | null; rollback_ref: Json | null;
  verifier_id: string | null; verified_at: string | null; verification: Json | null; evidence_id: string | null;
};
type ActionRow = {
  id: string; capability: string; target_table: string; target_id: string; tenant_id: string | null;
  payload: Json; payload_hash: string; base_state: Json; base_version: string; state: string;
  created_by: string; created_at: string; updated_at: string; idempotency_key: string | null;
  empyrean_approvals?: Approval | Approval[] | null;
  empyrean_execution_receipts?: Receipt | Receipt[] | null;
};
type AuditRow = { id: number; at: string; actor_id: string | null; agent_slug: string | null; action: string; target: string | null; detail: Json | null };
type CapabilityRow = { capability: string; target_table: string; risk_level: string; requires_approval: boolean; enabled: boolean; allowed_fields: string[]; description: string | null };
type ControlRow = { scope: string; paused: boolean; read_only: boolean; reason: string | null; updated_at: string };
type ProductRow = { id: string; title: string; status: string; category: string | null; tags: string[] | null; description: string | null; updated_at: string };

const FIELD_LABELS: Record<string, string> = {
  title: "Cím", description: "Leírás", category: "Kategória", tags: "Címkék",
};
const FINAL_STATES = new Set(["VERIFIED", "ROLLED_BACK", "EXPIRED", "CANCELLED", "REJECTED"]);

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function EmpyreanControlPlane({ onOpen }: { onOpen: (destination: Destination) => void }) {
  const [view, setView] = useState<"COMMAND" | "MISSIONS" | "CONTROL">("COMMAND");
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [counts, setCounts] = useState<{ products: number; storefronts: number }>({ products: 0, storefronts: 0 });
  const [loadedAt, setLoadedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [notice2, setNotice2] = useState("");

  // proposal editor
  const [productId, setProductId] = useState("");
  const [included, setIncluded] = useState<Record<string, boolean>>({ title: true, description: true, category: false, tags: false });
  const [draft, setDraft] = useState<{ title: string; description: string; category: string; tags: string }>({ title: "", description: "", category: "", tags: "" });
  const [approvalMinutes, setApprovalMinutes] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [actionRes, auditRes, controlRes, capRes, productRes, productCount, storefrontCount] = await Promise.all([
        supabase.from("empyrean_actions")
          .select("*, empyrean_approvals(*), empyrean_execution_receipts(*)")
          .order("created_at", { ascending: false }).limit(50),
        supabase.from("empyrean_audit_log").select("*").order("at", { ascending: false }).limit(40),
        supabase.from("empyrean_emergency_controls").select("*"),
        supabase.from("empyrean_capabilities").select("*").order("capability"),
        supabase.from("partner_products").select("id,title,status,category,tags,description,updated_at").order("updated_at", { ascending: false }).limit(200),
        supabase.from("partner_products").select("*", { count: "exact", head: true }),
        supabase.from("partner_storefronts").select("*", { count: "exact", head: true }).eq("is_published", true),
      ]);
      if (actionRes.error || auditRes.error || controlRes.error || capRes.error || productRes.error) {
        throw new Error("Az EMPYREAN irányítóadatai most nem olvashatók. Próbáld újra.");
      }
      setActions((actionRes.data ?? []) as ActionRow[]);
      setAudit((auditRes.data ?? []) as AuditRow[]);
      setControls((controlRes.data ?? []) as ControlRow[]);
      setCapabilities((capRes.data ?? []) as CapabilityRow[]);
      setProducts((productRes.data ?? []) as ProductRow[]);
      setCounts({ products: productCount.count ?? 0, storefronts: storefrontCount.count ?? 0 });
      setLoadedAt(new Date().toISOString());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Az adatok betöltése sikertelen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const control = controls.find((row) => row.scope === "global");
  const paused = control?.paused ?? true;
  const selected = products.find((row) => row.id === productId);

  const openMissions = actions.filter((row) => !FINAL_STATES.has(row.state)).length;
  const verifiedCount = actions.filter((row) => {
    const receipt = one(row.empyrean_execution_receipts);
    return hasIndependentVerification({
      status: row.state === "VERIFIED" ? "VERIFIED" : "PENDING",
      executorId: receipt?.executor_id,
      verifierId: receipt?.verifier_id ?? undefined,
      evidenceId: receipt?.evidence_id ?? undefined,
    });
  }).length;

  const proposalPayload = useMemo(
    () => buildSeoProposal({ included, draft }) as Record<string, Json>,
    [included, draft],
  );

  const pickProduct = (id: string) => {
    setProductId(id);
    const row = products.find((item) => item.id === id);
    setDraft({
      title: row?.title ?? "",
      description: row?.description ?? "",
      category: row?.category ?? "",
      tags: (row?.tags ?? []).join(", "),
    });
    setNotice("");
  };

  const run = async (key: string, task: () => Promise<{ error: { message: string } | null }>) => {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const { error: failure } = await task();
      if (failure) {
        setError(failure.message);
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy("");
    }
  };

  const submitProposal = async () => {
    if (!selected) { setError("Válassz terméket a javaslathoz."); return; }
    if (Object.keys(proposalPayload).length === 0) { setError("Jelölj ki legalább egy módosított mezőt."); return; }
    const ok = await run("propose", () => supabase.rpc("empyrean_propose_product_seo", {
      _product_id: selected.id,
      _proposal: proposalPayload as Json,
      _idempotency_key: `seo:${selected.id}:${Date.now()}`,
    }));
    if (ok) {
      setNotice("Javaslat rögzítve. A jóváhagyás a csomag hash-jéhez és a termék verziójához kötött.");
      setView("MISSIONS");
    }
  };

  const approve = async (row: ActionRow) => {
    const minutes = Number(approvalMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) { setError("A jóváhagyás időtartama csak pozitív perc lehet."); return; }
    const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
    await run(`approve:${row.id}`, () => supabase.rpc("empyrean_approve_action", {
      _action_id: row.id,
      _payload_hash: row.payload_hash,
      _target_version: row.base_version,
      _expires_at: expiresAt,
    }));
  };

  const execute = (row: ActionRow) => run(`execute:${row.id}`, () => supabase.rpc("empyrean_execute_action", { _action_id: row.id }));
  const verify = (row: ActionRow) => run(`verify:${row.id}`, () => supabase.rpc("empyrean_verify_action", { _action_id: row.id }));
  const rollback = (row: ActionRow) => run(`rollback:${row.id}`, () => supabase.rpc("empyrean_rollback_action", { _action_id: row.id }));
  const setPause = (next: boolean) => run("pause", () => supabase.rpc("empyrean_set_pause", {
    _paused: next,
    _reason: next ? "Kézi vészleállítás az irányítóközpontból." : "Kézi feloldás az irányítóközpontból.",
  }));

  const tools: { title: string; label: string; destination: Destination }[] = [
    { title: "CATALYST", label: "Termékek és SEO", destination: "products" },
    { title: "IMPERIUM FINANCE", label: "Pénzügyi adatok", destination: "financial_center" },
    { title: "AEGIS SECURITY", label: "Jogosultságok", destination: "permissions" },
    { title: "NEXUS FLOW", label: "Események", destination: "ai_agent_bus" },
    { title: "GENESIS EVOLUTION", label: "Platform KPI", destination: "platform_kpi" },
  ];
  const filteredTools = tools.filter((tool) => `${tool.title} ${tool.label}`.toLocaleLowerCase("hu").includes(query.toLocaleLowerCase("hu")));

  return (
    <section className="empyrean min-h-[70dvh] bg-background text-foreground border border-border p-4 sm:p-8 space-y-8">
      <header className="flex flex-wrap gap-4 items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-accent text-xs"><Crown size={16} /> BLACK CROWN · FOUNDATION</div>
          <h1 className="text-2xl sm:text-4xl font-semibold">EMPYREAN ∞</h1>
          <p className="text-sm text-muted-foreground">Vállalati irányítóközpont · irányított végrehajtás</p>
        </div>
        <Button variant="outline" size="icon" aria-label="Adatok frissítése" title="Adatok frissítése" disabled={loading} onClick={() => void load()}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
      </header>

      <nav className="grid grid-cols-3 border-b border-border" aria-label="EMPYREAN nézetek">
        {(["COMMAND", "MISSIONS", "CONTROL"] as const).map((item, index) => {
          const Icon = [Terminal, ListChecks, Shield][index];
          return (
            <Button key={item} variant={view === item ? "secondary" : "ghost"} className="rounded-none text-xs sm:text-sm gap-2 px-2" onClick={() => setView(item)}>
              <Icon size={15} /><span>{item}</span>
            </Button>
          );
        })}
      </nav>

      <div className="flex flex-wrap gap-2 justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          {paused ? <Lock size={14} className="text-destructive" /> : <Unlock size={14} className="text-accent" />}
          {paused ? "VÉSZLEÁLLÍTÁS AKTÍV — író művelet nem futtatható" : "VÉSZLEÁLLÍTÁS FELOLDVA — író művelet futtatható"}
        </span>
        <span>{loadedAt ? `Forrás: empyrean_* · ${new Date(loadedAt).toLocaleTimeString("hu-HU")}` : "UNKNOWN · nincs ellenőrzött adatpillanatkép"}</span>
      </div>

      {error && <div role="alert" className="border border-destructive p-4 text-destructive text-sm whitespace-pre-wrap">{error}</div>}
      {notice && <p role="status" className="text-sm text-accent border border-accent p-4">{notice}</p>}
      {loading && !loadedAt && <p role="status" className="text-muted-foreground">Adatok betöltése…</p>}

      {view === "COMMAND" && (
        <div className="space-y-8">
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            setNotice2(filteredTools.length
              ? `A keresés ${filteredTools.length} eszközt mutat. A parancsok a MISSIONS nézetben futnak.`
              : "Nincs egyező eszköz. A MISSIONS nézetben SEO-javaslatot adhatsz be.");
          }}>
            <label htmlFor="empyrean-command" className="text-lg font-medium">Mi legyen a következő lépés?</label>
            <div className="flex gap-2">
              <Input id="empyrean-command" className="min-w-0 h-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Termékek, pénzügy, jogosultságok…" />
              <Button type="submit" size="icon" className="h-12 w-12 shrink-0" aria-label="Eszközök keresése"><ArrowRight size={18} /></Button>
            </div>
            {notice2 && <p role="status" className="text-sm text-muted-foreground">{notice2}</p>}
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-4 border-y border-border divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { label: "Termék a katalógusban", value: counts.products },
              { label: "Publikált partner webshop", value: counts.storefronts },
              { label: "Nyitott művelet", value: openMissions },
              { label: "Függetlenül igazolt eredmény", value: verifiedCount },
            ].map((item) => (
              <div key={item.label} className="py-5 sm:px-5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-2xl mt-2">{item.value}</p>
                <span className="text-xs text-muted-foreground">FACT · éles séma</span>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {filteredTools.map((tool) => (
              <Button key={tool.title} variant="outline" className="h-auto py-4 justify-between text-left whitespace-normal" onClick={() => onOpen(tool.destination)}>
                <span><span className="block text-xs text-accent mb-1">{tool.title}</span>{tool.label}</span>
                <ArrowRight size={16} className="shrink-0" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {view === "MISSIONS" && (
        <div className="space-y-8">
          <section className="border border-border p-4 sm:p-6 space-y-4">
            <div>
              <h2 className="text-xl">Új SEO javaslat</h2>
              <p className="text-sm text-muted-foreground mt-1">A javaslat csak javaslat: jóváhagyás, kontrollált mentés, független ellenőrzés és visszaállítás nélkül nem változik semmi.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="empyrean-product" className="text-xs text-muted-foreground">Termék</label>
              <select
                id="empyrean-product"
                className="w-full h-11 bg-background border border-border px-3 text-sm rounded-none"
                value={productId}
                onChange={(event) => pickProduct(event.target.value)}
              >
                <option value="">— válassz terméket —</option>
                {products.map((row) => <option key={row.id} value={row.id}>{row.title} · {row.status}</option>)}
              </select>
            </div>

            {selected && (
              <div className="space-y-4">
                {(["title", "description", "category", "tags"] as const).map((field) => (
                  <div key={field} className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={Boolean(included[field])}
                        onChange={(event) => setIncluded((prev) => ({ ...prev, [field]: event.target.checked }))}
                      />
                      {FIELD_LABELS[field]}{field === "tags" ? " (vesszővel elválasztva)" : ""}
                    </label>
                    {field === "description"
                      ? <Textarea rows={4} className="rounded-none" disabled={!included[field]} value={draft[field]} onChange={(event) => setDraft((prev) => ({ ...prev, [field]: event.target.value }))} />
                      : <Input className="rounded-none h-11" disabled={!included[field]} value={draft[field]} onChange={(event) => setDraft((prev) => ({ ...prev, [field]: event.target.value }))} />}
                  </div>
                ))}

                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2">
                    <label htmlFor="empyrean-expiry" className="text-xs text-muted-foreground">Jóváhagyás érvényessége (perc)</label>
                    <Input id="empyrean-expiry" type="number" min={1} className="rounded-none h-11 w-32" value={approvalMinutes} onChange={(event) => setApprovalMinutes(event.target.value)} />
                  </div>
                  <Button onClick={() => void submitProposal()} disabled={busy === "propose"} className="h-11 rounded-none">
                    <Square size={15} className="mr-2" />{busy === "propose" ? "Rögzítés…" : "Javaslat benyújtása"}
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl">Missziók</h2>
            {actions.length === 0 && <p className="text-sm text-muted-foreground">Nincs rögzített művelet.</p>}
            <div className="space-y-3">
              {actions.map((row) => {
                const approval = one(row.empyrean_approvals);
                const receipt = one(row.empyrean_execution_receipts);
                const product = products.find((item) => item.id === row.target_id);
                const isVerified = hasIndependentVerification({
                  status: row.state === "VERIFIED" ? "VERIFIED" : "PENDING",
                  executorId: receipt?.executor_id,
                  verifierId: receipt?.verifier_id ?? undefined,
                  evidenceId: receipt?.evidence_id ?? undefined,
                });
                const payload = (row.payload ?? {}) as Record<string, Json>;
                const base = (row.base_state ?? {}) as Record<string, Json>;
                return (
                  <article key={row.id} className="border border-border p-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm break-words">{product?.title ?? row.target_id}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{row.capability} · {new Date(row.created_at).toLocaleString("hu-HU")}</p>
                      </div>
                      <span className="text-xs border border-border px-2 py-1 uppercase tracking-wider">{row.state}</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="border border-border p-3 space-y-1">
                        <p className="text-muted-foreground">Csomag hash</p>
                        <p className="break-all">{row.payload_hash.slice(0, 24)}…</p>
                        <p className="text-muted-foreground pt-1">Célverzió</p>
                        <p className="break-all">{row.base_version}</p>
                      </div>
                      <div className="border border-border p-3 space-y-1">
                        <p className="text-muted-foreground">Jóváhagyás</p>
                        {approval
                          ? <p className={new Date(approval.expires_at).getTime() > Date.now() ? "text-verified" : "text-destructive"}>
                              {approval.decision} · {new Date(approval.expires_at).toLocaleString("hu-HU")}
                            </p>
                          : <p className="text-muted-foreground">nincs</p>}
                        <p className="text-muted-foreground pt-1">Ellenőrzés</p>
                        <p className={isVerified ? "text-verified" : "text-muted-foreground"}>
                          {isVerified ? `IGAZOLT · ${(receipt?.evidence_id ?? "").slice(0, 18)}…` : "nem függetlenül igazolt"}
                        </p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      {Object.keys(payload).map((field) => (
                        <div key={field} className="border border-border p-3 space-y-2">
                          <p className="text-muted-foreground">{FIELD_LABELS[field] ?? field}</p>
                          <p className="line-through text-muted-foreground break-words">{String(base[field] ?? "—")}</p>
                          <p className="text-accent break-words">{String(payload[field])}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {allowedOperations(row.state).includes("approve") && (
                        <Button size="sm" variant="outline" className="rounded-none" disabled={busy === `approve:${row.id}`} onClick={() => void approve(row)}>
                          <Check size={14} className="mr-2" />Jóváhagyás
                        </Button>
                      )}
                      {allowedOperations(row.state).includes("execute") && (
                        <Button size="sm" variant="outline" className="rounded-none" disabled={busy === `execute:${row.id}` || paused} onClick={() => void execute(row)}>
                          <ArrowRight size={14} className="mr-2" />Végrehajtás
                        </Button>
                      )}
                      {allowedOperations(row.state).includes("verify") && (
                        <Button size="sm" variant="outline" className="rounded-none" disabled={busy === `verify:${row.id}`} onClick={() => void verify(row)}>
                          <Shield size={14} className="mr-2" />Független ellenőrzés
                        </Button>
                      )}
                      {allowedOperations(row.state).includes("rollback") && (
                        <Button size="sm" variant="outline" className="rounded-none" disabled={busy === `rollback:${row.id}`} onClick={() => void rollback(row)}>
                          <RotateCcw size={14} className="mr-2" />Visszaállítás
                        </Button>
                      )}
                      {row.state === "APPROVED" && paused && <span className="text-xs text-destructive flex items-center gap-2"><Lock size={13} /> a vészleállítás blokkolja</span>}
                      {receipt?.error && <p className="text-xs text-destructive break-words">{receipt.error}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {view === "CONTROL" && (
        <div className="space-y-8">
          <section className="flex gap-3 border border-border p-4 sm:p-6">
            <Shield className="text-accent shrink-0" />
            <div className="space-y-3 w-full">
              <h2 className="text-xl">Vészleállítás</h2>
              <p className="text-sm text-muted-foreground">
                {paused
                  ? "A globális, szerveroldali kapu zárva: egy jóváhagyott művelet sem hajtható végre."
                  : "A kapu nyitva: a jóváhagyott műveletek végrehajthatók."}
              </p>
              {control?.reason && <p className="text-xs text-muted-foreground">{control.reason}</p>}
              <div className="flex flex-wrap gap-2">
                {paused ? (
                  <Button size="sm" variant="outline" className="rounded-none" disabled={busy === "pause"} onClick={() => void setPause(false)}>
                    <Unlock size={14} className="mr-2" />Feloldás
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="rounded-none text-destructive border-destructive" disabled={busy === "pause"} onClick={() => void setPause(true)}>
                    <Lock size={14} className="mr-2" />Vészleállítás
                  </Button>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-2"><Clock size={13} />{control ? new Date(control.updated_at).toLocaleString("hu-HU") : "ismeretlen"}</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm">Engedélyezett képességek</h3>
            <div className="divide-y divide-border border border-border">
              {capabilities.map((row) => (
                <div key={row.capability} className="p-4 flex flex-wrap justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="text-sm">{row.capability}</p>
                    <p className="text-muted-foreground mt-1">{row.description}</p>
                    <p className="text-muted-foreground">mezők: {row.allowed_fields.join(", ")}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-accent">{row.risk_level}</p>
                    <p className="text-muted-foreground">{row.requires_approval ? "jóváhagyás kötelező" : "jóváhagyás nélküli"}</p>
                    <p className={row.enabled ? "text-verified" : "text-destructive"}>{row.enabled ? "engedélyezve" : "letiltva"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm flex items-center gap-2"><Activity size={15} className="text-accent" />Audit napló · csak hozzáírható</h3>
            <div className="divide-y divide-border border border-border max-h-[28rem] overflow-y-auto">
              {audit.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nincs bejegyzés.</p>}
              {audit.map((row) => (
                <div key={row.id} className="p-3 text-xs flex flex-wrap justify-between gap-2">
                  <span className="break-all">{row.action} · {row.target ?? "—"}</span>
                  <span className="text-muted-foreground">{new Date(row.at).toLocaleString("hu-HU")}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm">Vezetői szerepek</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {executiveRoles.map((role) => (
                <div key={role} className="border border-border p-3">
                  <Activity size={16} className="text-muted-foreground mb-2" />
                  <span>{role}</span>
                  <p className="text-xs text-muted-foreground mt-1">Jogkör nem igazolt</p>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={() => onOpen("permissions")}><Shield size={16} className="mr-2" />Jogosultságok megnyitása</Button>
          </section>

          <section className="border border-border p-4 space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><TriangleAlert size={14} className="text-accent" />Kikötések</p>
            <p>A független ellenőrzést nem a végrehajtó adminisztrátor végezheti el — a rendszert két különböző adminisztrátori fiókkal kell használni.</p>
            <p>A javaslatok nem publikálnak automatikusan, és a jóváhagyás a csomag hash-jéhez és a termék verziójához kötött.</p>
          </section>
        </div>
      )}
    </section>
  );
}
