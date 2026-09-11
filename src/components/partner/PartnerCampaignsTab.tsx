import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, Send, Globe, Users, ExternalLink } from "lucide-react";

interface Blast {
  id: string;
  subject: string;
  body_html: string;
  excerpt: string | null;
  slug: string | null;
  status: string;
  recipient_count: number;
  sent_count: number;
  sent_at: string | null;
  published_on_site: boolean;
  published_at: string | null;
  created_at: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const NEWSLETTER_TEMPLATES = [
  {
    label: "🆕 Új termékek",
    subject: "Új termékek érkeztek hozzánk",
    excerpt: "Friss darabok a kínálatunkban – nézd meg elsőként.",
    body:
      "Szia!\n\nÚj termékek érkeztek a webshopunkba. Összeszedtük neked a legjobbakat:\n\n• Termék 1 – rövid leírás\n• Termék 2 – rövid leírás\n• Termék 3 – rövid leírás\n\nNézd meg a kínálatot a weboldalunkon!\n\nÜdv,\na csapatunk",
  },
  {
    label: "🎯 Akció",
    subject: "Időszakos akció – csak most",
    excerpt: "Kedvezmény a kiválasztott termékekre, korlátozott ideig.",
    body:
      "Szia!\n\nMost kedvezménnyel vihetsz el több terméket is. Az akció korlátozott ideig él, így érdemes sietni.\n\n• Mire vonatkozik: …\n• Mekkora a kedvezmény: …\n• Meddig tart: …\n\nJó vásárlást!",
  },
  {
    label: "📅 Időpontfoglalás",
    subject: "Foglalj időpontot online",
    excerpt: "Mostantól pár kattintással foglalhatsz nálunk időpontot.",
    body:
      "Szia!\n\nMostantól a weboldalunkon közvetlenül foglalhatsz időpontot a szolgáltatásainkra. Válaszd ki a napot és az időpontot, a visszaigazolást e-mailben küldjük.\n\nVárunk szeretettel!",
  },
  {
    label: "📣 Hír / bejelentés",
    subject: "Fontos hír tőlünk",
    excerpt: "Friss bejelentés a márkánkról.",
    body: "Szia!\n\nSzeretnénk megosztani veled a legfrissebb hírünket:\n\n…\n\nKöszönjük, hogy velünk tartasz!",
  },
] as const;

export default function PartnerCampaignsTab({ partnerId }: { partnerId: string }) {
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [subscribers, setSubscribers] = useState(0);
  const [storefrontSlug, setStorefrontSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [publishOnSite, setPublishOnSite] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, s, sf] = await Promise.all([
      supabase
        .from("partner_email_blasts")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("partner_email_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId)
        .is("unsubscribed_at", null),
      supabase.from("partner_storefronts").select("slug").eq("partner_id", partnerId).maybeSingle(),
    ]);
    setBlasts((b.data as unknown as Blast[]) || []);
    setSubscribers(s.count || 0);
    setStorefrontSlug((sf.data as { slug?: string } | null)?.slug || null);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("A tárgy és a tartalom kötelező");
      return;
    }
    setBusy("create");
    const { error } = await supabase.from("partner_email_blasts").insert({
      partner_id: partnerId,
      subject: subject.trim(),
      body_html: body.trim(),
      excerpt: excerpt.trim() || null,
      slug: slugify(subject) || `hir-${Date.now()}`,
      published_on_site: publishOnSite,
      published_at: publishOnSite ? new Date().toISOString() : null,
      status: "draft",
    });
    setBusy(null);
    if (error) {
      toast.error("Nem sikerült létrehozni: " + error.message);
      return;
    }
    setSubject("");
    setExcerpt("");
    setBody("");
    toast.success("Hírlevél létrehozva");
    load();
  };

  const send = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("partner-newsletter-send", {
      body: { blastId: id },
    });
    setBusy(null);
    if (error) {
      toast.error("A küldés nem sikerült");
      return;
    }
    if (data?.ok) toast.success(`Kiküldve ${data.sent} címzettnek`);
    else toast.error(data?.error || "Nem ment ki egyetlen levél sem");
    load();
  };

  const togglePublish = async (b: Blast) => {
    const next = !b.published_on_site;
    const { error } = await supabase
      .from("partner_email_blasts")
      .update({
        published_on_site: next,
        published_at: next ? new Date().toISOString() : null,
        slug: b.slug || slugify(b.subject) || `hir-${Date.now()}`,
      })
      .eq("id", b.id);
    if (error) return toast.error("Nem sikerült módosítani");
    toast.success(next ? "Megjelenik a weboldaladon" : "Levéve a weboldalról");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Betöltés…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> Feliratkozók
            </div>
            <div className="text-2xl font-bold">{subscribers}</div>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> Hírlevelek
            </div>
            <div className="text-2xl font-bold">{blasts.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" /> Weboldalon
            </div>
            <div className="text-2xl font-bold">{blasts.filter((b) => b.published_on_site).length}</div>
            {storefrontSlug && (
              <a
                className="text-xs underline inline-flex items-center gap-1 mt-1"
                href={`/b/${storefrontSlug}/hirek`}
                target="_blank"
                rel="noreferrer"
              >
                Hírek oldal <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-base">Új hírlevél</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {NEWSLETTER_TEMPLATES.map((t) => (
              <Button
                key={t.label}
                type="button"
                size="sm"
                variant="outline"
                className="rounded-none"
                onClick={() => {
                  setSubject(t.subject);
                  setExcerpt(t.excerpt);
                  setBody(t.body);
                  toast.success(`Sablon betöltve: ${t.label}`);
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <Input
            className="rounded-none"
            placeholder="Tárgy (pl. Őszi újdonságok nálunk)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Input
            className="rounded-none"
            placeholder="Rövid összefoglaló (a hírek oldalon is látszik)"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
          <Textarea
            className="rounded-none min-h-[160px]"
            placeholder="A hírlevél tartalma…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={publishOnSite} onCheckedChange={setPublishOnSite} />
              Megjelenjen a saját weboldalamon is
            </label>
            <Button className="rounded-none" onClick={create} disabled={busy === "create"}>
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Létrehozás
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-base">Hírleveleim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {blasts.length === 0 && <p className="text-sm text-muted-foreground">Még nincs hírleveled.</p>}
          {blasts.map((b) => (
            <div key={b.id} className="border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold break-words">{b.subject}</div>
                  {b.excerpt && <div className="text-sm text-muted-foreground break-words">{b.excerpt}</div>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="rounded-none">{b.status}</Badge>
                  {b.published_on_site && <Badge className="rounded-none">weboldalon</Badge>}
                  {b.status === "sent" && (
                    <Badge variant="secondary" className="rounded-none">{b.sent_count}/{b.recipient_count} kiküldve</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="rounded-none"
                  disabled={busy === b.id || b.status === "sent"}
                  onClick={() => send(b.id)}
                >
                  {busy === b.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Kiküldés a feliratkozóknak
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => togglePublish(b)}>
                  <Globe className="h-4 w-4 mr-2" />
                  {b.published_on_site ? "Levétel a weboldalról" : "Kirakás a weboldalra"}
                </Button>
                {b.published_on_site && storefrontSlug && b.slug && (
                  <a
                    className="text-xs underline inline-flex items-center gap-1"
                    href={`/b/${storefrontSlug}/hirek/${b.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Megnyitás <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
