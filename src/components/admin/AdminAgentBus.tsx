import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Zap, Radio, Database, Save, PlayCircle, History, Trash2, Settings2 } from "lucide-react";

interface BusEvent {
  id: string;
  event_type: string;
  source_agent: string;
  target_agent: string | null;
  severity: string;
  payload: any;
  correlation_id: string | null;
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
  id?: string;
  agent_name: string;
  event_type_pattern: string;
  is_active: boolean;
  last_consumed_at: string | null;
  consume_count: number;
  webhook_url: string | null;
  last_dispatch_at: string | null;
  last_dispatch_status: string | null;
}
interface Retention {
  events_retention_days: number;
  context_default_ttl_seconds: number;
  auto_cleanup_enabled: boolean;
  updated_at?: string;
}

export default function AdminAgentBus() {
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [contexts, setContexts] = useState<BusContext[]>([]);
  const [subs, setSubs] = useState<BusSub[]>([]);
  const [retention, setRetention] = useState<Retention>({ events_retention_days: 7, context_default_ttl_seconds: 3600, auto_cleanup_enabled: true });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // Replay filters
  const [replayFrom, setReplayFrom] = useState<string>(() => new Date(Date.now() - 3600_000).toISOString().slice(0, 16));
  const [replayTo, setReplayTo] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [replayAgent, setReplayAgent] = useState("");
  const [replayPattern, setReplayPattern] = useState("");
  const [replayCorr, setReplayCorr] = useState("");
  const [replayEvents, setReplayEvents] = useState<BusEvent[]>([]);
  const [replayCtx, setReplayCtx] = useState<any[]>([]);
  const [replayLoading, setReplayLoading] = useState(false);
  const [selected, setSelected] = useState<BusEvent | null>(null);

  async function load() {
    setLoading(true);
    const [ev, ctx, sb, ret] = await Promise.all([
      supabase.from("ai_agent_bus_events").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("ai_agent_bus_context").select("*").order("updated_at", { ascending: false }),
      supabase.from("ai_agent_bus_subscriptions").select("*").order("agent_name"),
      supabase.from("ai_agent_bus_retention").select("*").maybeSingle(),
    ]);
    setEvents((ev.data as any) || []);
    setContexts((ctx.data as any) || []);
    setSubs((sb.data as any) || []);
    if (ret.data) setRetention(ret.data as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("agent-bus-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agent_bus_events" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agent_bus_context" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agent_bus_subscriptions" }, () => load())
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

  async function saveRetention() {
    setSaving(true);
    const { error } = await supabase.from("ai_agent_bus_retention").update({
      events_retention_days: Number(retention.events_retention_days) || 7,
      context_default_ttl_seconds: Number(retention.context_default_ttl_seconds) || 3600,
      auto_cleanup_enabled: !!retention.auto_cleanup_enabled,
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    setSaving(false);
    if (error) toast({ title: "Mentés hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Retenció mentve" });
  }

  async function runCleanup() {
    setCleaning(true);
    const cutoff = new Date(Date.now() - retention.events_retention_days * 24 * 3600_000).toISOString();
    const [e1, e2] = await Promise.all([
      supabase.from("ai_agent_bus_events").delete().lt("created_at", cutoff),
      supabase.from("ai_agent_bus_context").delete().not("expires_at", "is", null).lt("expires_at", new Date().toISOString()),
    ]);
    setCleaning(false);
    if (e1.error || e2.error) toast({ title: "Takarítás hiba", description: (e1.error || e2.error)?.message, variant: "destructive" });
    else toast({ title: "Takarítás kész" });
    load();
  }

  async function saveSub(s: BusSub) {
    const patch: any = {
      webhook_url: s.webhook_url || null,
      is_active: s.is_active,
      event_type_pattern: s.event_type_pattern,
    };
    const { error } = await supabase.from("ai_agent_bus_subscriptions").update(patch).eq("id", s.id);
    if (error) toast({ title: "Mentés hiba", description: error.message, variant: "destructive" });
    else toast({ title: `${s.agent_name} mentve` });
  }

  async function addSub() {
    const { error } = await supabase.from("ai_agent_bus_subscriptions").insert({
      agent_name: "new-agent", event_type_pattern: "*", is_active: true, webhook_url: null,
    });
    if (error) toast({ title: "Nem sikerült", description: error.message, variant: "destructive" });
    else load();
  }

  async function deleteSub(id?: string) {
    if (!id) return;
    await supabase.from("ai_agent_bus_subscriptions").delete().eq("id", id);
    load();
  }

  async function runReplay() {
    setReplayLoading(true);
    setSelected(null);
    let q = supabase.from("ai_agent_bus_events").select("*")
      .gte("created_at", new Date(replayFrom).toISOString())
      .lte("created_at", new Date(replayTo).toISOString())
      .order("created_at", { ascending: true }).limit(1000);
    if (replayAgent.trim()) q = q.or(`source_agent.eq.${replayAgent.trim()},target_agent.eq.${replayAgent.trim()}`);
    if (replayPattern.trim()) q = q.like("event_type", `${replayPattern.trim().replace(/\*/g, "%")}`);
    if (replayCorr.trim()) q = q.eq("correlation_id", replayCorr.trim());
    const { data: evs } = await q;
    const { data: cts } = await supabase.from("ai_agent_bus_context").select("*")
      .gte("updated_at", new Date(replayFrom).toISOString())
      .lte("updated_at", new Date(replayTo).toISOString())
      .order("updated_at", { ascending: true }).limit(500);
    setReplayEvents((evs as any) || []);
    setReplayCtx((cts as any) || []);
    setReplayLoading(false);
  }

  async function replayDispatch(ev: BusEvent) {
    const { error } = await supabase.functions.invoke("ai-agent-bus-sync", { body: { replay_event_id: ev.id } });
    if (error) toast({ title: "Replay hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Replay indítva", description: ev.event_type });
  }

  const bySeverity = (s: string) =>
    s === "error" || s === "critical" ? "destructive" : s === "warning" ? "secondary" : "default";

  const relatedContext = useMemo(() => {
    if (!selected) return [];
    const t = new Date(selected.created_at).getTime();
    return replayCtx.filter(c => Math.abs(new Date(c.updated_at).getTime() - t) < 60_000);
  }, [selected, replayCtx]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Radio className="w-8 h-8 text-primary" /> AI Ügynök Busz</h1>
          <p className="text-muted-foreground mt-1">Központi kommunikáció · retenció · azonnali dispatch · event replay</p>
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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="events"><Radio className="w-4 h-4 mr-2" /> Event stream</TabsTrigger>
          <TabsTrigger value="context"><Database className="w-4 h-4 mr-2" /> Shared context</TabsTrigger>
          <TabsTrigger value="subs">Feliratkozások</TabsTrigger>
          <TabsTrigger value="replay"><History className="w-4 h-4 mr-2" /> Replay / Debug</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="w-4 h-4 mr-2" /> Retenció</TabsTrigger>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ügynök feliratkozások (webhook dispatch)</CardTitle>
              <Button size="sm" onClick={addSub}>+ Új sub</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  A <code>webhook_url</code> kitöltésével az adott ügynök <b>azonnal</b> megkapja a mintázathoz illő eseményeket (POST body: <code>{"{ bus_event: {...} }"}</code>). Mintázat: <code>*</code>, <code>social.*</code>, vagy pontos <code>marketing.briefing.daily</code>.
                </p>
                {subs.map(s => (
                  <div key={s.id || `${s.agent_name}-${s.event_type_pattern}`} className="border p-3 rounded-none space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Ügynök</Label>
                        <Input value={s.agent_name} disabled />
                      </div>
                      <div>
                        <Label className="text-xs">Event minta</Label>
                        <Input value={s.event_type_pattern} onChange={(e) => setSubs(v => v.map(x => x.id === s.id ? { ...x, event_type_pattern: e.target.value } : x))} />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Webhook URL (POST)</Label>
                        <Input placeholder="https://.../functions/v1/my-agent" value={s.webhook_url || ""} onChange={(e) => setSubs(v => v.map(x => x.id === s.id ? { ...x, webhook_url: e.target.value } : x))} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <label className="flex items-center gap-2">
                          <Switch checked={s.is_active} onCheckedChange={(v) => setSubs(x => x.map(y => y.id === s.id ? { ...y, is_active: v } : y))} />
                          <span>{s.is_active ? "aktív" : "szünet"}</span>
                        </label>
                        <span>{s.consume_count} dispatch</span>
                        {s.last_dispatch_at && <span>· utolsó: {new Date(s.last_dispatch_at).toLocaleString("hu-HU")} ({s.last_dispatch_status})</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => saveSub(s)}><Save className="w-3 h-3 mr-1" /> Ment</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteSub(s.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
                {!subs.length && <div className="text-center text-muted-foreground py-8">Még nincs feliratkozás.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="replay">
          <Card>
            <CardHeader><CardTitle>Event replay & debug</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div>
                  <Label className="text-xs">Ettől</Label>
                  <Input type="datetime-local" value={replayFrom} onChange={(e) => setReplayFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Eddig</Label>
                  <Input type="datetime-local" value={replayTo} onChange={(e) => setReplayTo(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Ügynök (opcionális)</Label>
                  <Input placeholder="social-publisher" value={replayAgent} onChange={(e) => setReplayAgent(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Event minta</Label>
                  <Input placeholder="social.* vagy marketing.*" value={replayPattern} onChange={(e) => setReplayPattern(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Correlation ID</Label>
                  <Input placeholder="uuid" value={replayCorr} onChange={(e) => setReplayCorr(e.target.value)} />
                </div>
              </div>
              <Button onClick={runReplay} disabled={replayLoading}>
                {replayLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                Lekérdezés ({replayEvents.length} találat)
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-none max-h-[500px] overflow-y-auto">
                  <div className="p-2 border-b bg-muted text-xs font-bold">Idővonal — {replayEvents.length} event</div>
                  {replayEvents.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelected(e)}
                      className={`w-full text-left p-2 border-b hover:bg-accent ${selected?.id === e.id ? "bg-accent" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={bySeverity(e.severity) as any} className="text-[10px]">{e.severity}</Badge>
                        <span className="font-mono text-xs">{e.event_type}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString("hu-HU")} · {e.source_agent}{e.target_agent ? ` → ${e.target_agent}` : ""}</div>
                    </button>
                  ))}
                  {!replayEvents.length && <div className="p-4 text-center text-xs text-muted-foreground">Nincs találat az adott időszakra.</div>}
                </div>

                <div className="border rounded-none max-h-[500px] overflow-y-auto">
                  <div className="p-2 border-b bg-muted text-xs font-bold flex items-center justify-between">
                    <span>Részletek</span>
                    {selected && <Button size="sm" variant="outline" onClick={() => replayDispatch(selected)}>Replay</Button>}
                  </div>
                  {selected ? (
                    <div className="p-3 space-y-3 text-xs">
                      <div><b>Event:</b> <code>{selected.event_type}</code></div>
                      <div><b>Forrás:</b> {selected.source_agent}{selected.target_agent ? ` → ${selected.target_agent}` : ""}</div>
                      <div><b>Correlation:</b> <code>{selected.correlation_id || "—"}</code></div>
                      <div><b>Payload:</b><pre className="mt-1 bg-muted p-2 overflow-x-auto">{JSON.stringify(selected.payload, null, 2)}</pre></div>
                      <div>
                        <b>Kontextus-változások ±60s ablakban ({relatedContext.length}):</b>
                        <div className="space-y-1 mt-1">
                          {relatedContext.map((c, i) => (
                            <div key={i} className="bg-muted p-2">
                              <div><Badge>{c.namespace}</Badge> <code>{c.key}</code> <span className="text-muted-foreground">by {c.produced_by}</span></div>
                              <pre className="text-[10px] mt-1 overflow-x-auto">{JSON.stringify(c.value, null, 2).slice(0, 400)}</pre>
                            </div>
                          ))}
                          {!relatedContext.length && <div className="text-muted-foreground">Nem volt context frissítés az esemény körül.</div>}
                        </div>
                      </div>
                    </div>
                  ) : <div className="p-4 text-center text-xs text-muted-foreground">Válassz egy eventet a bal oldalon.</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>Retenciós szabályok</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div>
                <Label>Események megőrzési ideje (nap)</Label>
                <Input type="number" min={1} max={365} value={retention.events_retention_days}
                  onChange={(e) => setRetention({ ...retention, events_retention_days: parseInt(e.target.value) || 1 })} />
                <p className="text-xs text-muted-foreground mt-1">A megadottnál régebbi <code>ai_agent_bus_events</code> sorok automatikusan törlődnek a szinkron során.</p>
              </div>
              <div>
                <Label>Alapértelmezett context TTL (másodperc)</Label>
                <Input type="number" min={60} value={retention.context_default_ttl_seconds}
                  onChange={(e) => setRetention({ ...retention, context_default_ttl_seconds: parseInt(e.target.value) || 3600 })} />
                <p className="text-xs text-muted-foreground mt-1">Ajánlott érték új context kulcsokhoz, ha az ügynök nem ad meg saját TTL-t.</p>
              </div>
              <label className="flex items-center gap-2">
                <Switch checked={retention.auto_cleanup_enabled}
                  onCheckedChange={(v) => setRetention({ ...retention, auto_cleanup_enabled: v })} />
                <span className="text-sm">Automatikus takarítás minden szinkronnál</span>
              </label>
              <div className="flex gap-2">
                <Button onClick={saveRetention} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Mentés
                </Button>
                <Button variant="outline" onClick={runCleanup} disabled={cleaning}>
                  {cleaning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Takarítás most
                </Button>
              </div>
              {retention.updated_at && <p className="text-xs text-muted-foreground">Utoljára frissítve: {new Date(retention.updated_at).toLocaleString("hu-HU")}</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
