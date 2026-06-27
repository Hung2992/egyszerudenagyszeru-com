import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Save, Send, ExternalLink, Plus, Trash2 } from "lucide-react";
import { uploadPartnerMedia } from "@/lib/partner-storage";
import MediaImage from "./MediaImage";
import PartnerDomainTab from "./PartnerDomainTab";
import StorefrontVersionsTab from "./StorefrontVersionsTab";
import StorefrontLivePreview from "./StorefrontLivePreview";
import PreviewTokenManager from "./PreviewTokenManager";
import PartnerStorefrontAuditLogTab from "./PartnerStorefrontAuditLogTab";
import { buildPreviewUrl, buildPublicUrl } from "@/lib/partner-storefront-urls";

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
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("partner_storefronts").select("*").eq("partner_id", partnerId).maybeSingle();
    if (data) setSf(data);
    else setSf({
      partner_id: partnerId,
      slug: "", display_name: "", tagline: "", about_html: "",
      primary_color: "#000000", accent_color: "#D4AF37", bg_color: "#0a0a0a", text_color: "#ffffff",
      font_heading: "Space Grotesk", font_body: "Inter", theme_preset: "dark_minimal",
      hero_title: "", hero_subtitle: "", hero_cta_text: "Vásárolj most",
      hero_layout: "split", hero_badge_enabled: false, hero_badge_text: "", hero_overlay_opacity: 0.5,
      topbar_enabled: true, topbar_text: "Üdv a boltban! Nézd meg a kollekciókat.",
      section1_enabled: false, section2_enabled: false,
      featured_products_enabled: true, featured_products_title: "Kiemelt termékek", featured_product_ids: [],
      testimonials_enabled: false, testimonials_title: "Vásárlóink mondták", testimonials: [],
      newsletter_enabled: false, newsletter_title: "Iratkozz fel hírlevelünkre", newsletter_subtitle: "Kapj értesítést új termékekről és akciókról.",
      footer_text: "", footer_links: [],
      instagram_url: "", tiktok_url: "", facebook_url: "", youtube_url: "",
      meta_title: "", meta_description: "",
      is_published: false,
    });
    const { data: prods } = await supabase.from("partner_products").select("id, title, slug").eq("partner_id", partnerId).order("created_at", { ascending: false });
    setProducts(prods || []);
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
    const { data } = await supabase.from("partner_storefronts").select("id, partner_id").eq("slug", slug).maybeSingle();
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
    if (publishRequest) {
      try {
        const { data: p } = await supabase.from("partners").select("email, full_name, company_name").eq("id", partnerId).maybeSingle();
        if (p?.email) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "partner-storefront-version-submitted",
              recipientEmail: p.email,
              idempotencyKey: `sf-submit-${sf.id || data?.id}-${Date.now()}`,
              templateData: {
                full_name: p.company_name || p.full_name,
                storefront_name: (data as any)?.display_name || sf.display_name,
                submitted_at: new Date().toLocaleString("hu-HU"),
                portal_url: `${window.location.origin}/partner`,
              },
            },
          });
        }
      } catch (_) { /* swallow */ }
    }
    toast({ title: publishRequest ? "Mentve és publikálási kérés elküldve" : "Mentve" });
  };

  const applyTheme = (t: typeof THEMES[number]) => {
    setSf((s: any) => ({ ...s, theme_preset: t.id, bg_color: t.bg, text_color: t.text, primary_color: t.primary, accent_color: t.accent }));
  };

  const toggleFeatured = (id: string) => {
    const cur: string[] = sf.featured_product_ids || [];
    set("featured_product_ids", cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const addTestimonial = () => set("testimonials", [...(sf.testimonials || []), { name: "", text: "", rating: 5 }]);
  const updTestimonial = (i: number, k: string, v: any) => {
    const arr = [...(sf.testimonials || [])];
    arr[i] = { ...arr[i], [k]: v };
    set("testimonials", arr);
  };
  const rmTestimonial = (i: number) => set("testimonials", (sf.testimonials || []).filter((_: any, idx: number) => idx !== i));

  const addFooterLink = () => set("footer_links", [...(sf.footer_links || []), { label: "", url: "" }]);
  const updFooterLink = (i: number, k: string, v: any) => {
    const arr = [...(sf.footer_links || [])];
    arr[i] = { ...arr[i], [k]: v };
    set("footer_links", arr);
  };
  const rmFooterLink = (i: number) => set("footer_links", (sf.footer_links || []).filter((_: any, idx: number) => idx !== i));

  if (!sf) return <div className="text-sm text-muted-foreground">Betöltés…</div>;

  const previewUrl = buildPreviewUrl(window.location.origin, sf);
  const publicUrl = buildPublicUrl(window.location.origin, sf);
  const subdomainUrl = sf.slug ? `https://${sf.slug}.egyszerudenagyszeru.com` : null;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className="rounded-none border-foreground/20 p-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className="rounded-none uppercase" variant={sf.is_published ? "default" : "secondary"}>
            {sf.is_published ? "Élesben" : sf.publish_requested_at ? "Várja a jóváhagyást" : "Vázlat"}
          </Badge>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs underline flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Előnézet
            </a>
          )}
          {subdomainUrl && sf.is_published && (
            <a href={subdomainUrl} target="_blank" rel="noreferrer" className="text-xs underline flex items-center gap-1 text-accent">
              <ExternalLink className="h-3 w-3" /> {sf.slug}.egyszerudenagyszeru.com
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

      <Tabs defaultValue="basics">
        <TabsList className="rounded-none flex flex-wrap h-auto">
          <TabsTrigger value="basics" className="rounded-none">Alap</TabsTrigger>
          <TabsTrigger value="design" className="rounded-none">Megjelenés</TabsTrigger>
          <TabsTrigger value="topbar" className="rounded-none">Topbar</TabsTrigger>
          <TabsTrigger value="hero" className="rounded-none">Hero</TabsTrigger>
          <TabsTrigger value="sections" className="rounded-none">Szekciók</TabsTrigger>
          <TabsTrigger value="featured" className="rounded-none">Kiemelt</TabsTrigger>
          <TabsTrigger value="testimonials" className="rounded-none">Vélemények</TabsTrigger>
          <TabsTrigger value="newsletter" className="rounded-none">Newsletter</TabsTrigger>
          <TabsTrigger value="footer" className="rounded-none">Footer</TabsTrigger>
          <TabsTrigger value="social" className="rounded-none">Közösségi</TabsTrigger>
          <TabsTrigger value="seo" className="rounded-none">SEO</TabsTrigger>
          <TabsTrigger value="company" className="rounded-none">Cégadat</TabsTrigger>
          <TabsTrigger value="domain" className="rounded-none">Domain</TabsTrigger>
          <TabsTrigger value="versions" className="rounded-none">Verziók</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-none">Napló</TabsTrigger>
          <TabsTrigger value="preview" className="rounded-none">Élő előnézet</TabsTrigger>
          <TabsTrigger value="share" className="rounded-none">Megosztás</TabsTrigger>
        </TabsList>

        {/* BASICS */}
        <TabsContent value="basics">
          <Card className="rounded-none border-foreground/20 p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase">URL slug *</Label>
                <Input className="rounded-none font-mono" value={sf.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="pl. john-streetwear" />
                <div className="mt-2 space-y-1 text-[11px]">
                  <div className="font-bold uppercase tracking-widest text-muted-foreground">A te címeid:</div>
                  {subdomainUrl && <div className="font-mono">{sf.slug}.egyszerudenagyszeru.com</div>}
                  <div className="font-mono text-muted-foreground">egyszerudenagyszeru.com/b/{sf.slug || "..."}</div>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase">Márka neve *</Label>
                <Input className="rounded-none" value={sf.display_name} onChange={e => set("display_name", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase">Rövid mottó</Label>
              <Input className="rounded-none" value={sf.tagline || ""} onChange={e => set("tagline", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs uppercase">Bemutatkozás (HTML)</Label>
              <Textarea className="rounded-none" rows={5} value={sf.about_html || ""} onChange={e => set("about_html", e.target.value)} />
            </div>
          </Card>
        </TabsContent>

        {/* DESIGN */}
        <TabsContent value="design">
          <Card className="rounded-none border-foreground/20 p-6 space-y-4">
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
        </TabsContent>

        {/* TOPBAR */}
        <TabsContent value="topbar">
          <Card className="rounded-none border-foreground/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase">Topbar megjelenítése</Label>
              <Switch checked={!!sf.topbar_enabled} onCheckedChange={v => set("topbar_enabled", v)} />
            </div>
            <Input className="rounded-none" placeholder="Topbar szöveg" value={sf.topbar_text || ""} onChange={e => set("topbar_text", e.target.value)} />
          </Card>
        </TabsContent>

        {/* HERO */}
        <TabsContent value="hero">
          <Card className="rounded-none border-foreground/20 p-6 space-y-4">
            <div>
              <Label className="text-xs uppercase">Layout</Label>
              <div className="grid grid-cols-3 gap-2">
                {["split", "center", "fullscreen"].map(l => (
                  <button key={l} onClick={() => set("hero_layout", l)} className={`p-3 border text-xs uppercase ${sf.hero_layout === l ? "border-accent" : "border-foreground/20"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase">Hero badge</Label>
              <Switch checked={!!sf.hero_badge_enabled} onCheckedChange={v => set("hero_badge_enabled", v)} />
            </div>
            {sf.hero_badge_enabled && (
              <Input className="rounded-none" placeholder="Badge szöveg" value={sf.hero_badge_text || ""} onChange={e => set("hero_badge_text", e.target.value)} />
            )}
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
            <div>
              <Label className="text-xs uppercase">Overlay sötétség ({Math.round((sf.hero_overlay_opacity ?? 0.5) * 100)}%)</Label>
              <input type="range" min={0} max={1} step={0.05} value={sf.hero_overlay_opacity ?? 0.5} onChange={e => set("hero_overlay_opacity", parseFloat(e.target.value))} className="w-full" />
            </div>
          </Card>
        </TabsContent>

        {/* SECTIONS */}
        <TabsContent value="sections">
          <div className="space-y-4">
            {[1, 2].map(n => (
              <Card key={n} className="rounded-none border-foreground/20 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Szekció {n}</h3>
                  <Switch checked={!!sf[`section${n}_enabled`]} onCheckedChange={v => set(`section${n}_enabled`, v)} />
                </div>
                <Input className="rounded-none" placeholder="Cím" value={sf[`section${n}_title`] || ""} onChange={e => set(`section${n}_title`, e.target.value)} />
                <Textarea className="rounded-none" rows={2} placeholder="Alcím" value={sf[`section${n}_subtitle`] || ""} onChange={e => set(`section${n}_subtitle`, e.target.value)} />
                <div className="grid md:grid-cols-2 gap-2">
                  <Input className="rounded-none" placeholder="CTA szöveg" value={sf[`section${n}_cta_text`] || ""} onChange={e => set(`section${n}_cta_text`, e.target.value)} />
                  <Input className="rounded-none" placeholder="CTA URL" value={sf[`section${n}_cta_url`] || ""} onChange={e => set(`section${n}_cta_url`, e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" className="rounded-none" onChange={e => e.target.files?.[0] && handleFile(`section${n}_image_url`, e.target.files[0])} disabled={uploading === `section${n}_image_url`} />
                  {sf[`section${n}_image_url`] && <MediaImage bucket="partner-storefront-media" path={sf[`section${n}_image_url`]} className="h-16 w-24 object-cover border" />}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* FEATURED */}
        <TabsContent value="featured">
          <Card className="rounded-none border-foreground/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase">Kiemelt termékek szekció</Label>
              <Switch checked={!!sf.featured_products_enabled} onCheckedChange={v => set("featured_products_enabled", v)} />
            </div>
            <Input className="rounded-none" placeholder="Szekció címe" value={sf.featured_products_title || ""} onChange={e => set("featured_products_title", e.target.value)} />
            <div>
              <Label className="text-xs uppercase mb-2 block">Válassz termékeket ({(sf.featured_product_ids || []).length} kiválasztva)</Label>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">Még nincsenek termékeid.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-2 max-h-80 overflow-auto">
                  {products.map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-2 border border-foreground/20 cursor-pointer">
                      <input type="checkbox" checked={(sf.featured_product_ids || []).includes(p.id)} onChange={() => toggleFeatured(p.id)} />
                      <span className="text-sm">{p.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* TESTIMONIALS */}
        <TabsContent value="testimonials">
          <Card className="rounded-none border-foreground/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase">Vélemények szekció</Label>
              <Switch checked={!!sf.testimonials_enabled} onCheckedChange={v => set("testimonials_enabled", v)} />
            </div>
            <Input className="rounded-none" placeholder="Cím" value={sf.testimonials_title || ""} onChange={e => set("testimonials_title", e.target.value)} />
            <div className="space-y-3">
              {(sf.testimonials || []).map((t: any, i: number) => (
                <div key={i} className="border border-foreground/20 p-3 space-y-2">
                  <div className="grid md:grid-cols-3 gap-2">
                    <Input className="rounded-none" placeholder="Név" value={t.name || ""} onChange={e => updTestimonial(i, "name", e.target.value)} />
                    <Input className="rounded-none" type="number" min={1} max={5} placeholder="Csillagok (1-5)" value={t.rating || 5} onChange={e => updTestimonial(i, "rating", parseInt(e.target.value) || 5)} />
                    <Button variant="outline" size="sm" className="rounded-none" onClick={() => rmTestimonial(i)}><Trash2 className="h-4 w-4 mr-1" /> Törlés</Button>
                  </div>
                  <Textarea className="rounded-none" rows={2} placeholder="Vélemény szövege" value={t.text || ""} onChange={e => updTestimonial(i, "text", e.target.value)} />
                </div>
              ))}
              <Button variant="outline" size="sm" className="rounded-none" onClick={addTestimonial}><Plus className="h-4 w-4 mr-1" /> Új vélemény</Button>
            </div>
          </Card>
        </TabsContent>

        {/* NEWSLETTER */}
        <TabsContent value="newsletter">
          <Card className="rounded-none border-foreground/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase">Newsletter szekció</Label>
              <Switch checked={!!sf.newsletter_enabled} onCheckedChange={v => set("newsletter_enabled", v)} />
            </div>
            <Input className="rounded-none" placeholder="Cím" value={sf.newsletter_title || ""} onChange={e => set("newsletter_title", e.target.value)} />
            <Textarea className="rounded-none" rows={2} placeholder="Alcím" value={sf.newsletter_subtitle || ""} onChange={e => set("newsletter_subtitle", e.target.value)} />
          </Card>
        </TabsContent>

        {/* FOOTER */}
        <TabsContent value="footer">
          <Card className="rounded-none border-foreground/20 p-6 space-y-4">
            <Input className="rounded-none" placeholder="Footer szöveg (pl. cégadat)" value={sf.footer_text || ""} onChange={e => set("footer_text", e.target.value)} />
            <div className="space-y-2">
              <Label className="text-xs uppercase">Footer linkek</Label>
              {(sf.footer_links || []).map((l: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input className="rounded-none" placeholder="Címke" value={l.label || ""} onChange={e => updFooterLink(i, "label", e.target.value)} />
                  <Input className="rounded-none" placeholder="URL" value={l.url || ""} onChange={e => updFooterLink(i, "url", e.target.value)} />
                  <Button variant="outline" size="sm" className="rounded-none" onClick={() => rmFooterLink(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="rounded-none" onClick={addFooterLink}><Plus className="h-4 w-4 mr-1" /> Új link</Button>
            </div>
          </Card>
        </TabsContent>

        {/* SOCIAL */}
        <TabsContent value="social">
          <Card className="rounded-none border-foreground/20 p-6 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Input className="rounded-none" placeholder="Instagram URL" value={sf.instagram_url || ""} onChange={e => set("instagram_url", e.target.value)} />
              <Input className="rounded-none" placeholder="TikTok URL" value={sf.tiktok_url || ""} onChange={e => set("tiktok_url", e.target.value)} />
              <Input className="rounded-none" placeholder="Facebook URL" value={sf.facebook_url || ""} onChange={e => set("facebook_url", e.target.value)} />
              <Input className="rounded-none" placeholder="YouTube URL" value={sf.youtube_url || ""} onChange={e => set("youtube_url", e.target.value)} />
            </div>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo">
          <Card className="rounded-none border-foreground/20 p-6 space-y-3">
            <div>
              <Label className="text-xs uppercase">Meta title (max 60)</Label>
              <Input className="rounded-none" maxLength={60} value={sf.meta_title || ""} onChange={e => set("meta_title", e.target.value)} placeholder={`${sf.display_name || "Márka"} – ${sf.tagline || "mottó"}`} />
              <p className="text-[10px] text-muted-foreground mt-1">Ha üres: márkanév – mottó automatikusan.</p>
            </div>
            <div>
              <Label className="text-xs uppercase">Meta description (max 160)</Label>
              <Textarea className="rounded-none" rows={2} maxLength={160} value={sf.meta_description || ""} onChange={e => set("meta_description", e.target.value)} placeholder="Rövid leírás Google találatokhoz" />
              <p className="text-[10px] text-muted-foreground mt-1">Ha üres: mottó + kulcsszavak vagy a bemutatkozás eleje.</p>
            </div>
            <div>
              <Label className="text-xs uppercase">Kulcsszavak (vesszővel)</Label>
              <Input
                className="rounded-none"
                value={(sf.seo_keywords || []).join(", ")}
                onChange={e => set("seo_keywords", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                placeholder="streetwear, férfi póló, oversized hoodie"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {(sf.seo_keywords || []).map((k: string) => (
                  <span key={k} className="px-2 py-0.5 bg-muted text-xs">{k}</span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">A meta description és JSON-LD ezekből generálódik.</p>
            </div>
          </Card>
        </TabsContent>

        {/* COMPANY */}
        <TabsContent value="company">
          <Card className="rounded-none border-foreground/20 p-6 space-y-3">
            <p className="text-xs text-muted-foreground">Ezek az adatok jelennek meg a Google JSON-LD struktúrában (Store típus).</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase">Cég jogi neve</Label>
                <Input className="rounded-none" value={sf.company_legal_name || ""} onChange={e => set("company_legal_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase">Adószám</Label>
                <Input className="rounded-none" value={sf.company_tax_id || ""} onChange={e => set("company_tax_id", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase">Cégjegyzékszám</Label>
                <Input className="rounded-none" value={sf.company_registration_number || ""} onChange={e => set("company_registration_number", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase">Alapítás éve</Label>
                <Input className="rounded-none" type="number" min={1900} max={new Date().getFullYear()} value={sf.founding_year || ""} onChange={e => set("founding_year", parseInt(e.target.value) || null)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs uppercase">Cím</Label>
                <Input className="rounded-none" value={sf.company_address || ""} onChange={e => set("company_address", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase">Telefon</Label>
                <Input className="rounded-none" value={sf.company_phone || ""} onChange={e => set("company_phone", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase">E-mail</Label>
                <Input className="rounded-none" type="email" value={sf.company_email || ""} onChange={e => set("company_email", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase">További közösségi/profil linkek (JSON-LD sameAs, soronként)</Label>
              <Textarea
                className="rounded-none font-mono text-xs" rows={3}
                value={(sf.social_profiles || []).join("\n")}
                onChange={e => set("social_profiles", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                placeholder={"https://linkedin.com/...\nhttps://shoprenter.hu/...\nhttps://glami.hu/..."}
              />
            </div>
          </Card>
        </TabsContent>

        {/* DOMAIN */}
        <TabsContent value="domain">
          <PartnerDomainTab partnerId={partnerId} />
        </TabsContent>

        {/* VERSIONS */}
        <TabsContent value="versions">
          <StorefrontVersionsTab storefrontId={sf?.id ?? null} onRestored={load} />
        </TabsContent>

        {/* AUDIT */}
        <TabsContent value="audit">
          <PartnerStorefrontAuditLogTab partnerId={partnerId} storefrontId={sf?.id} />
        </TabsContent>

        {/* LIVE PREVIEW */}
        <TabsContent value="preview">
          <StorefrontLivePreview storefrontId={sf?.id ?? null} slug={sf?.slug || ""} draft={sf} />
        </TabsContent>

        {/* SHARE TOKENS */}
        <TabsContent value="share">
          {sf?.id ? (
            <PreviewTokenManager storefrontId={sf.id} slug={sf.slug} />
          ) : (
            <p className="text-sm text-muted-foreground">Először mentsd a storefrontot, hogy megosztó linkeket hozhass létre.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StorefrontEditorTab;
