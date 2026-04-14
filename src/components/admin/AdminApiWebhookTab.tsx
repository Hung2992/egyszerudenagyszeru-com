import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Key, Webhook, Copy } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  permissions: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
}

interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_status_code: number | null;
  failure_count: number;
}

const EVENTS = ["order.created", "order.updated", "order.cancelled", "product.created", "product.updated", "user.registered", "payment.received"];

const AdminApiWebhookTab = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [keyForm, setKeyForm] = useState({ name: "", permissions: ["read"] });
  const [webhookForm, setWebhookForm] = useState({ name: "", url: "", events: ["order.created"] });
  const [newKey, setNewKey] = useState<string | null>(null);

  const fetchData = async () => {
    const [kRes, wRes] = await Promise.all([
      supabase.from("api_keys").select("*").order("created_at"),
      supabase.from("webhooks").select("*").order("created_at"),
    ]);
    if (kRes.data) setApiKeys(kRes.data as ApiKey[]);
    if (wRes.data) setWebhooks(wRes.data as WebhookEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return "wsk_" + Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const addApiKey = async () => {
    if (!keyForm.name.trim()) return;
    const key = generateKey();
    const { error } = await supabase.from("api_keys").insert({
      name: keyForm.name, key_hash: key, key_preview: key.slice(0, 8) + "..." + key.slice(-4),
      permissions: keyForm.permissions,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { setNewKey(key); toast({ title: "API kulcs létrehozva" }); setShowKeyForm(false); fetchData(); }
  };

  const addWebhook = async () => {
    if (!webhookForm.name.trim() || !webhookForm.url.trim()) return;
    const secret = generateKey();
    const { error } = await supabase.from("webhooks").insert({ ...webhookForm, secret });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Webhook létrehozva" }); setShowWebhookForm(false); setWebhookForm({ name: "", url: "", events: ["order.created"] }); fetchData(); }
  };

  const toggleKey = async (id: string, active: boolean) => { await supabase.from("api_keys").update({ is_active: active }).eq("id", id); fetchData(); };
  const toggleWebhook = async (id: string, active: boolean) => { await supabase.from("webhooks").update({ is_active: active }).eq("id", id); fetchData(); };
  const deleteKey = async (id: string) => { await supabase.from("api_keys").delete().eq("id", id); fetchData(); };
  const deleteWebhook = async (id: string) => { await supabase.from("webhooks").delete().eq("id", id); fetchData(); };

  const toggleEvent = (event: string) => {
    setWebhookForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-8">
      {newKey && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 space-y-2">
          <p className="font-medium text-sm">⚠️ Új API kulcs létrehozva – mentsd el, mert később nem lesz elérhető!</p>
          <div className="flex gap-2 items-center">
            <code className="text-xs bg-muted px-3 py-2 rounded flex-1 break-all">{newKey}</code>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast({ title: "Vágólapra másolva" }); }}><Copy className="w-4 h-4" /></Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>Bezárás</Button>
        </div>
      )}

      {/* API Kulcsok */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Key className="w-5 h-5" /><h2 className="font-bold text-lg">API kulcsok</h2></div>
          <Button size="sm" onClick={() => setShowKeyForm(!showKeyForm)}><Plus className="w-4 h-4 mr-1" /> Új kulcs</Button>
        </div>

        {showKeyForm && (
          <div className="border rounded-lg p-4 space-y-3">
            <div><Label>Kulcs neve</Label><Input value={keyForm.name} onChange={e => setKeyForm({ ...keyForm, name: e.target.value })} placeholder="pl. ERP integráció" /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addApiKey}>Generálás</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowKeyForm(false)}>Mégse</Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader><TableRow><TableHead>Név</TableHead><TableHead>Kulcs</TableHead><TableHead>Jogok</TableHead><TableHead>Aktív</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {apiKeys.map(k => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.name}</TableCell>
                <TableCell className="font-mono text-xs">{k.key_preview}</TableCell>
                <TableCell>{k.permissions?.map(p => <Badge key={p} variant="outline" className="mr-1 text-xs">{p}</Badge>)}</TableCell>
                <TableCell><Switch checked={k.is_active} onCheckedChange={v => toggleKey(k.id, v)} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => deleteKey(k.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {apiKeys.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek API kulcsok.</p>}
      </div>

      {/* Webhookok */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Webhook className="w-5 h-5" /><h2 className="font-bold text-lg">Webhookok</h2></div>
          <Button size="sm" onClick={() => setShowWebhookForm(!showWebhookForm)}><Plus className="w-4 h-4 mr-1" /> Új webhook</Button>
        </div>

        {showWebhookForm && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Név</Label><Input value={webhookForm.name} onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })} /></div>
              <div><Label>URL</Label><Input value={webhookForm.url} onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div>
              <Label>Események</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EVENTS.map(ev => (
                  <Badge key={ev} variant={webhookForm.events.includes(ev) ? "default" : "outline"}
                    className="cursor-pointer" onClick={() => toggleEvent(ev)}>{ev}</Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addWebhook}>Mentés</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowWebhookForm(false)}>Mégse</Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader><TableRow><TableHead>Név</TableHead><TableHead>URL</TableHead><TableHead>Események</TableHead><TableHead>Státusz</TableHead><TableHead>Aktív</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {webhooks.map(w => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.name}</TableCell>
                <TableCell className="text-xs font-mono max-w-[200px] truncate">{w.url}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{w.events?.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}</div></TableCell>
                <TableCell>
                  {w.last_status_code ? (
                    <Badge variant={w.last_status_code < 300 ? "default" : "destructive"}>{w.last_status_code}</Badge>
                  ) : <span className="text-xs text-muted-foreground">–</span>}
                  {w.failure_count > 0 && <span className="text-xs text-destructive ml-1">({w.failure_count} hiba)</span>}
                </TableCell>
                <TableCell><Switch checked={w.is_active} onCheckedChange={v => toggleWebhook(w.id, v)} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => deleteWebhook(w.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {webhooks.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek webhookok.</p>}
      </div>
    </div>
  );
};

export default AdminApiWebhookTab;
