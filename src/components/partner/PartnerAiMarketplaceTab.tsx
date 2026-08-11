import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Bot, Download, Trash2, Upload, Search, Sparkles } from "lucide-react";

interface Props { partnerId: string | null }

const ROLE_OPTIONS = ["legal", "accountant", "hr", "sales", "translator", "finance", "marketing", "support"];
const CATEGORY_OPTIONS = ["agent", "legal", "finance", "hr", "sales", "marketing", "support"];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

const PartnerAiMarketplaceTab = ({ partnerId }: Props) => {
  const [agents, setAgents] = useState<any[]>([]);
  const [installs, setInstalls] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", role: "legal", description: "", system_prompt: "", category: "agent", industry: "", model: "google/gemini-3.6-flash", capabilities: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const api = async (action: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("ai-agent-marketplace", { body: { action, partner_id: partnerId, ...payload } });
    if (error) throw new Error(error instanceof Error ? error.message : "Hálózati hiba");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const data = await api("list", {});
      setAgents(data.agents || []);
      setInstalls(data.installs || []);
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const installed = (id: string) => installs.find(i => i.marketplace_agent_id === id);

  const install = async (p: any) => {
    if (!partnerId) return;
    await api("install", { agentId: p.id });
    toast({ title: "Telepítve", description: `${p.name} mostantól elérhető az AI csapatodnak.` });
    void load();
  };

  const uninstall = async (p: any) => {
    const inst = installed(p.id);
    if (!inst) return;
    await api("uninstall", { installId: inst.id });
    toast({ title: "Eltávolítva", description: p.name });
    void load();
  };

  const toggleEnabled = async (p: any, v: boolean) => {
    const inst = installed(p.id);
    if (!inst) return;
    await api("toggle", { installId: inst.id, enabled: v });
    setInstalls(is => is.map(i => i.id === inst.id ? { ...i, is_enabled: v } : i));
  };

  const submitAgent = async () => {
    if (!partnerId || !form.name.trim() || !form.system_prompt.trim()) return;
    setSaving(true);
    try {
      await api("submit", {
        name: form.name,
        role: form.role,
        description: form.description,
        system_prompt: form.system_prompt,
        category: form.category,
        industry: form.industry || null,
        model: form.model,
        capabilities: form.capabilities.split(",").map(s => s.trim()).filter(Boolean),
      });
      toast({ title: "Beküldve", description: "Admin jóváhagyás után lesz nyilvános a piactéren." });
      setForm({ name: "", role: "legal", description: "", system_prompt: "", category: "agent", industry: "", model: "google/gemini-3.6-flash", capabilities: "" });
      void load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = agents.filter(p =>
    !q || `${p.name} ${p.description ?? ""} ${p.industry ?? ""} ${p.role}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-foreground/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-accent" />
          <h3 className="font-bold uppercase tracking-widest text-sm">AI ügynök piactér</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Önálló AI szakértők (AI Lawyer, Accountant, HR, Sales, Translator, Finance…) egy kattintással telepíthetők. A telepített ügynökök beépülnek az AI Web Creator és Agent Bus rendszerbe.
        </p>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="rounded-none pl-7" value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés ügynökök között…" />
        </div>
      </Card>

      {loading && <p className="text-xs text-muted-foreground">Betöltés…</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length === 0 && !loading && <p className="text-sm text-muted-foreground">Nincs találat.</p>}
        {filtered.map(p => {
          const inst = installed(p.id);
          return (
            <Card key={p.id} className="rounded-none border-foreground/20 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm flex items-center gap-2"><Sparkles className="h-3 w-3 text-accent" />{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.role}{p.industry ? ` · ${p.industry}` : ""} · {p.model}</div>
                </div>
                <Badge variant={p.status === "approved" ? "default" : "secondary"} className="rounded-none text-[10px]">
                  {p.status === "approved" ? "Jóváhagyott" : p.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{p.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-muted-foreground">{p.install_count} telepítés</span>
                {inst ? (
                  <>
                    <Switch checked={inst.is_enabled} onCheckedChange={v => toggleEnabled(p, v)} />
                    <span className="text-xs">{inst.is_enabled ? "Aktív" : "Kikapcsolva"}</span>
                    <Button size="sm" variant="ghost" className="rounded-none" onClick={() => uninstall(p)}>
                      <Trash2 className="h-3 w-3 mr-1" />Eltávolítás
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="rounded-none" onClick={() => install(p)} disabled={!partnerId}>
                    <Download className="h-3 w-3 mr-1" />Telepítés
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-none border-foreground/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-accent" />
          <h3 className="font-bold uppercase tracking-widest text-sm">Saját ügynök beküldése</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Név</Label>
            <Input className="rounded-none mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="AI Lawyer" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Szerepkör</Label>
            <select className="mt-1 h-9 w-full rounded-none border border-input bg-background px-3 text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Kategória</Label>
            <select className="mt-1 h-9 w-full rounded-none border border-input bg-background px-3 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Iparág</Label>
            <Input className="rounded-none mt-1" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="jog" />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Leírás</Label>
          <Textarea rows={2} className="rounded-none mt-1" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Rendszerprompt (system prompt)</Label>
          <Textarea rows={3} className="rounded-none mt-1" value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })}
            placeholder="Te egy AI Lawyer vagy..." />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Modell</Label>
            <Input className="rounded-none mt-1" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="google/gemini-3.6-flash" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Képességek (vesszővel)</Label>
            <Input className="rounded-none mt-1" value={form.capabilities} onChange={e => setForm({ ...form, capabilities: e.target.value })} placeholder="szerződés, gdpr, tanácsadás" />
          </div>
        </div>
        <Button className="rounded-none" onClick={submitAgent} disabled={saving || !partnerId || !form.name.trim() || !form.system_prompt.trim()}>
          {saving ? "Küldés…" : "Beküldés jóváhagyásra"}
        </Button>
      </Card>
    </div>
  );
};

export default PartnerAiMarketplaceTab;
