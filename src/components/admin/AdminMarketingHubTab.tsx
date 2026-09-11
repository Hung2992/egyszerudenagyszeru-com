import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Mail, Users, Zap, BarChart3, Send, RefreshCcw, MessageSquare, Loader2,
} from "lucide-react";

interface Contact { id: string; email: string; name: string | null; source: string; status: string; created_at: string }
interface Campaign { id: string; name: string; subject: string; status: string; provider_status: string | null; created_at: string }
interface Automation { id: string; key: string; name: string; description: string | null; delay_minutes: number; active: boolean }
interface QueueItem { id: string; automation_key: string; recipient_email: string; send_at: string; status: string }

export default function AdminMarketingHubTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    setLoading(true);
    const [c, k, a, q] = await Promise.all([
      supabase.from("marketing_contacts").select("id,email,name,source,status,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("marketing_campaigns").select("id,name,subject,status,provider_status,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("marketing_automations").select("*").order("created_at"),
      supabase.from("marketing_automation_queue").select("id,automation_key,recipient_email,send_at,status").order("send_at", { ascending: false }).limit(50),
    ]);
    setContacts((c.data as Contact[]) || []);
    setCampaigns((k.data as Campaign[]) || []);
    setAutomations((a.data as Automation[]) || []);
    setQueue((q.data as QueueItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const syncContacts = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("marketing-sync-contacts", { body: {} });
    setSyncing(false);
    if (error) return toast.error("Szinkronizálás sikertelen");
    toast.success(`CRM frissítve: ${data?.total ?? 0} kontakt`);
    load();
  };

  const createCampaign = async () => {
    if (!name.trim() || !subject.trim()) return toast.error("Név és tárgy kötelező");
    const { error } = await supabase.from("marketing_campaigns").insert({ name, subject, content: body });
    if (error) return toast.error("Mentés sikertelen");
    toast.success("Kampány létrehozva");
    setName(""); setSubject(""); setBody("");
    load();
  };

  const sendCampaign = async (id: string) => {
    setSending(id);
    const { data, error } = await supabase.functions.invoke("marketing-campaign-send", { body: { campaignId: id } });
    setSending(null);
    if (error) return toast.error("Küldés sikertelen");
    if (data?.provider_required) {
      toast.info(`Kampány előkészítve ${data.recipients} címzettre. A tömeges küldéshez Brevo csatlakozás kell — a lista rögzült.`);
    } else {
      toast.success(`Küldés kész: ${data?.sent ?? 0} sikeres, ${data?.failed ?? 0} sikertelen`);
    }
    load();
  };

  const toggleAutomation = async (a: Automation) => {
    const { error } = await supabase.from("marketing_automations").update({ active: !a.active }).eq("id", a.id);
    if (error) return toast.error("Mentés sikertelen");
    setAutomations((prev) => prev.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)));
  };

  const subscribedCount = contacts.filter((c) => c.status === "subscribed").length;

  if (loading) return <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Betöltés…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> CRM kontakt</div><div className="text-2xl font-bold mt-1">{contacts.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> Feliratkozott</div><div className="text-2xl font-bold mt-1">{subscribedCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Send className="h-4 w-4" /> Kampány</div><div className="text-2xl font-bold mt-1">{campaigns.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Zap className="h-4 w-4" /> Aktív automatizmus</div><div className="text-2xl font-bold mt-1">{automations.filter((a) => a.active).length}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="campaigns">📧 Kampányok</TabsTrigger>
          <TabsTrigger value="automations">🤖 Automatizmusok</TabsTrigger>
          <TabsTrigger value="crm">👥 CRM</TabsTrigger>
          <TabsTrigger value="stats">📊 Statisztika</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Új kampány</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Kampány neve" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Email tárgy" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Textarea placeholder="HTML vagy szöveges tartalom…" value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
              <Button onClick={createCampaign}>Létrehozás</Button>
            </CardContent>
          </Card>
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.subject}</div>
                  {c.provider_status && <div className="text-xs text-muted-foreground mt-1">{c.provider_status}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === "sent" ? "default" : "secondary"}>{c.status}</Badge>
                  {c.status !== "sent" && (
                    <Button size="sm" variant="outline" disabled={sending === c.id} onClick={() => sendCampaign(c.id)}>
                      {sending === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Küldés
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground">Még nincs kampány.</p>}
        </TabsContent>

        <TabsContent value="automations" className="space-y-3">
          {automations.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center gap-3 justify-between">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-muted-foreground">{a.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">Késleltetés: {a.delay_minutes} perc</div>
                </div>
                <Switch checked={a.active} onCheckedChange={() => toggleAutomation(a)} />
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader><CardTitle className="text-base">Várólista (utolsó 50)</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {queue.map((q) => (
                <div key={q.id} className="flex flex-wrap items-center gap-2 text-sm border-b border-border pb-1">
                  <Badge variant="secondary">{q.automation_key}</Badge>
                  <span>{q.recipient_email}</span>
                  <span className="text-muted-foreground">{new Date(q.send_at).toLocaleString("hu-HU")}</span>
                  <Badge variant={q.status === "sent" ? "default" : q.status === "failed" ? "destructive" : "secondary"}>{q.status}</Badge>
                </div>
              ))}
              {queue.length === 0 && <p className="text-sm text-muted-foreground">A várólista üres.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm" className="space-y-3">
          <Button variant="outline" onClick={syncContacts} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            CRM szinkronizálás (felhasználók + rendelők + partnerek)
          </Button>
          <div className="space-y-1">
            {contacts.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm border-b border-border pb-1">
                <span className="font-medium">{c.email}</span>
                {c.name && <span className="text-muted-foreground">{c.name}</span>}
                <Badge variant="secondary">{c.source}</Badge>
                <Badge variant={c.status === "subscribed" ? "default" : "outline"}>{c.status}</Badge>
              </div>
            ))}
            {contacts.length === 0 && <p className="text-sm text-muted-foreground">Még nincs kontakt — futtasd a szinkronizálást.</p>}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Küldési statisztikák a kampányküldések és események alapján készülnek.</div>
              <div className="flex items-center gap-2 text-muted-foreground"><MessageSquare className="h-4 w-4" /> SMS / WhatsApp: előkészítve — Twilio csatlakozás után aktiválható.</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
