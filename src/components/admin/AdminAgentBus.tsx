import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Zap, Radio, Database } from "lucide-react";

interface BusEvent {
  id: string;
  event_type: string;
  source_agent: string;
  target_agent: string | null;
  severity: string;
  payload: any;
  consumed_by: string[];
  created_at: string;
}
interface BusContext {
  namespace: string;
  key: string;
  value: any;
  produced_by: string;
  updated_at: string;
  expires_at: string | null;
}
interface BusSub {
  agent_name: string;
  event_type_pattern: string;
  is_active: boolean;
  last_consumed_at: string | null;
  consume_count: number;
}

export default function AdminAgentBus() {
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [contexts, setContexts] = useState<BusContext[]>([]);
  const [subs, setSubs] = useState<BusSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    const [ev, ctx, sb] = await Promise.all([
      supabase.from("ai_agent_bus_events").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("ai_agent_bus_context").select("*").order("updated_at", { ascending: false }),
      supabase.from("ai_agent_bus_subscriptions").select("*").order("agent_name"),
    ]);
    setEvents((ev.data as any) || []);
    setContexts((ctx.data as any) || []);
    setSubs((sb.data as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("agent-bus-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agent_bus_events" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agent_bus_context" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function triggerSync() {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("ai-agent-bus-sync", { body: { manual: true } });
    setSyncing(false);
    if (error) toast({ title: "Szinkronizálás hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Bus szinkronizálva", description: `Rendelések: ${data?.summary?.recent_orders ?? 0}, Insights: ${data?.summary?.marketing_insights ?? 0}, Leadek: ${data?.summary?.top_leads ?? 0}` });
    load();
  }

  const bySeverity = (s: string) =>
    s === "error" ? "destructive" : s === "warning" ? "secondary" : s === "critical" ? "destructive" : "default";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Radio className="w-8 h-8 text-primary" /> AI Ügynök Busz</h1>
          <p className="text-muted-foreground mt-1">Központi kommunikációs csatorna — minden AI ügynök megosztja itt a friss adatait</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Frissítés
          </Button>
          <Button onClick={triggerSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Szinkron most
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-3xl font-bold">{events.length}</div><div className="text-sm text-muted-foreground">Utolsó eventek</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-3xl font-bold">{contexts.length}</div><div className="text-sm text-muted-foreground">Aktív context kulcsok</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-3xl font-bold">{subs.filter(s => s.is_active).length}</div><div className="text-sm text-muted-foreground">Aktív feliratkozók</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-3xl font-bold">{new Set(events.map(e => e.source_agent)).size}</div><div className="text-sm text-muted-foreground">Aktív ügynökök</div></CardContent></Card>
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events"><Radio className="w-4 h-4 mr-2" /> Event stream</TabsTrigger>
          <TabsTrigger value="context"><Database className="w-4 h-4 mr-2" /> Shared context</TabsTrigger>
          <TabsTrigger value="subs">Feliratkozások</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader><CardTitle>Élő event stream (utolsó 100)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {events.map(e => (
                  <div key={e.id} className="border p-3 rounded-none flex items-start gap-3">
                    <Badge variant={bySeverity(e.severity) as any}>{e.severity}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold">{e.event_type}</span>
                        <span className="text-xs text-muted-foreground">{e.source_agent}</span>
                        {e.target_agent && <>→ <span className="text-xs">{e.target_agent}</span></>}
                      </div>
                      <pre className="text-xs mt-1 text-muted-foreground overflow-x-auto">{JSON.stringify(e.payload, null, 2).slice(0, 300)}</pre>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(e.created_at).toLocaleString("hu-HU")} · konzumálva: {e.consumed_by?.length || 0} ügynök
                      </div>
                    </div>
                  </div>
                ))}
                {!events.length && <div className="text-center text-muted-foreground py-8">Nincs event. Nyomd meg a "Szinkron most" gombot.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context">
          <Card>
            <CardHeader><CardTitle>Megosztott kontextus (namespace/key)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {contexts.map(c => (
                  <div key={`${c.namespace}/${c.key}`} className="border p-3 rounded-none">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge>{c.namespace}</Badge>
                      <span className="font-mono font-bold">{c.key}</span>
                      <span className="text-xs text-muted-foreground ml-auto">by {c.produced_by}</span>
                    </div>
                    <pre className="text-xs mt-2 text-muted-foreground overflow-x-auto bg-muted p-2">{JSON.stringify(c.value, null, 2).slice(0, 500)}</pre>
                    <div className="text-xs text-muted-foreground mt-1">
                      Frissítve: {new Date(c.updated_at).toLocaleString("hu-HU")}
                      {c.expires_at && ` · Lejár: ${new Date(c.expires_at).toLocaleString("hu-HU")}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subs">
          <Card>
            <CardHeader><CardTitle>Ügynök feliratkozások</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subs.map(s => (
                  <div key={`${s.agent_name}-${s.event_type_pattern}`} className="border p-3 rounded-none flex items-center gap-3">
                    <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "aktív" : "szünet"}</Badge>
                    <span className="font-mono font-bold">{s.agent_name}</span>
                    <span className="text-muted-foreground">←</span>
                    <span className="font-mono text-sm">{s.event_type_pattern}</span>
                    <div className="ml-auto text-xs text-muted-foreground">
                      {s.consume_count} konzumálva{s.last_consumed_at ? ` · ${new Date(s.last_consumed_at).toLocaleString("hu-HU")}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
