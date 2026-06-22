import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Save, Upload, Eye, Send, ExternalLink } from "lucide-react";
import { uploadPartnerMedia } from "@/lib/partner-storage";
import MediaImage from "./MediaImage";

interface Props { partnerId: string; }

const FONT_OPTIONS = [
  { label: "Space Grotesk + Inter", heading: "Space Grotesk", body: "Inter" },
  { label: "Playfair + Lora", heading: "Playfair Display", body: "Lora" },
  { label: "Bebas Neue + Roboto", heading: "Bebas Neue", body: "Roboto" },
];

const THEMES = [
  { id: "dark_minimal", label: "Sötét minimál", bg: "#0a0a0a", text: "#ffffff", primary: "#000000", accent: "#D4AF37" },
  { id: "light_clean", label: "Világos tiszta", bg: "#ffffff", text: "#0a0a0a", primary: "#0a0a0a", accent: "#D4AF37" },
  { id: "street_red", label: "Street piros", bg: "#0a0a0a", text: "#ffffff", primary: "#1a1a1a", accent: "#ff2a2a" },
];

const StorefrontEditorTab = ({ partnerId }: Props) => {
  const [sf, setSf] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("partner_storefronts").select("*").eq("partner_id", partnerId).maybeSingle();
    if (data) setSf(data);
    else setSf({
      partner_id: partnerId,
      slug: "",
      display_name: "",
      tagline: "",
      about_html: "",
      primary_color: "#000000", accent_color: "#D4AF37", bg_color: "#0a0a0a", text_color: "#ffffff",
      font_heading: "Space Grotesk", font_body: "Inter", theme_preset: "dark_minimal",
      hero_title: "", hero_subtitle: "", hero_cta_text: "Vásárolj most",
      instagram_url: "", tiktok_url: "", facebook_url: "", youtube_url: "",
      meta_title: "", meta_description: "",
      is_published: false,
    });
  };

  useEffect(() => { void load(); }, [partnerId]);

  const set = (k: string, v: any) => setSf((s: any) => ({ ...s, [k]: v }));

  const handleFile = async (field: string, file: File) => {
    setUploading(field);
    const path = await uploadPartnerMedia("partner-storefront-media", partnerId, file);
    setUploading(null);
    if (!path) { toast({ title: "Feltöltési hiba", variant: "destructive" }); return; }
    set(field, path);
  };

  const checkSlug = async (slug: string) => {
    if (!slug) return false;
    setSlugChecking(true);
    const { data } = await supabase.from("partner_storefronts").select("id, partner_id").eq("slug", slug).maybeSingle();
    setSlugChecking(false);
    if (!data) return true;
    return data.partner_id === partnerId;
  };

  const save = async (publishRequest = false) => {
    if (!sf?.slug || !sf?.display_name) { toast({ title: "Slug és név kötelező", variant: "destructive" }); return; }
    if (!/^[a-z0-9-]+$/.test(sf.slug)) { toast({ title: "Slug csak kisbetű, szám, kötőjel", variant: "destructive" }); return; }
    const ok = await checkSlug(sf.slug);
    if (!ok) { toast({ title: "Ez a slug már foglalt", variant: "destructive" }); return; }

    setSaving(true);
    const payload: any = { ...sf };
    if (publishRequest) payload.publish_requested_at = new Date().toISOString();
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.is_published; delete payload.published_at;
    const op = sf.id
      ? supabase.from("partner_storefronts").update(payload).eq("id", sf.id).select().maybeSingle()
      : supabase.from("partner_storefronts").insert(payload).select().maybeSingle();
    const { data, error } = await op;
    setSaving(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    if (data) setSf(data);
    toast({ title: publishRequest ? "Mentve és publikálási kérés elküldve" : "Mentve" });
  };

  const applyTheme = (t: typeof THEMES[number]) => {
    setSf((s: any) => ({ ...s, theme_preset: t.id, bg_color: t.bg, text_color: t.text, primary_color: t.primary, accent_color: t.accent }));
  };

  if (!sf) return <div className="text-sm text-muted-foreground">Betöltés…</div>;

  const previewUrl = sf.slug ? `${window.location.origin}/b/${sf.slug}` : null;
  const subdomainUrl = sf.slug ? `https://${sf.slug}.egyszerudenagyszeru.com` : null;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className="rounded-none border-foreground/20 p-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge className="rounded-none uppercase" variant={sf.is_published ? "default" : "secondary"}>
            {sf.is_published ? "Élesben" : sf.publish_requested_at ? "Várja a jóváhagyást" : "Vázlat"}
          </Badge>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs underline flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> {previewUrl}
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-none" onClick={() => save(false)} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> Mentés
          </Button>
          {!sf.is_published && (
            <Button size="sm" className="rounded-none" onClick={() => save(true)} disabled={saving}>
              <Send className="h-4 w-4 mr-1" /> Publikálás kérése
            </Button>
          )}
        </div>
      </Card>

      {/* Alapadatok */}
      <Card className="rounded-none border-foreground/20 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest">Alapadatok</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase">URL slug *</Label>
            <Input className="rounded-none font-mono" value={sf.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="pl. john-streetwear" />
            <p className="text-[10px] text-muted-foreground mt-1">/b/{sf.slug || "..."}</p>
          </div>
          <div>
            <Label className="text-xs uppercase">Márka neve *</Label>
            <Input className="rounded-none" value={sf.display_name} onChange={e => set("display_name", e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase">Rövid mottó</Label>
          <Input className="rounded-none" value={sf.tagline || ""} onChange={e => set("tagline", e.target.value)} placeholder="pl. Streetwear minden napra" />
        </div>
        <div>
          <Label className="text-xs uppercase">Bemutatkozás (HTML)</Label>
          <Textarea className="rounded-none" rows={4} value={sf.about_html || ""} onChange={e => set("about_html", e.target.value)} />
        </div>
      </Card>

      {/* Branding */}
      <Card className="rounded-none border-foreground/20 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest">Megjelenés</h3>

        <div className="space-y-2">
          <Label className="text-xs uppercase">Téma preset</Label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => applyTheme(t)} className={`p-3 border text-xs text-left ${sf.theme_preset === t.id ? "border-accent" : "border-foreground/20"}`} style={{ background: t.bg, color: t.text }}>
                <div className="font-bold">{t.label}</div>
                <div className="flex gap-1 mt-2">
                  <span className="w-4 h-4 inline-block" style={{ background: t.primary }} />
                  <span className="w-4 h-4 inline-block" style={{ background: t.accent }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          {(["primary_color","accent_color","bg_color","text_color"] as const).map(f => (
            <div key={f}>
              <Label className="text-xs uppercase">{f.replace("_"," ")}</Label>
              <div className="flex gap-1">
                <input type="color" value={sf[f] || "#000000"} onChange={e => set(f, e.target.value)} className="h-10 w-12 border" />
                <Input className="rounded-none font-mono text-xs" value={sf[f] || ""} onChange={e => set(f, e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs uppercase">Betűtípus pár</Label>
          <div className="grid md:grid-cols-3 gap-2">
            {FONT_OPTIONS.map(f => (
              <button key={f.label} onClick={() => setSf((s:any)=>({...s,font_heading:f.heading,font_body:f.body}))}
                className={`p-3 border text-left ${sf.font_heading === f.heading ? "border-accent" : "border-foreground/20"}`}>
                <div className="text-xs uppercase tracking-wider" style={{ fontFamily: f.heading }}>{f.heading}</div>
                <div className="text-xs text-muted-foreground" style={{ fontFamily: f.body }}>{f.body} text</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase">Logó</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" className="rounded-none" onChange={e => e.target.files?.[0] && handleFile("logo_url", e.target.files[0])} disabled={uploading === "logo_url"} />
              {sf.logo_url && <MediaImage bucket="partner-storefront-media" path={sf.logo_url} className="h-12 w-12 object-contain border" />}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase">Banner</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" className="rounded-none" onChange={e => e.target.files?.[0] && handleFile("banner_url", e.target.files[0])} disabled={uploading === "banner_url"} />
              {sf.banner_url && <MediaImage bucket="partner-storefront-media" path={sf.banner_url} className="h-12 w-20 object-cover border" />}
            </div>
          </div>
        </div>
      </Card>

      {/* Hero */}
      <Card className="rounded-none border-foreground/20 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest">Hero szekció</h3>
        <Input className="rounded-none" placeholder="Hero cím" value={sf.hero_title || ""} onChange={e => set("hero_title", e.target.value)} />
        <Textarea className="rounded-none" rows={2} placeholder="Hero alcím" value={sf.hero_subtitle || ""} onChange={e => set("hero_subtitle", e.target.value)} />
        <Input className="rounded-none" placeholder="CTA gomb szövege" value={sf.hero_cta_text || ""} onChange={e => set("hero_cta_text", e.target.value)} />
        <div>
          <Label className="text-xs uppercase">Hero kép</Label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" className="rounded-none" onChange={e => e.target.files?.[0] && handleFile("hero_image_url", e.target.files[0])} disabled={uploading === "hero_image_url"} />
            {sf.hero_image_url && <MediaImage bucket="partner-storefront-media" path={sf.hero_image_url} className="h-16 w-28 object-cover border" />}
          </div>
        </div>
      </Card>

      {/* Social */}
      <Card className="rounded-none border-foreground/20 p-6 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest">Közösségi linkek</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Input className="rounded-none" placeholder="Instagram URL" value={sf.instagram_url || ""} onChange={e => set("instagram_url", e.target.value)} />
          <Input className="rounded-none" placeholder="TikTok URL" value={sf.tiktok_url || ""} onChange={e => set("tiktok_url", e.target.value)} />
          <Input className="rounded-none" placeholder="Facebook URL" value={sf.facebook_url || ""} onChange={e => set("facebook_url", e.target.value)} />
          <Input className="rounded-none" placeholder="YouTube URL" value={sf.youtube_url || ""} onChange={e => set("youtube_url", e.target.value)} />
        </div>
      </Card>

      {/* SEO */}
      <Card className="rounded-none border-foreground/20 p-6 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest">SEO</h3>
        <Input className="rounded-none" placeholder="Meta title (max 60)" maxLength={60} value={sf.meta_title || ""} onChange={e => set("meta_title", e.target.value)} />
        <Textarea className="rounded-none" rows={2} placeholder="Meta description (max 160)" maxLength={160} value={sf.meta_description || ""} onChange={e => set("meta_description", e.target.value)} />
      </Card>
    </div>
  );
};

export default StorefrontEditorTab;
