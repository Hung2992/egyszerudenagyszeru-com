import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, TrendingUp, Clock, Package, ClipboardList, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Insight {
  id: string;
  drop_id: string;
  insight_type: string;
  prediction: any;
  summary: string | null;
  confidence_score: number | null;
  model_version: string | null;
  generated_at: string;
}

const TYPE_META: Record<string, { label: string; icon: any }> = {
  demand_forecast: { label: "Keresleti előrejelzés", icon: TrendingUp },
  timing: { label: "Optimális időzítés", icon: Clock },
  stock_recommendation: { label: "Készlet javaslat", icon: Package },
  executive_summary: { label: "Vezetői összefoglaló", icon: ClipboardList },
};

const WEEKDAYS = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

export default function DropAiInsightsPanel({ dropId }: { dropId: string }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    // Latest of each type
    const { data } = await supabase
      .from("drop_ai_insights")
      .select("*")
      .eq("drop_id", dropId)
      .order("generated_at", { ascending: false })
      .limit(20);
    // Dedupe: keep newest per insight_type
    const seen = new Set<string>();
    const dedup: Insight[] = [];
    for (const row of (data ?? []) as Insight[]) {
      if (seen.has(row.insight_type)) continue;
      seen.add(row.insight_type);
      dedup.push(row);
    }
    setInsights(dedup);
    setLoading(false);
  };

  useEffect(() => { load(); }, [dropId]);

  const analyze = async () => {
    setGenerating(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) { toast.error("Nincs érvényes session"); return; }
      const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/drop-ai-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ drop_id: dropId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "elemzés_hiba");
      toast.success(`${(json.insights ?? []).length} elemzés kész`);
      if ((json.errors ?? []).length > 0) {
        toast.warning(`${json.errors.length} részelemzés nem sikerült`);
      }
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const renderPrediction = (i: Insight) => {
    const p = i.prediction || {};
    switch (i.insight_type) {
      case "demand_forecast":
        return (
          <div className="space-y-2 text-sm">
            {typeof p.demand_score === "number" && (
              <div>
                <div className="flex justify-between text-xs mb-1"><span>Demand score</span><span className="font-bold">{p.demand_score}/100</span></div>
                <Progress value={p.demand_score} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {p.expected_sellout_minutes != null && (
                <div><span className="text-muted-foreground">Várható elfogyás:</span> <b>{p.expected_sellout_minutes} perc</b></div>
              )}
              {p.recommended_stock_units != null && (
                <div><span className="text-muted-foreground">Ajánlott készlet:</span> <b>{p.recommended_stock_units} db</b></div>
              )}
              {p.recommended_stock_change_pct != null && (
                <div><span className="text-muted-foreground">Változtatás:</span> <b>{p.recommended_stock_change_pct > 0 ? "+" : ""}{p.recommended_stock_change_pct}%</b></div>
              )}
              {p.demand_level && (
                <div><span className="text-muted-foreground">Szint:</span> <Badge variant="outline">{p.demand_level}</Badge></div>
              )}
            </div>
          </div>
        );
      case "timing":
        return (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {p.best_hour_utc != null && <div><span className="text-muted-foreground">Legjobb óra (UTC):</span> <b>{p.best_hour_utc}:00</b></div>}
            {p.best_weekday != null && <div><span className="text-muted-foreground">Legjobb nap:</span> <b>{WEEKDAYS[p.best_weekday] ?? p.best_weekday}</b></div>}
            {p.recommended_launch_iso && <div className="col-span-2"><span className="text-muted-foreground">Javasolt indulás:</span> <b>{new Date(p.recommended_launch_iso).toLocaleString("hu-HU")}</b></div>}
            {p.expected_uplift_pct != null && <div><span className="text-muted-foreground">Várható javulás:</span> <b>+{p.expected_uplift_pct}%</b></div>}
          </div>
        );
      case "stock_recommendation":
        return (
          <div className="space-y-2 text-sm">
            {p.recommended_stock_units != null && (
              <div className="text-xs"><span className="text-muted-foreground">Ajánlott készlet:</span> <b>{p.recommended_stock_units} db</b></div>
            )}
            {Array.isArray(p.risk_flags) && p.risk_flags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.risk_flags.map((f: string) => <Badge key={f} variant="destructive" className="text-[10px]">{f}</Badge>)}
              </div>
            )}
          </div>
        );
      case "executive_summary":
        return (
          <div className="space-y-2 text-xs">
            {p.overall_grade && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Értékelés:</span>
                <Badge className="text-base px-2">{p.overall_grade}</Badge>
              </div>
            )}
            {Array.isArray(p.what_worked) && p.what_worked.length > 0 && (
              <div>
                <div className="font-bold text-[10px] uppercase text-muted-foreground mb-1">Ami működött</div>
                <ul className="list-disc pl-4 space-y-0.5">{p.what_worked.map((x: string, k: number) => <li key={k}>{x}</li>)}</ul>
              </div>
            )}
            {Array.isArray(p.what_did_not_work) && p.what_did_not_work.length > 0 && (
              <div>
                <div className="font-bold text-[10px] uppercase text-muted-foreground mb-1">Ami nem működött</div>
                <ul className="list-disc pl-4 space-y-0.5">{p.what_did_not_work.map((x: string, k: number) => <li key={k}>{x}</li>)}</ul>
              </div>
            )}
            {Array.isArray(p.next_time_recommendations) && p.next_time_recommendations.length > 0 && (
              <div>
                <div className="font-bold text-[10px] uppercase text-muted-foreground mb-1">Legközelebb</div>
                <ul className="list-disc pl-4 space-y-0.5">{p.next_time_recommendations.map((x: string, k: number) => <li key={k}>{x}</li>)}</ul>
              </div>
            )}
          </div>
        );
      default:
        return <pre className="text-[10px] overflow-x-auto">{JSON.stringify(p, null, 2)}</pre>;
    }
  };

  return (
    <Card className="p-4 border-primary/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm uppercase tracking-widest">AI Analytics</h4>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={analyze} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            ✨ Elemezd ezt a dropot
          </Button>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">
          Még nincs AI elemzés. Kattints az "Elemezd ezt a dropot" gombra a generáláshoz.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {insights.map(i => {
            const meta = TYPE_META[i.insight_type] ?? { label: i.insight_type, icon: Sparkles };
            const Icon = meta.icon;
            return (
              <Card key={i.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold text-xs uppercase tracking-wider">{meta.label}</span>
                  </div>
                  {i.confidence_score != null && (
                    <Badge variant="outline" className="text-[10px]">{Math.round(i.confidence_score)}% biz.</Badge>
                  )}
                </div>
                {renderPrediction(i)}
                {i.summary && (
                  <p className="text-xs text-muted-foreground mt-2 italic border-t pt-2">{i.summary}</p>
                )}
                <div className="text-[10px] text-muted-foreground mt-2">
                  {new Date(i.generated_at).toLocaleString("hu-HU")} · {i.model_version}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
