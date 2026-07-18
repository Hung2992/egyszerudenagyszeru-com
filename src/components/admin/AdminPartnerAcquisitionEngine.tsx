import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Search, Target, Mail, Users, BarChart3, Loader2, Play, Send, Brain } from "lucide-react";

type Campaign = any;
type Lead = any;
type Outreach = any;

const STATUS_LABEL: Record<string, string> = {
  found: "Talált", analyzed: "Elemzett", outreached: "Megkeresve",
  responded: "Válaszolt", negotiating: "Tárgyalás", partner: "Partner",
  rejected: "Elutasítva", dead: "Halott",
};
const STATUS_COLOR: Record<string, string> = {
  found: "bg-slate-500", analyzed: "bg-blue-500", outreached: "bg-amber-500",
  responded: "bg-emerald-500", negotiating: "bg-purple-500", partner: "bg-green-600",
  rejected: "bg-red-500", dead: "bg-gray-400",
};

export default function AdminPartnerAcquisitionEngine() {
  const [tab, setTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    goal: "",
    target_categories: "",
    target_countries: "HU",
    target_languages: "hu",
    partner_type: "brand",
    channels: "email,instagram",
    daily_target: 20,
    commission: "5%",
  });

  const loadCampaigns = async () => {
    const { data } = await supabase.from("partner_campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns(data || []);
    if (data?.[0] && !selected) setSelected(data[0]);
  };
  const loadLeads = async (cid: string) => {
    const { data } = await supabase.from("partner_leads").select("*").eq("campaign_id", cid).order("ai_score", { ascending: false }).limit(200);
    setLeads(data || []);
  };
  const loadOutreach = async (cid: string) => {
    const { data } = await supabase.from("partner_outreach").select("*, partner_leads(company_name)").eq("campaign_id", cid).order("created_at", { ascending: false }).limit(200);
    setOutreach(data || []);
  };

  useEffect(() => { void loadCampaigns(); }, []);
  useEffect(() => {
    if (selected?.id) { void loadLeads(selected.id); void loadOutreach(selected.id); }
  }, [selected?.id]);

  const call = async (action: string, payload: any = {}) => {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("partner-acquisition-agent", {
        body: { action, ...payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message || "Ismeretlen hiba", variant: "destructive" });
      return null;
    } finally { setBusy(null); }
  };

  const createCampaign = async () => {
    if (!newCampaign.name) { toast({ title: "Adj meg nevet" }); return; }
    setBusy("create");
    const { data, error } = await supabase.from("partner_campaigns").insert({
      name: newCampaign.name,
      goal: newCampaign.goal || null,
      target_categories: newCampaign.target_categories.split(",").map((s) => s.trim()).filter(Boolean),
      target_countries: newCampaign.target_countries.split(",").map((s) => s.trim()).filter(Boolean),
      target_languages: newCampaign.target_languages.split(",").map((s) => s.trim()).filter(Boolean),
      partner_type: newCampaign.partner_type,
      channels: newCampaign.channels.split(",").map((s) => s.trim()).filter(Boolean),
      daily_target: Number(newCampaign.daily_target) || 20,
      offer: { commission: newCampaign.commission, tools: "AI marketing, saját domain, virtual try-on", support: "onboarding + marketing" },
      status: "active",
    }).select().maybeSingle();
    setBusy(null);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Kampány létrehozva 🚀" });
    await loadCampaigns();
    setSelected(data);
    setNewCampaign({ ...newCampaign, name: "", goal: "" });
  };

  const genStrategy = async () => {
    if (!selected) return;
    const r = await call("generate_strategy", { campaign_id: selected.id });
    if (r) { toast({ title: "AI stratégia elkészült" }); await loadCampaigns(); const { data } = await supabase.from("partner_campaigns").select("*").eq("id", selected.id).maybeSingle(); if (data) setSelected(data); }
  };
  const discover = async () => {
    if (!selected) return;
    const r = await call("discover_leads", { campaign_id: selected.id, count: 15 });
    if (r) { toast({ title: `${r.count} új lead 🎯` }); await loadLeads(selected.id); }
  };
  const analyzeLead = async (id: string) => {
    const r = await call("analyze_lead", { lead_id: id });
    if (r) { toast({ title: "Lead elemezve" }); if (selected) await loadLeads(selected.id); }
  };
  const genOutreach = async (id: string, channel = "email", variant = "premium") => {
    const r = await call("generate_outreach", { lead_id: id, channel, variant });
    if (r) { toast({ title: "Megkeresés generálva ✍️" }); if (selected) { await loadOutreach(selected.id); await loadLeads(selected.id); } }
  };
  const computeInsights = async () => {
    const r = await call("compute_insights", selected ? { campaign_id: selected.id } : {});
    if (r) toast({ title: `${r.insights?.length || 0} insight` });
  };
  const setLeadStatus = async (id: string, status: string) => {
    await supabase.from("partner_leads").update({ status }).eq("id", id);
    if (selected) await loadLeads(selected.id);
  };
  const markOutreachSent = async (id: string) => {
    await supabase.from("partner_outreach").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
    if (selected) { await loadOutreach(selected.id); }
  };

  const stats = {
    total: leads.length,
    analyzed: leads.filter((l) => l.status !== "found").length,
    outreached: leads.filter((l) => ["outreached", "responded", "negotiating", "partner"].includes(l.status)).length,
    responded: leads.filter((l) => ["responded", "negotiating", "partner"].includes(l.status)).length,
    partners: leads.filter((l) => l.status === "partner").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6" /> Partner Acquisition Engine</h2>
          <p className="text-sm text-muted-foreground">AI-vezérelt partner-szerző gépezet — kampányoktól a megkeresésekig.</p>
        </div>
        {selected && (
          <div className="flex gap-2">
            <Select value={selected.id} onValueChange={(v) => setSelected(campaigns.find((c) => c.id === v) || null)}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>

      {selected && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[["Talált", stats.total], ["Elemzett", stats.analyzed], ["Megkeresve", stats.outreached], ["Válaszolt", stats.responded], ["Partner", stats.partners]].map(([l, v]) => (
            <Card key={l as string} className="p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-2xl font-bold">{v}</div></Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-6">
          <TabsTrigger value="campaigns"><Target className="w-4 h-4 mr-1" />Kampányok</TabsTrigger>
          <TabsTrigger value="strategy"><Brain className="w-4 h-4 mr-1" />Stratégia</TabsTrigger>
          <TabsTrigger value="leads"><Search className="w-4 h-4 mr-1" />CRM</TabsTrigger>
          <TabsTrigger value="outreach"><Mail className="w-4 h-4 mr-1" />Megkeresések</TabsTrigger>
          <TabsTrigger value="insights"><BarChart3 className="w-4 h-4 mr-1" />Elemzés</TabsTrigger>
          <TabsTrigger value="content"><Users className="w-4 h-4 mr-1" />Tartalom</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Új kampány</h3>
            <div className="grid md:grid-cols-2 gap-2">
              <Input placeholder="Név (pl. 500 divatmárka 30 nap)" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} />
              <Input placeholder="Cél leírása" value={newCampaign.goal} onChange={(e) => setNewCampaign({ ...newCampaign, goal: e.target.value })} />
              <Input placeholder="Kategóriák (ruha, elektronika...)" value={newCampaign.target_categories} onChange={(e) => setNewCampaign({ ...newCampaign, target_categories: e.target.value })} />
              <Input placeholder="Országok (HU, DE...)" value={newCampaign.target_countries} onChange={(e) => setNewCampaign({ ...newCampaign, target_countries: e.target.value })} />
              <Input placeholder="Nyelvek (hu, en...)" value={newCampaign.target_languages} onChange={(e) => setNewCampaign({ ...newCampaign, target_languages: e.target.value })} />
              <Select value={newCampaign.partner_type} onValueChange={(v) => setNewCampaign({ ...newCampaign, partner_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">Márka</SelectItem>
                  <SelectItem value="reseller">Viszonteladó</SelectItem>
                  <SelectItem value="manufacturer">Gyártó</SelectItem>
                  <SelectItem value="creator">Alkotó / kézműves</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Csatornák (email, instagram, tiktok, linkedin)" value={newCampaign.channels} onChange={(e) => setNewCampaign({ ...newCampaign, channels: e.target.value })} />
              <Input placeholder="Napi cél (leadek)" type="number" value={newCampaign.daily_target} onChange={(e) => setNewCampaign({ ...newCampaign, daily_target: Number(e.target.value) })} />
              <Input placeholder="Jutalék ajánlat" value={newCampaign.commission} onChange={(e) => setNewCampaign({ ...newCampaign, commission: e.target.value })} />
            </div>
            <Button onClick={createCampaign} disabled={busy === "create"}>
              {busy === "create" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
              Kampány létrehozása
            </Button>
          </Card>

          <div className="grid md:grid-cols-2 gap-3">
            {campaigns.map((c) => (
              <Card key={c.id} className={`p-4 cursor-pointer ${selected?.id === c.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelected(c)}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{c.name}</h4>
                  <Badge>{c.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.goal || "—"}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(c.target_categories || []).slice(0, 4).map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-3">
          {!selected ? <p className="text-muted-foreground">Válassz kampányt.</p> : (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">AI stratégia — {selected.name}</h3>
                <Button onClick={genStrategy} disabled={busy === "generate_strategy"}>
                  {busy === "generate_strategy" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Brain className="w-4 h-4 mr-1" />}
                  Stratégia generálása
                </Button>
              </div>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify({ ideal_profile: selected.ideal_profile, strategy: selected.strategy, kpis: selected.metrics?.kpis }, null, 2)}
              </pre>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leads" className="space-y-3">
          {!selected ? <p className="text-muted-foreground">Válassz kampányt.</p> : (
            <>
              <div className="flex gap-2">
                <Button onClick={discover} disabled={busy === "discover_leads"}>
                  {busy === "discover_leads" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
                  AI: új leadek keresése
                </Button>
              </div>
              <div className="grid gap-2">
                {leads.map((l) => (
                  <Card key={l.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{l.company_name}</span>
                          <Badge className={`text-white ${STATUS_COLOR[l.status] || "bg-slate-500"}`}>{STATUS_LABEL[l.status] || l.status}</Badge>
                          <Badge variant="outline">Score: {Number(l.ai_score).toFixed(0)}</Badge>
                          {l.category && <Badge variant="outline">{l.category}</Badge>}
                          {l.country && <Badge variant="outline">{l.country}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {l.website && <a href={l.website} target="_blank" rel="noreferrer" className="underline mr-2">{l.website}</a>}
                          {l.instagram_handle && <span>IG: {l.instagram_handle}</span>}
                        </div>
                        {l.ai_notes && <p className="text-xs mt-1">{l.ai_notes}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="outline" onClick={() => analyzeLead(l.id)} disabled={busy !== null}>Elemzés</Button>
                        <Button size="sm" onClick={() => genOutreach(l.id, "email", "premium")} disabled={busy !== null}>Email</Button>
                        <Button size="sm" variant="outline" onClick={() => genOutreach(l.id, "instagram_dm", "aggressive")} disabled={busy !== null}>IG DM</Button>
                        <Select value={l.status} onValueChange={(v) => setLeadStatus(l.id, v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.keys(STATUS_LABEL).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
                {leads.length === 0 && <p className="text-muted-foreground text-sm">Nincs lead. Nyomd meg az "AI: új leadek keresése" gombot.</p>}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="outreach" className="space-y-3">
          {!selected ? <p className="text-muted-foreground">Válassz kampányt.</p> : (
            <div className="grid gap-2">
              {outreach.map((o) => (
                <Card key={o.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{o.partner_leads?.company_name || "—"}</span>
                      <Badge className="ml-2" variant="outline">{o.channel}</Badge>
                      <Badge className="ml-1" variant="outline">{o.variant}</Badge>
                      <Badge className="ml-1">{o.status}</Badge>
                    </div>
                    {o.status === "draft" && (
                      <Button size="sm" onClick={() => markOutreachSent(o.id)}><Send className="w-3 h-3 mr-1" />Elküldve</Button>
                    )}
                  </div>
                  {o.subject && <div className="text-sm font-medium">Tárgy: {o.subject}</div>}
                  <Textarea value={o.message} readOnly rows={6} className="text-xs" />
                </Card>
              ))}
              {outreach.length === 0 && <p className="text-muted-foreground text-sm">Nincs megkeresés. Generálj egyet a CRM fülön.</p>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-3">
          <Button onClick={computeInsights} disabled={busy === "compute_insights"}>
            {busy === "compute_insights" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-1" />}
            Insights számítása
          </Button>
          <InsightsList campaignId={selected?.id} />
        </TabsContent>

        <TabsContent value="content" className="space-y-3">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Tartalom generátor</h3>
            <p className="text-sm text-muted-foreground">A meglévő <b>🤖 Partner Toborzó AI</b> modul generál social media tartalmakat (Facebook/Instagram/TikTok). Használd azt a tartalomkészítéshez, és a leadek megkereséséhez ezt a modult.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InsightsList({ campaignId }: { campaignId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const q = supabase.from("partner_ai_insights").select("*").order("created_at", { ascending: false }).limit(50);
      const { data } = campaignId ? await q.eq("campaign_id", campaignId) : await q;
      setItems(data || []);
    })();
  }, [campaignId]);
  return (
    <div className="grid gap-2">
      {items.map((i) => (
        <Card key={i.id} className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{i.scope}: {i.scope_key}</Badge>
            <Badge>{i.metric}</Badge>
            <span className="text-sm font-mono">{Number(i.value).toFixed(3)}</span>
            <span className="text-xs text-muted-foreground">n={i.sample_size}</span>
          </div>
          <p className="text-sm">{i.recommendation}</p>
        </Card>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground">Még nincs insight. Küldj ki pár megkeresést, aztán nyomd meg a "Insights számítása" gombot.</p>}
    </div>
  );
}
