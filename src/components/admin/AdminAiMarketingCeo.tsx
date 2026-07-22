import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Brain, TrendingUp, CheckCircle2, XCircle, RefreshCw, Sparkles, BarChart3, Rocket } from "lucide-react";

interface Briefing {
  id: string;
  briefing_date: string;
  period: string;
  summary: string;
  highlights: any[];
  metrics: any;
  recommendations: any[];
  next_actions: any[];
  created_at: string;
}
interface Insight {
  id: string;
  platform: string | null;
  category: string;
  title: string;
  insight: string;
  recommendation: string | null;
  confidence: number;
  status: string;
  auto_applied: boolean;
  created_at: string;
}
interface Metric {
  id: string;
  queue_id: string;
  platform: string;
  impressions: number;
  reach: number;
  clicks: number;
  engagement_rate: number | null;
  collected_at: string;
}
interface QueueItem {
  id: string;
  platform: string;
  content: string;
  status: string;
  requires_approval: boolean;
  priority: number;
  scheduled_at: string;
  ai_score: number | null;
}

export default function AdminAiMarketingCeo() {
  const [tab, setTab] = useState("briefing");
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [approvals, setApprovals] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [b, i, m, a] = await Promise.all([
      supabase.from("ai_marketing_briefings").select("*").order("briefing_date", { ascending: false }).limit(14),
      supabase.from("ai_marketing_insights").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("social_post_metrics").select("*").order("collected_at", { ascending: false }).limit(60),
      supabase.from("social_publish_queue").select("id,platform,content,status,requires_approval,priority,scheduled_at,ai_score")
        .eq("requires_approval", true).eq("status", "pending").order("priority", { ascending: false }).limit(50),
    ]);
    setBriefings((b.data as any) || []);
    setInsights((i.data as any) || []);
    setMetrics((m.data as any) || []);
    setApprovals((a.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runCeo = async (action: "run_daily" | "run_weekly" | "generate_insights") => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("ai-marketing-ceo", { body: { action } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(action === "generate_insights" ? `${(data as any)?.generated || 0} új insight` : "Jelentés kész");
    load();
  };

  const collectMetrics = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("social-metrics-collector", { body: {} });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${(data as any)?.collected || 0} poszt frissítve`);
    load();
  };

  const approveItem = async (id: string, approve: boolean) => {
    setBusy(true);
    const { data: user } = await supabase.auth.getUser();
    if (approve) {
      await supabase.from("social_publish_queue").update({
        requires_approval: false,
        approved_by: user.user?.id, approved_at: new Date().toISOString(),
      }).eq("id", id);
    } else {
      await supabase.from("social_publish_queue").update({ status: "cancelled" }).eq("id", id);
    }
    await supabase.from("social_post_approvals").insert({
      queue_id: id, action: approve ? "approved" : "rejected",
      actor_id: user.user?.id, actor_email: user.user?.email,
    });
    setBusy(false);
    toast.success(approve ? "Jóváhagyva" : "Elutasítva");
    load();
  };

  const dismissInsight = async (id: string) => {
    await supabase.from("ai_marketing_insights").update({ status: "dismissed" }).eq("id", id);
    load();
  };

  const latest = briefings[0];
  const platformStats = latest?.metrics?.byPlatform || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase flex items-center gap-2">
            <Brain className="w-7 h-7" /> AI Marketing CEO
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Autonóm marketing operációs központ — jelentések, insights, jóváhagyások és teljesítmény
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Frissítés
          </Button>
          <Button variant="outline" onClick={collectMetrics} disabled={busy}>
            <BarChart3 className="w-4 h-4 mr-2" /> Metrikák
          </Button>
          <Button variant="outline" onClick={() => runCeo("generate_insights")} disabled={busy}>
            <Sparkles className="w-4 h-4 mr-2" /> Insights
          </Button>
          <Button onClick={() => runCeo("run_daily")} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
            Napi jelentés
          </Button>
        </div>
      </div>

      {latest && (
        <Card className="p-6 border-accent/40">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-xs uppercase text-muted-foreground">{latest.period} · {new Date(latest.briefing_date).toLocaleDateString("hu-HU")}</div>
              <h2 className="text-xl font-bold mt-1">📊 Legfrissebb CEO jelentés</h2>
            </div>
          </div>
          <p className="text-sm leading-relaxed mb-4">{latest.summary}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Posztok" value={latest.metrics?.posts || 0} />
            <Stat label="Elérés" value={(latest.metrics?.reach || 0).toLocaleString("hu-HU")} />
            <Stat label="CTR %" value={latest.metrics?.ctr || 0} />
            <Stat label="Új partner leadek" value={latest.metrics?.partnerLeads || 0} />
          </div>
          {Object.keys(platformStats).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {Object.entries(platformStats).map(([p, s]: any) => (
                <div key={p} className="border p-3 text-xs">
                  <div className="font-bold uppercase mb-1">{p}</div>
                  <div className="text-muted-foreground">Publikálva: {s.published} · Elérés: {(s.reach || 0).toLocaleString("hu-HU")}</div>
                  <div className="text-muted-foreground">Kattintás: {s.clicks} · Engagement: {s.engagement}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="briefing">📋 Jelentések</TabsTrigger>
          <TabsTrigger value="insights">💡 Insights <Badge variant="outline" className="ml-2">{insights.filter(i => i.status === "active").length}</Badge></TabsTrigger>
          <TabsTrigger value="approvals">✅ Jóváhagyás <Badge variant="outline" className="ml-2">{approvals.length}</Badge></TabsTrigger>
          <TabsTrigger value="metrics">📊 Metrikák</TabsTrigger>
        </TabsList>

        <TabsContent value="briefing" className="space-y-3 mt-4">
          <div className="flex gap-2 mb-2">
            <Button size="sm" variant="outline" onClick={() => runCeo("run_daily")} disabled={busy}>Napi</Button>
            <Button size="sm" variant="outline" onClick={() => runCeo("run_weekly")} disabled={busy}>Heti</Button>
          </div>
          {briefings.length === 0 && <Card className="p-8 text-center text-muted-foreground">Még nincs jelentés. Kattints a „Napi jelentés"-re.</Card>}
          {briefings.map(b => (
            <Card key={b.id} className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge>{b.period}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(b.briefing_date).toLocaleDateString("hu-HU")}</span>
              </div>
              <p className="text-sm mb-3">{b.summary}</p>
              {b.highlights?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold uppercase mb-1">Kiemelések</div>
                  <ul className="text-xs list-disc list-inside text-muted-foreground space-y-0.5">
                    {b.highlights.map((h, i) => <li key={i}>{typeof h === "string" ? h : JSON.stringify(h)}</li>)}
                  </ul>
                </div>
              )}
              {b.recommendations?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold uppercase mb-1">Javaslatok</div>
                  <ul className="text-xs space-y-1">
                    {b.recommendations.map((r: any, i) => (
                      <li key={i} className="border-l-2 border-accent pl-2">
                        <b>{r.title}</b> — {r.action} <Badge variant="outline" className="ml-1 text-[10px]">{r.priority}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {b.next_actions?.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <b>Következő lépések:</b> {b.next_actions.join(" • ")}
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="insights" className="space-y-2 mt-4">
          {insights.length === 0 && <Card className="p-8 text-center text-muted-foreground">Még nincs insight. Kattints az „Insights" gombra.</Card>}
          {insights.map(i => (
            <Card key={i.id} className={`p-4 ${i.status === "dismissed" ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 mt-0.5 text-accent" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{i.title}</span>
                    <Badge variant="outline" className="text-xs">{i.category}</Badge>
                    {i.platform && <Badge variant="outline" className="text-xs uppercase">{i.platform}</Badge>}
                    <span className="text-xs text-muted-foreground">konf: {Math.round((i.confidence || 0) * 100)}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{i.insight}</p>
                  {i.recommendation && <p className="text-xs mt-2 border-l-2 border-accent pl-2">💡 {i.recommendation}</p>}
                </div>
                {i.status === "active" && (
                  <Button size="sm" variant="ghost" onClick={() => dismissInsight(i.id)}>Elvet</Button>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-2 mt-4">
          {approvals.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nincs jóváhagyásra váró poszt.</Card>}
          {approvals.map(a => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="uppercase">{a.platform}</Badge>
                    <span className="text-xs text-muted-foreground">prioritás {a.priority}</span>
                    {a.ai_score != null && <span className="text-xs text-muted-foreground">AI score: {a.ai_score}</span>}
                    <span className="text-xs text-muted-foreground">{new Date(a.scheduled_at).toLocaleString("hu-HU")}</span>
                  </div>
                  <p className="text-sm line-clamp-3">{a.content}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={() => approveItem(a.id, true)} disabled={busy}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Jóváhagy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => approveItem(a.id, false)} disabled={busy}>
                    <XCircle className="w-3 h-3 mr-1" /> Elutasít
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-2 mt-4">
          {metrics.length === 0 && <Card className="p-8 text-center text-muted-foreground">Még nincs metrika. Kattints a „Metrikák" gombra publikálás után.</Card>}
          {metrics.map(m => (
            <Card key={m.id} className="p-3 flex items-center gap-4 text-sm">
              <Badge variant="outline" className="uppercase">{m.platform}</Badge>
              <div className="flex-1 grid grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">Megjel.</span> <b>{(m.impressions || 0).toLocaleString("hu-HU")}</b></div>
                <div><span className="text-muted-foreground">Elérés</span> <b>{(m.reach || 0).toLocaleString("hu-HU")}</b></div>
                <div><span className="text-muted-foreground">Kattintás</span> <b>{m.clicks || 0}</b></div>
                <div><span className="text-muted-foreground">ER%</span> <b>{m.engagement_rate ?? "—"}</b></div>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(m.collected_at).toLocaleString("hu-HU")}</span>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
