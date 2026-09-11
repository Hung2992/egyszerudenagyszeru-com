import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Activity, Server } from "lucide-react";

interface Endpoint {
  id: string;
  name: string;
  base_url: string;
  api_style: string;
  model: string;
  api_key: string | null;
  enabled: boolean;
  priority: number;
  timeout_ms: number;
  supports_json: boolean;
  last_status: string | null;
  last_checked_at: string | null;
  last_error: string | null;
}

const emptyForm = {
  name: "Saját AI szerver",
  base_url: "https://",
  api_style: "openai",
  model: "llama3.1",
  api_key: "",
  priority: 100,
  timeout_ms: 120000,
  supports_json: true,
};

export default function AdminLocalAiTab() {
  const [items, setItems] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [preferLocal, setPreferLocal] = useState(true);
  const [allowCloud, setAllowCloud] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: eps, error }, { data: settings }] = await Promise.all([
      supabase.from("ai_local_endpoints").select("*").order("priority", { ascending: true }),
      supabase.from("ai_routing_settings").select("prefer_local, allow_cloud_fallback").eq("id", true).maybeSingle(),
    ]);
    if (error) toast.error("Nem sikerült betölteni a listát");
    setItems((eps as Endpoint[]) || []);
    if (settings) {
      setPreferLocal(settings.prefer_local !== false);
      setAllowCloud(settings.allow_cloud_fallback !== false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async (next: { prefer_local?: boolean; allow_cloud_fallback?: boolean }) => {
    const payload = {
      id: true,
      prefer_local: next.prefer_local ?? preferLocal,
      allow_cloud_fallback: next.allow_cloud_fallback ?? allowCloud,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("ai_routing_settings").upsert(payload, { onConflict: "id" });
    if (error) return toast.error("Mentés sikertelen");
    setPreferLocal(payload.prefer_local);
    setAllowCloud(payload.allow_cloud_fallback);
    toast.success("Beállítás mentve");
  };

  const addEndpoint = async () => {
    if (!/^https?:\/\/.+/i.test(form.base_url)) return toast.error("Adj meg érvényes címet (http:// vagy https://)");
    if (!form.model.trim()) return toast.error("Add meg a modell nevét");
    setSaving(true);
    const { error } = await supabase.from("ai_local_endpoints").insert({
      name: form.name.trim() || "Saját AI szerver",
      base_url: form.base_url.trim(),
      api_style: form.api_style,
      model: form.model.trim(),
      api_key: form.api_key.trim() || null,
      priority: Number(form.priority) || 100,
      timeout_ms: Number(form.timeout_ms) || 120000,
      supports_json: form.supports_json,
      enabled: true,
    });
    setSaving(false);
    if (error) return toast.error("Hozzáadás sikertelen");
    setForm({ ...emptyForm });
    toast.success("Saját AI szerver hozzáadva");
    load();
  };

  const toggleEnabled = async (ep: Endpoint) => {
    const { error } = await supabase.from("ai_local_endpoints").update({ enabled: !ep.enabled }).eq("id", ep.id);
    if (error) return toast.error("Módosítás sikertelen");
    load();
  };

  const removeEndpoint = async (ep: Endpoint) => {
    const { error } = await supabase.from("ai_local_endpoints").delete().eq("id", ep.id);
    if (error) return toast.error("Törlés sikertelen");
    toast.success("Törölve");
    load();
  };

  const testEndpoint = async (ep: Endpoint) => {
    setTestingId(ep.id);
    const { data, error } = await supabase.functions.invoke("ai-local-endpoint-test", {
      body: { endpoint_id: ep.id },
    });
    setTestingId(null);
    if (error) return toast.error("A teszt nem futott le");
    if (data?.ok) toast.success(`Működik (${data.latency_ms} ms): ${String(data.sample || "").slice(0, 60)}`);
    else toast.error(`Nem elérhető: ${data?.error || "ismeretlen hiba"}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Server className="h-6 w-6" /> Saját AI szerver</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Csatlakoztasd a saját gépeden futó, ingyenes AI modellt (pl. Ollama, LM Studio, llama.cpp, vLLM).
          Ha be van kapcsolva, a rendszer először ezt használja, és nem fogyaszt felhő kreditet.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Működés</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Saját AI előnyben</Label>
              <p className="text-xs text-muted-foreground">Először a saját szervert hívjuk meg.</p>
            </div>
            <Switch checked={preferLocal} onCheckedChange={(v) => saveSettings({ prefer_local: v })} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Tartalék a felhő AI</Label>
              <p className="text-xs text-muted-foreground">Ha a saját szerver nem elérhető, a felhő AI válaszol (kreditet fogyaszt).</p>
            </div>
            <Switch checked={allowCloud} onCheckedChange={(v) => saveSettings({ allow_cloud_fallback: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Új szerver hozzáadása</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Név</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Cím (URL)</Label>
            <Input placeholder="https://ai.sajatdomain.hu" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} />
          </div>
          <div>
            <Label>Típus</Label>
            <select
              className="w-full h-10 border border-input bg-background px-3 text-sm"
              value={form.api_style}
              onChange={(e) => setForm({ ...form, api_style: e.target.value })}
            >
              <option value="openai">OpenAI-kompatibilis (LM Studio, llama.cpp, vLLM, Ollama /v1)</option>
              <option value="ollama">Ollama natív (/api/chat)</option>
            </select>
          </div>
          <div>
            <Label>Modell neve</Label>
            <Input placeholder="llama3.1 / qwen2.5 / mistral" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <Label>Hozzáférési kulcs (ha kell)</Label>
            <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
          </div>
          <div>
            <Label>Sorrend (kisebb = előbb)</Label>
            <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={addEndpoint} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Hozzáadás
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Csatlakoztatott szerverek</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Betöltés…</div>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground">Még nincs saját AI szerver csatlakoztatva.</p>
          )}
          {items.map((ep) => (
            <div key={ep.id} className="border border-border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{ep.name}</span>
                  <Badge variant={ep.enabled ? "default" : "secondary"}>{ep.enabled ? "Aktív" : "Kikapcsolva"}</Badge>
                  {ep.last_status && (
                    <Badge variant={ep.last_status === "ok" ? "default" : "destructive"}>
                      {ep.last_status === "ok" ? "Elérhető" : "Hiba"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground break-all">{ep.base_url} · {ep.model} · {ep.api_style}</p>
                {ep.last_error && <p className="text-xs text-destructive break-all">{ep.last_error}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => testEndpoint(ep)} disabled={testingId === ep.id}>
                  {testingId === ep.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                  <span className="ml-1">Teszt</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleEnabled(ep)}>
                  {ep.enabled ? "Ki" : "Be"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeEndpoint(ep)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Hogyan indíts ingyen saját AI-t?</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Telepítsd az Ollama programot a saját gépedre vagy szerveredre.</p>
          <p>2. Töltsd le a modellt, például: <code>ollama pull llama3.1</code>.</p>
          <p>3. Tedd elérhetővé az interneten (saját domain + HTTPS), és írd be ide a címet.</p>
          <p>4. Nyomd meg a Teszt gombot — ha zöld, a rendszer minden AI feladatot ezen futtat, ingyen.</p>
        </CardContent>
      </Card>
    </div>
  );
}
