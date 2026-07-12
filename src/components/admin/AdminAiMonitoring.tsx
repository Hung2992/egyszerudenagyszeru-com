// Admin AI Monitoring - hibák, riasztások, resolve
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { AlertTriangle, AlertCircle, Info, XCircle, Check, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface MonitoringEvent {
  id: string;
  function_name: string;
  severity: string;
  event_type: string;
  message: string;
  metadata: any;
  resolved: boolean;
  created_at: string;
}

const SEVERITY_STYLES: Record<string, { icon: any; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-500", bg: "border-blue-500/30" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "border-yellow-500/30" },
  error: { icon: AlertCircle, color: "text-orange-500", bg: "border-orange-500/30" },
  critical: { icon: XCircle, color: "text-destructive", bg: "border-destructive" },
};

const AdminAiMonitoring = () => {
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = (supabase.from("ai_monitoring_events" as any) as any)
      .select("*").order("created_at", { ascending: false }).limit(100);
    if (!showResolved) q = q.eq("resolved", false);
    const { data } = await q;
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [showResolved]);

  const resolve = async (id: string) => {
    await (supabase.from("ai_monitoring_events" as any) as any)
      .update({ resolved: true }).eq("id", id);
    toast({ title: "Elintézve ✓" });
    load();
  };

  const openCount = events.filter(e => !e.resolved).length;
  const criticalCount = events.filter(e => !e.resolved && e.severity === "critical").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            AI Monitoring {openCount > 0 && <span className="text-yellow-500">({openCount})</span>}
            {criticalCount > 0 && <span className="text-destructive ml-1">🚨 {criticalCount}</span>}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider cursor-pointer flex items-center gap-1">
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}
              className="h-3 w-3" />
            Elintézett is
          </label>
          <Button onClick={load} size="icon" variant="ghost" className="h-7 w-7">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="border border-border p-6 text-center bg-card">
          <Check className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Nincsenek {showResolved ? "" : "aktív"} riasztások. Minden rendben. ✓</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {events.map(e => {
            const style = SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.info;
            const Icon = style.icon;
            return (
              <div key={e.id} className={`border ${style.bg} bg-card p-3 flex items-start gap-2 ${e.resolved ? "opacity-50" : ""}`}>
                <Icon className={`w-4 h-4 ${style.color} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${style.color}`}>{e.severity}</span>
                    <span className="text-[10px] text-muted-foreground">{e.function_name}</span>
                    <span className="text-[10px] px-1.5 border border-border">{e.event_type}</span>
                  </div>
                  <p className="text-xs mt-1 font-medium">{e.message}</p>
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <details className="mt-1">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer">Részletek</summary>
                      <pre className="text-[9px] mt-1 p-1.5 bg-muted overflow-x-auto">{JSON.stringify(e.metadata, null, 2)}</pre>
                    </details>
                  )}
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {new Date(e.created_at).toLocaleString("hu-HU")}
                  </p>
                </div>
                {!e.resolved && (
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => resolve(e.id)}
                    title="Elintézve">
                    <Check className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminAiMonitoring;
