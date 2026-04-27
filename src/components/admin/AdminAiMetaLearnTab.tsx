import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Brain, Play, Check, X, Undo2, Sparkles, AlertTriangle,
  TrendingDown, History, FileText, Clock, GitCompare,
} from "lucide-react";

type Dialogs =
  | { kind: "approvePrinciple"; id: string }
  | { kind: "rejectPrinciple"; id: string }
  | { kind: "approveAction"; id: string }
  | { kind: "rejectAction"; id: string }
  | { kind: "diffPrinciple"; id: string }
  | { kind: "diffStrategy"; id: string }
  | null;

export default function AdminAiMetaLearnTab() {
  const [runs, setRuns] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [principles, setPrinciples] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState<Dialogs>(null);
  const [reason, setReason] = useState("");
  const [effectiveAt, setEffectiveAt] = useState<string>(new Date().toISOString().slice(0, 16));
  const [versions, setVersions] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [r, a, p, s, log] = await Promise.all([
      supabase.from("ai_meta_learning_runs").select("*").order("created_at", { ascending: false }).limit(15),
      supabase.from("ai_meta_actions").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("ai_meta_principles").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("ai_response_strategies").select("*").order("name").limit(20),
      supabase.from("ai_meta_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setRuns(r.data || []);
    setActions(a.data || []);
    setPrinciples(p.data || []);
    setStrategies(s.data || []);
    setAuditLog(log.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runMetaLearn = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-meta-learn", { body: { lookback: 100 } });
      if (error) throw error;
      toast({ title: "Meta-tanulás lefutott", description: data?.insights?.executive_summary?.slice(0, 200) || "Kész" });
      await load();
    } catch (e: any) {
      toast({ title: "Hiba", description: String(e.message || e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  // ─── Approval / rejection ───
  const approvePrinciple = async (id: string) => {
    const { error } = await supabase.rpc("approve_meta_principle", {
      _principle_id: id,
      _effective_at: new Date(effectiveAt).toISOString(),
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Elv jóváhagyva" }); setDlg(null); await load(); }
  };
  const rejectPrinciple = async (id: string) => {
    if (!reason.trim()) return toast({ title: "Indoklás kötelező", variant: "destructive" });
    const { error } = await supabase.rpc("reject_meta_principle", { _principle_id: id, _reason: reason });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Elv elutasítva" }); setReason(""); setDlg(null); await load(); }
  };
  const approveAction = async (id: string) => {
    const { error } = await supabase.rpc("approve_meta_action", {
      _action_id: id,
      _effective_at: new Date(effectiveAt).toISOString(),
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Akció jóváhagyva" }); setDlg(null); await load(); }
  };
  const rejectAction = async (id: string) => {
    if (!reason.trim()) return toast({ title: "Indoklás kötelező", variant: "destructive" });
    const { error } = await supabase.rpc("reject_meta_action", { _action_id: id, _reason: reason });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Akció elutasítva" }); setReason(""); setDlg(null); await load(); }
  };

  // ─── Versions / rollback ───
  const openPrincipleVersions = async (id: string) => {
    const { data } = await supabase
      .from("ai_meta_principle_versions")
      .select("*").eq("principle_id", id)
      .order("version_number", { ascending: false }).limit(20);
    setVersions(data || []);
    setDlg({ kind: "diffPrinciple", id });
  };
  const openStrategyVersions = async (id: string) => {
    const { data } = await supabase
      .from("ai_strategy_versions")
      .select("*").eq("strategy_id", id)
      .order("version_number", { ascending: false }).limit(20);
    setVersions(data || []);
    setDlg({ kind: "diffStrategy", id });
  };
  const rollbackPrinciple = async (versionId: string) => {
    const { error } = await supabase.rpc("rollback_meta_principle", { _version_id: versionId });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Visszaállítva", description: "A változás függő jóváhagyásra vár." }); setDlg(null); await load(); }
  };
  const rollbackStrategy = async (versionId: string) => {
    const { error } = await supabase.rpc("rollback_strategy", { _version_id: versionId });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Stratégia visszaállítva" }); setDlg(null); await load(); }
  };

  const lastRun = runs[0];
  const pendingPrinciples = principles.filter(p => p.approval_status === "pending");
  const approvedPrinciples = principles.filter(p => p.approval_status === "approved");
  const pendingActions = actions.filter(a => a.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Meta-tanulás
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verziózás, jóváhagyás és audit napló — semmi nem aktív admin engedély nélkül.
          </p>
        </div>
        <Button onClick={runMetaLearn} disabled={running} size="lg">
          <Play className="h-4 w-4 mr-2" /> {running ? "Fut..." : "Meta-elemzés indítása"}
        </Button>
      </div>

      {lastRun && (
        <Card className="p-4 border-primary/40">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold">Legutóbbi futás</span>
            <span className="text-xs text-muted-foreground">{new Date(lastRun.created_at).toLocaleString("hu-HU")}</span>
          </div>
          <p className="text-sm mb-3">{lastRun.summary || "—"}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-muted-foreground text-xs">Reflexió</div><div className="font-bold">{lastRun.reflections_analyzed}</div></div>
            <div><div className="text-muted-foreground text-xs">Feedback</div><div className="font-bold">{lastRun.feedback_analyzed}</div></div>
            <div><div className="text-muted-foreground text-xs">Önámítás</div><div className="font-bold flex items-center gap-1">{Number(lastRun.self_deception_score).toFixed(2)}{lastRun.self_deception_score > 0.3 && <AlertTriangle className="h-3 w-3 text-destructive" />}</div></div>
            <div><div className="text-muted-foreground text-xs">Mintázat</div><div className="font-bold">{Array.isArray(lastRun.patterns_found) ? lastRun.patterns_found.length : 0}</div></div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="pending">Függő ({pendingPrinciples.length + pendingActions.length})</TabsTrigger>
          <TabsTrigger value="principles">Aktív elvek ({approvedPrinciples.length})</TabsTrigger>
          <TabsTrigger value="strategies">Stratégiák</TabsTrigger>
          <TabsTrigger value="runs">Futtatások</TabsTrigger>
          <TabsTrigger value="audit">Audit napló</TabsTrigger>
        </TabsList>

        {/* ─── PENDING ─── */}
        <TabsContent value="pending" className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-sm">Függő meta-elvek ({pendingPrinciples.length})</h3>
            <div className="space-y-2">
              {pendingPrinciples.length === 0 && <p className="text-sm text-muted-foreground">Nincs függő elv.</p>}
              {pendingPrinciples.map(p => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className="text-xs">{p.context}</Badge>
                        <Badge variant="secondary" className="text-xs">súly {Number(p.weight).toFixed(2)}</Badge>
                        <Badge variant="outline" className="text-xs">v{p.current_version}</Badge>
                      </div>
                      <p className="text-sm">{p.principle}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" onClick={() => setDlg({ kind: "approvePrinciple", id: p.id })}><Check className="h-3 w-3 mr-1" />Jóváhagy</Button>
                      <Button size="sm" variant="destructive" onClick={() => setDlg({ kind: "rejectPrinciple", id: p.id })}><X className="h-3 w-3 mr-1" />Elutasít</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Függő akciók ({pendingActions.length})</h3>
            <div className="space-y-2">
              {pendingActions.length === 0 && <p className="text-sm text-muted-foreground">Nincs függő akció.</p>}
              {pendingActions.map(a => (
                <Card key={a.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs mb-1">{a.action_type}</Badge>
                      <div className="text-sm">{a.description}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" onClick={() => setDlg({ kind: "approveAction", id: a.id })}><Check className="h-3 w-3 mr-1" />Jóváhagy</Button>
                      <Button size="sm" variant="destructive" onClick={() => setDlg({ kind: "rejectAction", id: a.id })}><X className="h-3 w-3 mr-1" />Elutasít</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ─── ACTIVE PRINCIPLES ─── */}
        <TabsContent value="principles" className="space-y-2">
          {approvedPrinciples.length === 0 && <p className="text-sm text-muted-foreground">Még nincs aktív elv.</p>}
          {approvedPrinciples.map(p => (
            <Card key={p.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className="text-xs">{p.context}</Badge>
                    <Badge variant="secondary" className="text-xs">súly {Number(p.weight).toFixed(2)}</Badge>
                    <Badge variant="outline" className="text-xs">v{p.current_version}</Badge>
                    {p.effective_at && <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />{new Date(p.effective_at).toLocaleDateString("hu-HU")}</Badge>}
                  </div>
                  <div className="text-sm">{p.principle}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openPrincipleVersions(p.id)}>
                  <History className="h-3 w-3 mr-1" />Verziók
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* ─── STRATEGIES ─── */}
        <TabsContent value="strategies" className="space-y-2">
          {strategies.map(s => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{s.name}</span>
                    <Badge variant="outline" className="text-xs">v{s.current_version}</Badge>
                    {!s.is_active && <Badge variant="destructive" className="text-xs">inaktív</Badge>}
                    <Badge variant="secondary" className="text-xs">win {Number(s.win_rate).toFixed(2)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openStrategyVersions(s.id)}>
                  <History className="h-3 w-3 mr-1" />Verziók
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* ─── RUNS ─── */}
        <TabsContent value="runs" className="space-y-2">
          {runs.map(r => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                <Badge variant="outline">{r.run_type}</Badge>
                <span>{new Date(r.created_at).toLocaleString("hu-HU")}</span>
              </div>
              <p className="text-sm mb-2">{r.summary || "—"}</p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Reflexió: <b>{r.reflections_analyzed}</b></span>
                <span>Feedback: <b>{r.feedback_analyzed}</b></span>
                <span>Önámítás: <b>{Number(r.self_deception_score).toFixed(2)}</b></span>
                <span>Akció: <b>{Array.isArray(r.recommended_actions) ? r.recommended_actions.length : 0}</b></span>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* ─── AUDIT LOG ─── */}
        <TabsContent value="audit" className="space-y-2">
          <p className="text-xs text-muted-foreground">Minden meta-tanulási és jóváhagyási esemény nyoma.</p>
          {auditLog.length === 0 && <p className="text-sm text-muted-foreground">Még nincs naplóbejegyzés.</p>}
          {auditLog.map(l => (
            <Card key={l.id} className="p-3">
              <div className="flex items-center gap-2 mb-1 text-xs flex-wrap">
                <Badge variant={l.decision === "approved" ? "default" : l.decision === "rejected" ? "destructive" : "secondary"} className="text-xs">{l.event_type}</Badge>
                {l.target_table && <Badge variant="outline" className="text-xs">{l.target_table}</Badge>}
                <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("hu-HU")}</span>
                <span className="text-muted-foreground">{l.actor_role}</span>
              </div>
              {l.reason && <p className="text-sm">📝 {l.reason}</p>}
              {l.output_payload && Object.keys(l.output_payload).length > 0 && (
                <pre className="text-[10px] bg-muted p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(l.output_payload, null, 2)}</pre>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* ─── DIALOGS ─── */}
      <Dialog open={dlg?.kind === "approvePrinciple" || dlg?.kind === "approveAction"} onOpenChange={() => setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Jóváhagyás — érvénybe lépés</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Mikortól lépjen érvénybe?</Label>
            <Input type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} />
            <p className="text-xs text-muted-foreground">Az AI csak ettől az időponttól kezdi alkalmazni.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Mégse</Button>
            <Button onClick={() => {
              if (dlg?.kind === "approvePrinciple") approvePrinciple(dlg.id);
              else if (dlg?.kind === "approveAction") approveAction(dlg.id);
            }}><Check className="h-4 w-4 mr-1" />Jóváhagy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg?.kind === "rejectPrinciple" || dlg?.kind === "rejectAction"} onOpenChange={() => { setDlg(null); setReason(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Elutasítás indoklása</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Miért utasítod el? (kötelező)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Pl. Ez az elv ütközik a céges hangnemmel..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDlg(null); setReason(""); }}>Mégse</Button>
            <Button variant="destructive" onClick={() => {
              if (dlg?.kind === "rejectPrinciple") rejectPrinciple(dlg.id);
              else if (dlg?.kind === "rejectAction") rejectAction(dlg.id);
            }}><X className="h-4 w-4 mr-1" />Elutasít</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg?.kind === "diffPrinciple" || dlg?.kind === "diffStrategy"} onOpenChange={() => setDlg(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GitCompare className="h-5 w-5" />Verziótörténet és visszaállítás</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {versions.length === 0 && <p className="text-sm text-muted-foreground">Még nincs korábbi verzió.</p>}
            {versions.map((v, i) => {
              const next = versions[i - 1];
              const isLatest = i === 0;
              const changedKeys = next
                ? Object.keys(v.snapshot || {}).filter(k => JSON.stringify(v.snapshot[k]) !== JSON.stringify(next.snapshot?.[k]))
                : [];
              return (
                <Card key={v.id} className={`p-3 ${isLatest ? "border-primary" : ""}`}>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge>v{v.version_number}</Badge>
                      {isLatest && <Badge variant="default" className="text-xs">jelenlegi</Badge>}
                      <Badge variant="outline" className="text-xs">{v.change_type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("hu-HU")}</span>
                    </div>
                    {!isLatest && (
                      <Button size="sm" variant="outline" onClick={() =>
                        dlg?.kind === "diffPrinciple" ? rollbackPrinciple(v.id) : rollbackStrategy(v.id)
                      }>
                        <Undo2 className="h-3 w-3 mr-1" />Visszaállítás
                      </Button>
                    )}
                  </div>
                  {changedKeys.length > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-muted-foreground">Változások az előző verzióhoz:</div>
                      {changedKeys.slice(0, 6).map(k => (
                        <div key={k} className="grid grid-cols-[80px_1fr] gap-2">
                          <span className="text-muted-foreground">{k}:</span>
                          <div className="space-y-0.5">
                            <div className="line-through text-destructive/70 truncate">{JSON.stringify(next.snapshot[k])?.slice(0, 120)}</div>
                            <div className="text-primary truncate">{JSON.stringify(v.snapshot[k])?.slice(0, 120)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!next && (
                    <div className="text-xs">
                      <div className="font-semibold text-muted-foreground mb-1">Pillanatkép:</div>
                      <pre className="bg-muted p-2 rounded overflow-x-auto text-[10px]">
                        {JSON.stringify({
                          principle: v.snapshot?.principle,
                          name: v.snapshot?.name,
                          weight: v.snapshot?.weight,
                          is_active: v.snapshot?.is_active,
                          approval_status: v.snapshot?.approval_status,
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {loading && <p className="text-sm text-muted-foreground">Betöltés...</p>}
    </div>
  );
}
