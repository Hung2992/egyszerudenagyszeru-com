import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Workflow, Sparkles, Play, Trash2, History, Zap, Loader2 } from "lucide-react";

interface Props { partnerId: string | null }

const TRIGGER_LABELS: Record<string, string> = {
  "order.created": "Új rendelés érkezik",
  "order.paid": "Rendelés kifizetve",
  "order.shipped": "Rendelés kiszállítva",
  "product.low_stock": "Alacsony készlet",
  "product.created": "Új termék",
  "lead.created": "Új érdeklődő",
  "customer.signup": "Új regisztráció",
  "cart.abandoned": "Elhagyott kosár",
  "storefront.published": "Webshop publikálva",
  "review.created": "Új értékelés",
  "schedule.daily": "Napi ütemezés",
};

const STEP_LABELS: Record<string, string> = {
  send_email: "E-mail küldés",
  social_post: "Közösségi poszt",
  notify_admin: "Belső értesítés",
  agent_event: "Agent Bus esemény",
  webhook: "Webhook hívás",
  ai_generate_text: "AI szöveg",
  wait: "Várakozás",
  log: "Naplózás",
};

const PartnerWorkflowsTab = ({ partnerId }: Props) => {
  const [prompt, setPrompt] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!partnerId) return;
    const { data } = await supabase.from("partner_workflows").select("*")
      .eq("partner_id", partnerId).order("created_at", { ascending: false });
    setWorkflows(data || []);
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const loadRuns = async (wfId: string) => {
    setHistoryFor(wfId);
    const { data } = await supabase.from("partner_workflow_runs").select("*")
      .eq("workflow_id", wfId).order("created_at", { ascending: false }).limit(20);
    setRuns(data || []);
  };

  const compile = async () => {
    if (!prompt.trim()) return;
    setCompiling(true);
    const { data, error } = await supabase.functions.invoke("partner-workflow-engine", {
      body: { action: "compile", prompt },
    });
    setCompiling(false);
    if (error || data?.error) {
      toast({ title: "Hiba", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    setDraft(data.workflow);
  };

  const saveDraft = async () => {
    if (!draft || !partnerId) return;
    const { error } = await supabase.from("partner_workflows").insert({
      partner_id: partnerId,
      name: draft.name || "Névtelen folyamat",
      description: draft.description,
      natural_language: prompt,
      trigger_event: draft.trigger_event,
      steps: draft.steps ?? [],
      is_active: false,
    });
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Folyamat mentve", description: "Kapcsold be az aktiváláshoz." });
    setDraft(null); setPrompt("");
    void load();
  };

  const toggleActive = async (wf: any, v: boolean) => {
    await supabase.from("partner_workflows").update({ is_active: v }).eq("id", wf.id);
    setWorkflows(ws => ws.map(w => w.id === wf.id ? { ...w, is_active: v } : w));
  };

  const testRun = async (wf: any) => {
    setBusyId(wf.id);
    const { data, error } = await supabase.functions.invoke("partner-workflow-engine", {
      body: { action: "test", workflow_id: wf.id, payload: { order: { id: "TEST-1", email: "teszt@pelda.hu", total: 12990 } } },
    });
    setBusyId(null);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Próbafutás kész", description: `${data.step_results?.length ?? 0} lépés szimulálva (${data.duration_ms} ms)` });
    setRuns(data.step_results?.map((r: any, i: number) => ({ id: `sim-${i}`, simulated: true, ...r })) ?? []);
    setHistoryFor(wf.id);
  };

  const remove = async (wf: any) => {
    if (!confirm(`Törlöd a(z) "${wf.name}" folyamatot?`)) return;
    await supabase.from("partner_workflows").delete().eq("id", wf.id);
    void load();
  };

  if (!partnerId) return <p className="text-sm text-muted-foreground">Partner profil szükséges.</p>;

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-foreground/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-accent" />
          <h3 className="font-bold uppercase tracking-widest text-sm">AI Workflow Builder</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Írd le magyarul, mi történjen automatikusan. Példa: „Ha új rendelés érkezik, küldj e-mailt a vevőnek,
          készíts Facebook posztot és értesítsd a raktárt.”
        </p>
        <Textarea rows={3} className="rounded-none" value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Ha új rendelés érkezik, akkor…" />
        <Button className="rounded-none" onClick={compile} disabled={compiling || !prompt.trim()}>
          {compiling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Folyamat összeállítása
        </Button>

        {draft && (
          <div className="border border-foreground/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Input className="rounded-none max-w-sm text-sm" value={draft.name || ""}
                onChange={e => setDraft({ ...draft, name: e.target.value })} />
              <Badge className="rounded-none"><Zap className="h-3 w-3 mr-1" />{TRIGGER_LABELS[draft.trigger_event] ?? draft.trigger_event}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{draft.description}</p>
            <ol className="space-y-1">
              {(draft.steps ?? []).map((s: any, i: number) => (
                <li key={i} className="text-xs border-l-2 border-accent pl-2">
                  <strong>{i + 1}. {STEP_LABELS[s.type] ?? s.type}</strong> — {s.label}
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-none" onClick={saveDraft}>Mentés</Button>
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => setDraft(null)}>Elvetés</Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {workflows.length === 0 && <p className="text-sm text-muted-foreground">Még nincs folyamatod.</p>}
        {workflows.map(wf => (
          <Card key={wf.id} className="rounded-none border-foreground/20 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold text-sm">{wf.name}</div>
                <div className="text-xs text-muted-foreground">{TRIGGER_LABELS[wf.trigger_event] ?? wf.trigger_event} · {(wf.steps || []).length} lépés · {wf.run_count} futás</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={wf.is_active} onCheckedChange={v => toggleActive(wf, v)} />
                <span className="text-xs">{wf.is_active ? "Aktív" : "Szünetel"}</span>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => testRun(wf)} disabled={busyId === wf.id}>
                  {busyId === wf.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => loadRuns(wf.id)}>
                  <History className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="rounded-none" onClick={() => remove(wf)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {(wf.steps || []).map((s: any, i: number) => (
                <Badge key={i} variant="secondary" className="rounded-none text-[10px]">{STEP_LABELS[s.type] ?? s.type}</Badge>
              ))}
            </div>
            {historyFor === wf.id && (
              <div className="border-t border-foreground/10 pt-2 space-y-1 max-h-64 overflow-auto">
                {runs.length === 0 && <p className="text-xs text-muted-foreground">Nincs futási előzmény.</p>}
                {runs.map((r: any) => (
                  <div key={r.id} className="text-xs flex items-center gap-2">
                    <Badge variant={r.status === "error" || r.status === "failed" ? "destructive" : "secondary"} className="rounded-none text-[10px]">
                      {r.status}
                    </Badge>
                    <span className="truncate">{r.label ?? r.trigger_event} {r.created_at ? `· ${new Date(r.created_at).toLocaleString("hu-HU")}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PartnerWorkflowsTab;
