// 🧠 AI Command Center — Agent hálózat vezérlőpult
// Morning Brief, agent kártyák, futtatás, tevékenység feed
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Play, RefreshCw, Loader2, CheckCircle2, AlertCircle, Clock, Activity, Zap, PlayCircle } from "lucide-react";

interface Agent {
  slug: string;
  name: string;
  emoji: string;
  role: string;
  description: string;
  autonomy_level: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  total_runs: number;
  total_tasks_completed: number;
  schedule_cron: string | null;
}

interface Task {
  id: string;
  agent_slug: string;
  task_type: string;
  title: string;
  description: string | null;
  status: string;
  auto_executed: boolean;
  created_at: string;
  output: any;
}

interface Briefing {
  id: string;
  brief_date: string;
  headline: string;
  summary: string;
  highlights: any[];
  metrics: any;
  pending_approvals: number;
  created_at: string;
}

const AdminAiCommandCenter = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [brief, setBrief] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [a, t, b] = await Promise.all([
      (supabase.from("ai_agents" as any) as any).select("*").order("role"),
      (supabase.from("ai_agent_tasks" as any) as any).select("*").order("created_at", { ascending: false }).limit(50),
      (supabase.from("ai_agent_briefings" as any) as any).select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setAgents((a.data || []) as any);
    setTasks((t.data || []) as any);
    setBrief((b.data || null) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAgent = async (slug: string) => {
    setRunning(slug);
    try {
      const { data, error } = await supabase.functions.invoke("ai-agent-run", { body: { agent_slug: slug } });
      if (error) throw error;
      toast.success(`${slug}: ${data?.summary || "kész"}`);
      await load();
    } catch (e: any) {
      toast.error(`Hiba: ${e?.message || "ismeretlen"}`);
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    setRunning("__all__");
    try {
      const { data, error } = await supabase.functions.invoke("ai-agent-run", { body: { action: "run_all" } });
      if (error) throw error;
      const ok = (data?.results || []).filter((r: any) => !r.error).length;
      toast.success(`${ok}/${(data?.results || []).length} agent lefutott`);
      await load();
    } catch (e: any) {
      toast.error(`Hiba: ${e?.message || "ismeretlen"}`);
    } finally {
      setRunning(null);
    }
  };

  const toggleActive = async (slug: string, current: boolean) => {
    await (supabase.from("ai_agents" as any) as any).update({ is_active: !current }).eq("slug", slug);
    await load();
  };

  const timeAgo = (iso: string | null) => {
    if (!iso) return "soha";
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s} mp`;
    if (s < 3600) return `${Math.floor(s / 60)} perc`;
    if (s < 86400) return `${Math.floor(s / 3600)} óra`;
    return `${Math.floor(s / 86400)} nap`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider">AI Command Center</h2>
            <p className="text-[10px] text-muted-foreground">
              Autonóm agent-hálózat • Agresszív mód • {agents.filter(a => a.is_active).length}/{agents.length} aktív
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} size="sm" variant="outline">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
          <Button onClick={runAll} size="sm" disabled={!!running} className="bg-accent text-accent-foreground">
            {running === "__all__"
              ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Fut...</>
              : <><PlayCircle className="w-3 h-3 mr-1" /> Mind futtatása</>}
          </Button>
        </div>
      </div>

      {/* Morning Brief */}
      {brief && (
        <div className="border-2 border-accent bg-accent/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-accent font-bold">
                AI CEO • Reggeli Brief • {new Date(brief.created_at).toLocaleString("hu-HU")}
              </p>
              <h3 className="text-base font-bold">{brief.headline}</h3>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{brief.summary}</p>
          {brief.highlights && brief.highlights.length > 0 && (
            <div className="space-y-0.5 pt-2 border-t border-accent/30">
              {brief.highlights.map((h: any, i: number) => (
                <p key={i} className="text-xs">{typeof h === "string" ? h : JSON.stringify(h)}</p>
              ))}
            </div>
          )}
          <div className="flex gap-4 pt-2 text-[10px] text-muted-foreground">
            <span>📦 {brief.metrics?.orders ?? 0} rendelés</span>
            <span>💰 {Math.round(brief.metrics?.revenue ?? 0).toLocaleString("hu-HU")} Ft</span>
            {brief.pending_approvals > 0 && <span className="text-accent font-bold">⏳ {brief.pending_approvals} jóváhagyás</span>}
          </div>
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {agents.map(a => (
          <div key={a.slug} className={`border p-3 ${a.is_active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"}`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{a.emoji}</span>
              <div className="flex items-center gap-1">
                {a.last_run_status === "completed" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                {a.last_run_status === "failed" && <AlertCircle className="w-3 h-3 text-red-500" />}
                {a.last_run_status === "running" && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider">{a.name}</p>
            <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{a.description}</p>
            <div className="space-y-0.5 text-[9px] text-muted-foreground mb-2">
              <div className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {timeAgo(a.last_run_at)}</div>
              <div className="flex items-center gap-1"><Activity className="w-2.5 h-2.5" /> {a.total_runs} futás • {a.total_tasks_completed} feladat</div>
              {a.schedule_cron && <div className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> {a.schedule_cron}</div>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]"
                onClick={() => runAgent(a.slug)} disabled={!!running || !a.is_active}>
                {running === a.slug
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <><Play className="w-3 h-3 mr-1" /> Fut</>}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2"
                onClick={() => toggleActive(a.slug, a.is_active)}>
                {a.is_active ? "🟢" : "⚪"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="border border-border bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
          📊 Élő tevékenység ({tasks.length})
        </p>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Nincs még agent feladat. Indíts el egyet fentről.</p>
        ) : (
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {tasks.map(t => {
              const agent = agents.find(a => a.slug === t.agent_slug);
              const expanded = expandedTask === t.id;
              return (
                <div key={t.id} className="border border-border/50 hover:border-border transition-colors">
                  <button
                    onClick={() => setExpandedTask(expanded ? null : t.id)}
                    className="w-full text-left p-2 flex items-center gap-2"
                  >
                    <span className="text-base">{agent?.emoji || "🤖"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.title}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {agent?.name} • {t.task_type} • {timeAgo(t.created_at)}
                        {t.auto_executed && " • 🤖 auto"}
                      </p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 uppercase font-bold ${
                      t.status === "completed" ? "text-green-500" :
                      t.status === "failed" ? "text-red-500" :
                      t.status === "needs_approval" ? "text-yellow-500" :
                      "text-muted-foreground"
                    }`}>{t.status}</span>
                  </button>
                  {expanded && (
                    <div className="px-2 pb-2 space-y-1 border-t border-border/50 bg-muted/30">
                      {t.description && <p className="text-xs pt-2">{t.description}</p>}
                      {t.output && (
                        <pre className="text-[9px] bg-background p-2 overflow-x-auto max-h-[300px] overflow-y-auto">
                          {JSON.stringify(t.output, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAiCommandCenter;
