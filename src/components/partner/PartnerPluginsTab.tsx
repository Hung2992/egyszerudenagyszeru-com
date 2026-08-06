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
import { Puzzle, Download, Trash2, Upload, Search } from "lucide-react";

interface Props { partnerId: string | null }

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

const PartnerPluginsTab = ({ partnerId }: Props) => {
  const [plugins, setPlugins] = useState<any[]>([]);
  const [installs, setInstalls] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", description: "", category: "general", industry: "", agent_prompt: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: pl }, { data: ins }] = await Promise.all([
      supabase.from("ai_plugins").select("*").order("install_count", { ascending: false }).limit(100),
      partnerId
        ? supabase.from("partner_plugin_installs").select("*").eq("partner_id", partnerId)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setPlugins(pl || []);
    setInstalls(ins || []);
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const installed = (id: string) => installs.find(i => i.plugin_id === id);

  const install = async (p: any) => {
    if (!partnerId) return;
    const { error } = await supabase.from("partner_plugin_installs").insert({
      partner_id: partnerId, plugin_id: p.id, settings: p.seed_config ?? {},
    });
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    await supabase.from("ai_plugins").update({ install_count: (p.install_count ?? 0) + 1 }).eq("id", p.id);
    toast({ title: "Telepítve", description: `${p.name} elérhető az AI ügynökeidnek.` });
    void load();
  };

  const uninstall = async (p: any) => {
    const inst = installed(p.id);
    if (!inst) return;
    await supabase.from("partner_plugin_installs").delete().eq("id", inst.id);
    toast({ title: "Eltávolítva", description: p.name });
    void load();
  };

  const toggleEnabled = async (p: any, v: boolean) => {
    const inst = installed(p.id);
    if (!inst) return;
    await supabase.from("partner_plugin_installs").update({ is_enabled: v }).eq("id", inst.id);
    setInstalls(is => is.map(i => i.id === inst.id ? { ...i, is_enabled: v } : i));
  };

  const submitPlugin = async () => {
    if (!partnerId || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("ai_plugins").insert({
      slug: `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`,
      name: form.name,
      description: form.description,
      category: form.category,
      industry: form.industry || null,
      agent_prompt: form.agent_prompt,
      author_partner_id: partnerId,
      status: "pending_review",
      is_public: false,
    });
    setSaving(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Beküldve", description: "Admin jóváhagyás után lesz nyilvános a piactéren." });
    setForm({ name: "", description: "", category: "general", industry: "", agent_prompt: "" });
    void load();
  };

  const filtered = plugins.filter(p =>
    !q || `${p.name} ${p.description ?? ""} ${p.industry ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-foreground/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Puzzle className="h-4 w-4 text-accent" />
          <h3 className="font-bold uppercase tracking-widest text-sm">AI Plugin piactér</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Iparágspecifikus AI modulok (ingatlan, fogorvos, autószerviz, hotel…) — telepítés után az AI ügynökeid a modul tudását és sablonjait használják.
        </p>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="rounded-none pl-7" value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés modulok között…" />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nincs találat.</p>}
        {filtered.map(p => {
          const inst = installed(p.id);
          return (
            <Card key={p.id} className="rounded-none border-foreground/20 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category}{p.industry ? ` · ${p.industry}` : ""} · v{p.version}</div>
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
                  <Button size="sm" className="rounded-none" onClick={() => install(p)} disabled={!partnerId || p.status !== "approved"}>
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
          <h3 className="font-bold uppercase tracking-widest text-sm">Saját modul beküldése</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Modul neve</Label>
            <Input className="rounded-none mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="AI Ingatlan modul" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Iparág</Label>
            <Input className="rounded-none mt-1" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="ingatlan" />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Leírás</Label>
          <Textarea rows={2} className="rounded-none mt-1" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Ügynök utasítás (prompt)</Label>
          <Textarea rows={3} className="rounded-none mt-1" value={form.agent_prompt} onChange={e => setForm({ ...form, agent_prompt: e.target.value })}
            placeholder="Hogyan viselkedjen az AI, ha ez a modul aktív…" />
        </div>
        <Button className="rounded-none" onClick={submitPlugin} disabled={saving || !partnerId || !form.name.trim()}>
          {saving ? "Küldés…" : "Beküldés jóváhagyásra"}
        </Button>
      </Card>
    </div>
  );
};

export default PartnerPluginsTab;
