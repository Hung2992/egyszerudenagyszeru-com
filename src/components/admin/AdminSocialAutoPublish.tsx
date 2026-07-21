import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Play, Trash2, RefreshCw, Rocket, AlertTriangle } from "lucide-react";

type Platform = "facebook" | "instagram" | "tiktok";
type Status = "pending" | "processing" | "published" | "failed" | "cancelled" | "skipped";

interface QueueItem {
  id: string;
  platform: Platform;
  content: string;
  media_urls: string[];
  media_type: string;
  hashtags: string[];
  scheduled_at: string;
  status: Status;
  external_post_id: string | null;
  external_permalink: string | null;
  error_message: string | null;
  retry_count: number;
  published_at: string | null;
  autopilot: boolean;
  created_at: string;
}

interface Settings {
  id?: string;
  autopilot_enabled: boolean;
  facebook_enabled: boolean;
  instagram_enabled: boolean;
  tiktok_enabled: boolean;
  daily_limit_facebook: number;
  daily_limit_instagram: number;
  daily_limit_tiktok: number;
  quiet_hours_start: number;
  quiet_hours_end: number;
  default_hashtags: string[];
  facebook_page_id: string | null;
  instagram_business_id: string | null;
}

const STATUS_COLOR: Record<Status, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  processing: "bg-blue-500/20 text-blue-400",
  published: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  cancelled: "bg-gray-500/20 text-gray-400",
  skipped: "bg-gray-500/20 text-gray-400",
};

const PLATFORM_ICON: Record<Platform, string> = { facebook: "📘", instagram: "📷", tiktok: "🎵" };

export default function AdminSocialAutoPublish() {
  const [tab, setTab] = useState("queue");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // New post form
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [hashtagsIn, setHashtagsIn] = useState("");
  const [schedAt, setSchedAt] = useState("");

  const load = async () => {
    setLoading(true);
    const [q, s] = await Promise.all([
      supabase.from("social_publish_queue").select("*").order("scheduled_at", { ascending: false }).limit(100),
      supabase.from("social_auto_publish_settings").select("*").limit(1).maybeSingle(),
    ]);
    setItems((q.data as QueueItem[]) || []);
    setSettings((s.data as Settings) || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true);
    const { error } = await supabase.from("social_auto_publish_settings")
      .update({
        autopilot_enabled: settings.autopilot_enabled,
        facebook_enabled: settings.facebook_enabled,
        instagram_enabled: settings.instagram_enabled,
        tiktok_enabled: settings.tiktok_enabled,
        daily_limit_facebook: settings.daily_limit_facebook,
        daily_limit_instagram: settings.daily_limit_instagram,
        daily_limit_tiktok: settings.daily_limit_tiktok,
        quiet_hours_start: settings.quiet_hours_start,
        quiet_hours_end: settings.quiet_hours_end,
        default_hashtags: settings.default_hashtags,
        facebook_page_id: settings.facebook_page_id,
        instagram_business_id: settings.instagram_business_id,
      })
      .eq("id", settings.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Beállítások mentve");
  };

  const enqueue = async () => {
    if (!content.trim()) { toast.error("Tartalom kötelező"); return; }
    setBusy(true);
    const { error } = await supabase.functions.invoke("social-publisher", {
      body: {
        action: "enqueue",
        platform, content,
        media_urls: mediaUrl ? [mediaUrl] : [],
        media_type: mediaUrl ? mediaType : "text",
        hashtags: hashtagsIn.split(/[,\s]+/).filter(Boolean),
        scheduled_at: schedAt || new Date().toISOString(),
        autopilot: !!settings?.autopilot_enabled,
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ütemezve");
    setContent(""); setMediaUrl(""); setHashtagsIn(""); setSchedAt("");
    load();
  };

  const publishNow = async (id: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("social-publisher", {
      body: { action: "publish_now", id },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const r = (data as any)?.results?.[0];
    if (r?.ok) toast.success(`Közzétéve: ${r.external_id}`);
    else toast.error(r?.error || "Sikertelen");
    load();
  };

  const processQueue = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("social-publisher", {
      body: { action: "process_queue" },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Feldolgozva: ${(data as any)?.processed || 0} elem`);
    load();
  };

  const removeItem = async (id: string) => {
    if (!confirm("Biztosan törlöd?")) return;
    await supabase.from("social_publish_queue").delete().eq("id", id);
    load();
  };

  const stats = {
    pending: items.filter(i => i.status === "pending").length,
    published: items.filter(i => i.status === "published").length,
    failed: items.filter(i => i.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">📅 Social Auto-Publish</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Facebook • Instagram • TikTok — automata közzététel a Partner Toborzó AI Pro Suite-ból
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Frissítés
          </Button>
          <Button onClick={processQueue} disabled={busy}>
            <Play className="w-4 h-4 mr-2" /> Feldolgozás most
          </Button>
        </div>
      </div>

      {settings && !settings.autopilot_enabled && (
        <Card className="p-4 border-yellow-500/40 bg-yellow-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <div className="flex-1 text-sm">
            <b>Autopilot ki van kapcsolva.</b> A queue elemek nem publikálódnak automatikusan. Kapcsold be a Beállítások fülön.
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Ütemezve</div><div className="text-3xl font-bold mt-1">{stats.pending}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Publikálva</div><div className="text-3xl font-bold mt-1 text-green-400">{stats.published}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Sikertelen</div><div className="text-3xl font-bold mt-1 text-red-400">{stats.failed}</div></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="queue">📋 Queue</TabsTrigger>
          <TabsTrigger value="new">➕ Új poszt</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Beállítások</TabsTrigger>
          <TabsTrigger value="setup">🔧 Setup útmutató</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-2 mt-4">
          {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nincs elem a queue-ban.</Card>}
          {items.map(item => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="text-2xl">{PLATFORM_ICON[item.platform]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={STATUS_COLOR[item.status]}>{item.status}</Badge>
                    <span className="text-xs text-muted-foreground uppercase">{item.platform}</span>
                    {item.autopilot && <Badge variant="outline" className="text-xs"><Rocket className="w-3 h-3 mr-1" />autopilot</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(item.scheduled_at).toLocaleString("hu-HU")}</span>
                  </div>
                  <div className="text-sm line-clamp-3">{item.content}</div>
                  {item.hashtags?.length > 0 && <div className="text-xs text-blue-400 mt-1">{item.hashtags.map(h => `#${h}`).join(" ")}</div>}
                  {item.media_urls?.[0] && <div className="text-xs text-muted-foreground mt-1 truncate">📎 {item.media_urls[0]}</div>}
                  {item.error_message && <div className="text-xs text-red-400 mt-2">⚠️ {item.error_message} (retry: {item.retry_count})</div>}
                  {item.external_permalink && <a href={item.external_permalink} target="_blank" rel="noreferrer" className="text-xs text-green-400 underline mt-2 inline-block">Megnyitás →</a>}
                </div>
                <div className="flex flex-col gap-2">
                  {item.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => publishNow(item.id)} disabled={busy}>
                      <Send className="w-3 h-3 mr-1" /> Most
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">📘 Facebook</SelectItem>
                    <SelectItem value="instagram">📷 Instagram</SelectItem>
                    <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ütemezés (üres = azonnal)</Label>
                <Input type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Tartalom *</Label>
              <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Poszt szöveg..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Média URL (kép/videó)</Label>
                <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Média típus</Label>
                <Select value={mediaType} onValueChange={setMediaType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Kép</SelectItem>
                    <SelectItem value="video">Videó</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Hashtag-ek (vesszővel)</Label>
              <Input value={hashtagsIn} onChange={(e) => setHashtagsIn(e.target.value)} placeholder="webshop, partner, streetwear" />
            </div>
            <div className="text-xs text-muted-foreground">
              💡 Instagram és TikTok publikus HTTPS URL-t igényel a médiához (nem base64/local file).
              TikTok csak videót fogad.
            </div>
            <Button onClick={enqueue} disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Ütemezés
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {settings && (
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-between p-4 border rounded">
                <div>
                  <div className="font-bold">🚀 Autopilot mód</div>
                  <div className="text-xs text-muted-foreground">A queue-ba tett posztok jóváhagyás nélkül publikálódnak</div>
                </div>
                <Switch checked={settings.autopilot_enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, autopilot_enabled: v })} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {(["facebook", "instagram", "tiktok"] as Platform[]).map(p => (
                  <Card key={p} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{PLATFORM_ICON[p]} {p}</span>
                      <Switch checked={settings[`${p}_enabled` as const] as boolean}
                        onCheckedChange={(v) => setSettings({ ...settings, [`${p}_enabled`]: v } as Settings)} />
                    </div>
                    <div>
                      <Label className="text-xs">Napi max poszt</Label>
                      <Input type="number" min={0} value={settings[`daily_limit_${p}` as const] as number}
                        onChange={(e) => setSettings({ ...settings, [`daily_limit_${p}`]: parseInt(e.target.value) || 0 } as Settings)} />
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Csendes óra kezdete (0-23)</Label>
                  <Input type="number" min={0} max={23} value={settings.quiet_hours_start}
                    onChange={(e) => setSettings({ ...settings, quiet_hours_start: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Csendes óra vége (0-23)</Label>
                  <Input type="number" min={0} max={23} value={settings.quiet_hours_end}
                    onChange={(e) => setSettings({ ...settings, quiet_hours_end: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <div>
                <Label>Alapértelmezett hashtag-ek (vesszővel — minden poszthoz hozzáfűzve)</Label>
                <Input value={settings.default_hashtags?.join(", ") || ""}
                  onChange={(e) => setSettings({ ...settings, default_hashtags: e.target.value.split(/[,\s]+/).filter(Boolean) })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Facebook Page ID</Label>
                  <Input value={settings.facebook_page_id || ""}
                    onChange={(e) => setSettings({ ...settings, facebook_page_id: e.target.value })} />
                </div>
                <div>
                  <Label>Instagram Business Account ID</Label>
                  <Input value={settings.instagram_business_id || ""}
                    onChange={(e) => setSettings({ ...settings, instagram_business_id: e.target.value })} />
                </div>
              </div>

              <Button onClick={saveSettings} disabled={busy} className="w-full">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Mentés
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="setup" className="mt-4">
          <Card className="p-6 space-y-4 text-sm">
            <h3 className="font-bold text-lg">🔧 Beállítás lépésről lépésre</h3>

            <div>
              <div className="font-bold mb-1">1️⃣ Meta (Facebook + Instagram)</div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Nyisd meg a <a className="text-blue-400 underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">Meta for Developers</a> oldalt és hozz létre egy Business típusú appot</li>
                <li>Engedélyezd a <b>Facebook Login</b> + <b>Instagram Graph API</b> termékeket</li>
                <li>Generálj egy <b>Long-Lived Page Access Token</b>-t a Graph API Explorerben az alábbi scope-okkal:<br/>
                  <code className="text-xs">pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish, business_management</code></li>
                <li>Másold a Facebook Page ID-t és az Instagram Business Account ID-t → írd be a Beállítások fülre</li>
                <li>A Page Access Token-t <b>Backend secret</b>ként add hozzá: <code>META_PAGE_ACCESS_TOKEN</code> néven</li>
              </ol>
              <div className="mt-2 text-xs text-yellow-400">⚠️ Az Instagram fiók <b>Business</b> vagy <b>Creator</b> típusú legyen, és Facebook Page-hez legyen kötve.</div>
            </div>

            <div>
              <div className="font-bold mb-1">2️⃣ TikTok</div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Regisztrálj a <a className="text-blue-400 underline" href="https://developers.tiktok.com" target="_blank" rel="noreferrer">TikTok for Developers</a> oldalon</li>
                <li>Kérj hozzáférést a <b>Content Posting API</b>-hoz (kötelező audit ~ 1-3 nap)</li>
                <li>Kösd be a TikTok connectort a Lovable Connectors panelen</li>
                <li>A gateway automatikusan kezeli az OAuth token frissítést</li>
              </ol>
            </div>

            <div>
              <div className="font-bold mb-1">3️⃣ Cron (automatikus feldolgozás)</div>
              <div className="text-muted-foreground">
                A queue automatikusan 5 percenként feldolgozásra kerül. Manuális futtatás: <b>Feldolgozás most</b> gomb.
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="font-bold mb-1">🔗 Integráció a Partner Toborzó AI-val</div>
              <div className="text-muted-foreground">
                A Pro Suite <b>Kampány Manager</b> és <b>Poszt generátor</b> egy kattintással a queue-ba küld posztokat.
                Autopilot módban a heti terv (7-14 poszt) automatikusan ütemeződik és publikálódik.
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
