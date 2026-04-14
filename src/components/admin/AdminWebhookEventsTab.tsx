import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, Pencil, Webhook } from "lucide-react";

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  retry_count: number;
  timeout_seconds: number;
}

const EVENT_OPTIONS = [
  "order.created", "order.paid", "order.shipped", "order.completed", "order.cancelled",
  "product.created", "product.updated", "product.deleted",
  "customer.registered", "customer.updated",
  "review.created", "stock.low",
];

const emptyEndpoint = (): WebhookEndpoint => ({
  id: crypto.randomUUID(), name: "", url: "", events: ["order.created"],
  secret: "", is_active: true, retry_count: 3, timeout_seconds: 30,
});

const AdminWebhookEventsTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data);
    };
    f();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      webhook_events_settings: settings.webhook_events_settings,
      webhook_events_enabled: settings.webhook_events_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Webhook beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const wh = settings.webhook_events_settings && typeof settings.webhook_events_settings === "object" ? settings.webhook_events_settings : {};
  const endpoints: WebhookEndpoint[] = Array.isArray(wh.endpoints) ? wh.endpoints : [];

  const updateEndpoints = (newEps: WebhookEndpoint[]) => {
    setSettings({ ...settings, webhook_events_settings: { ...wh, endpoints: newEps } });
  };
  const addEndpoint = () => { updateEndpoints([...endpoints, emptyEndpoint()]); setEditIdx(endpoints.length); };
  const updateEndpoint = (idx: number, field: string, value: any) => {
    const updated = [...endpoints]; updated[idx] = { ...updated[idx], [field]: value }; updateEndpoints(updated);
  };
  const removeEndpoint = (idx: number) => { updateEndpoints(endpoints.filter((_, i) => i !== idx)); if (editIdx === idx) setEditIdx(null); };

  const toggleEvent = (idx: number, event: string) => {
    const ep = endpoints[idx];
    const events = ep.events.includes(event) ? ep.events.filter(e => e !== event) : [...ep.events, event];
    updateEndpoint(idx, "events", events);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Webhook eseménykezelő</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Webhook className="h-4 w-4 text-accent" /> Webhook rendszer
          </div>
          <Switch checked={settings.webhook_events_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, webhook_events_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Külső rendszerek értesítése rendelés, termék és vásárlói eseményekről HTTP webhook-okon keresztül.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Végpontok ({endpoints.length})</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addEndpoint}><Plus className="h-3 w-3 mr-1" /> Új végpont</Button>
        </div>
        {endpoints.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek webhook végpontok.</p>}
        {endpoints.map((ep, i) => (
          <div key={ep.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{ep.name || "Névtelen"}</span>
                <span className="text-xs text-muted-foreground font-mono">{ep.events.length} esemény</span>
                {!ep.is_active && <span className="text-[9px] uppercase tracking-widest border px-1.5 py-0.5 text-destructive">Inaktív</span>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeEndpoint(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {editIdx === i && (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label className="text-xs uppercase tracking-wider">Név</Label><Input value={ep.name} onChange={e => updateEndpoint(i, "name", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                  <div><Label className="text-xs uppercase tracking-wider">URL</Label><Input value={ep.url} onChange={e => updateEndpoint(i, "url", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="https://api.example.com/webhook" /></div>
                  <div><Label className="text-xs uppercase tracking-wider">Secret (HMAC)</Label><Input value={ep.secret} onChange={e => updateEndpoint(i, "secret", e.target.value)} className="rounded-none mt-1 text-xs" type="password" /></div>
                  <div><Label className="text-xs uppercase tracking-wider">Retry szám</Label><Input type="number" value={ep.retry_count} onChange={e => updateEndpoint(i, "retry_count", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
                  <div><Label className="text-xs uppercase tracking-wider">Timeout (mp)</Label><Input type="number" value={ep.timeout_seconds} onChange={e => updateEndpoint(i, "timeout_seconds", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
                  <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Aktív</Label><Switch checked={ep.is_active} onCheckedChange={v => updateEndpoint(i, "is_active", v)} /></div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider mb-2 block">Események</Label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_OPTIONS.map(ev => (
                      <button key={ev} onClick={() => toggleEvent(i, ev)}
                        className={`text-[10px] uppercase tracking-wider border px-2 py-1 transition-colors ${ep.events.includes(ev) ? "bg-accent text-accent-foreground border-accent" : "border-input text-muted-foreground hover:border-accent"}`}>
                        {ev}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminWebhookEventsTab;
