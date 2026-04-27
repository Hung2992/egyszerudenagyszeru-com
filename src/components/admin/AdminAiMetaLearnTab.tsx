import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Brain, Play, Check, Undo2, Sparkles, AlertTriangle, TrendingDown } from "lucide-react";

export default function AdminAiMetaLearnTab() {
  const [runs, setRuns] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [principles, setPrinciples] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [r, a, p] = await Promise.all([
      supabase.from("ai_meta_learning_runs").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("ai_meta_actions").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("ai_meta_principles").select("*").eq("is_active", true).order("weight", { ascending: false }).limit(20),
    ]);
    setRuns(r.data || []);
    setActions(a.data || []);
    setPrinciples(p.data || []);
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

  const applyAction = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc("apply_meta_action", { _action_id: id, _user_id: user?.id });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Akció alkalmazva" }); await load(); }
  };

  const revertAction = async (id: string) => {
    const { error } = await supabase.rpc("revert_meta_action", { _action_id: id });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Visszavonva" }); await load(); }
  };

  const togglePrinciple = async (id: string, current: boolean) => {
    await supabase.from("ai_meta_principles").update({ is_active: !current }).eq("id", id);
    await load();
  };

  const lastRun = runs[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Meta-tanulás
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            A rendszer felfedezi a saját mintázatait, gyengeségeit és új viselkedési elveket alkot.
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
            <div><div className="text-muted-foreground text-xs">Új elv</div><div className="font-bold">{Array.isArray(lastRun.patterns_found) ? lastRun.patterns_found.length : 0}</div></div>
          </div>
          {Array.isArray(lastRun.patterns_found) && lastRun.patterns_found.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Felfedezett mintázatok:</div>
              {lastRun.patterns_found.map((p: any, i: number) => (
                <div key={i} className="text-sm flex items-start gap-2">
                  <Badge variant={p.severity === "high" ? "destructive" : p.severity === "medium" ? "default" : "secondary"} className="text-xs">{p.severity}</Badge>
                  <span>{p.pattern}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div>
        <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Javasolt akciók ({actions.filter(a => a.status === "pending").length} függő)</h3>
        <div className="space-y-2">
          {actions.length === 0 && <p className="text-sm text-muted-foreground">Még nincs akció.</p>}
          {actions.map(a => (
            <Card key={a.id} className="p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{a.action_type}</Badge>
                  <Badge variant={a.status === "applied" ? "default" : a.status === "reverted" ? "secondary" : "outline"} className="text-xs">{a.status}</Badge>
                </div>
                <div className="text-sm mt-1 truncate">{a.description}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {a.status === "pending" && <Button size="sm" onClick={() => applyAction(a.id)}><Check className="h-3 w-3 mr-1" />Alkalmaz</Button>}
                {a.status === "applied" && <Button size="sm" variant="outline" onClick={() => revertAction(a.id)}><Undo2 className="h-3 w-3 mr-1" />Visszavonás</Button>}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Aktív meta-elvek ({principles.length})</h3>
        <div className="space-y-2">
          {principles.length === 0 && <p className="text-sm text-muted-foreground">Még nincsenek elvek. Futtasd az elemzést!</p>}
          {principles.map(p => (
            <Card key={p.id} className="p-3 flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className="text-xs">{p.context}</Badge>
                  <Badge variant="secondary" className="text-xs">súly {Number(p.weight).toFixed(2)}</Badge>
                  <Badge variant="outline" className="text-xs">×{p.reinforcement_count}</Badge>
                </div>
                <div className="text-sm">{p.principle}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => togglePrinciple(p.id, p.is_active)}>Letilt</Button>
            </Card>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Betöltés...</p>}
    </div>
  );
}
