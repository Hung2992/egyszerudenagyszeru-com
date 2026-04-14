import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Search, Globe, FileText } from "lucide-react";

interface SeoSettings {
  meta_title_suffix: string;
  meta_description_default: string;
  robots_txt_custom: string;
  og_default_image: string;
  structured_data_enabled: boolean;
  canonical_url_base: string;
  auto_meta_generation: boolean;
  hreflang_enabled: boolean;
  noindex_out_of_stock: boolean;
}

const defaultSeo: SeoSettings = {
  meta_title_suffix: "",
  meta_description_default: "",
  robots_txt_custom: "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout",
  og_default_image: "",
  structured_data_enabled: true,
  canonical_url_base: "",
  auto_meta_generation: false,
  hreflang_enabled: false,
  noindex_out_of_stock: false,
};

const AdminAdvancedSeoTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data);
    };
    f();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      seo_advanced_settings: settings.seo_advanced_settings,
      seo_sitemap_enabled: settings.seo_sitemap_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "SEO beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const seo: SeoSettings = { ...defaultSeo, ...(typeof settings.seo_advanced_settings === "object" && settings.seo_advanced_settings !== null ? settings.seo_advanced_settings : {}) };

  const updateSeo = (field: string, value: any) => {
    setSettings({ ...settings, seo_advanced_settings: { ...seo, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Haladó SEO eszközök</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Globe className="h-4 w-4 text-accent" /> Sitemap generálás
          </div>
          <Switch checked={settings.seo_sitemap_enabled ?? true} onCheckedChange={v => setSettings({ ...settings, seo_sitemap_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Automatikus sitemap.xml generálás a keresőmotorok számára.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Search className="h-4 w-4 text-accent" /> Meta beállítások
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label className="text-xs uppercase tracking-wider">Oldal cím utótag</Label><Input value={seo.meta_title_suffix} onChange={e => updateSeo("meta_title_suffix", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="| Webshop neve" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Canonical URL alap</Label><Input value={seo.canonical_url_base} onChange={e => updateSeo("canonical_url_base", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="https://example.com" /></div>
          <div className="md:col-span-2"><Label className="text-xs uppercase tracking-wider">Alapértelmezett meta leírás</Label><Textarea value={seo.meta_description_default} onChange={e => updateSeo("meta_description_default", e.target.value)} className="rounded-none mt-1 text-xs min-h-[60px]" /></div>
          <div className="md:col-span-2"><Label className="text-xs uppercase tracking-wider">OG alapértelmezett kép URL</Label><Input value={seo.og_default_image} onChange={e => updateSeo("og_default_image", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="https://..." /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <FileText className="h-4 w-4 text-accent" /> Robots.txt
        </div>
        <Textarea value={seo.robots_txt_custom} onChange={e => updateSeo("robots_txt_custom", e.target.value)} className="rounded-none text-xs min-h-[100px] font-mono" />
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Egyéb SEO opciók</span>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Strukturált adatok (JSON-LD)</Label><Switch checked={seo.structured_data_enabled} onCheckedChange={v => updateSeo("structured_data_enabled", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Auto meta generálás</Label><Switch checked={seo.auto_meta_generation} onCheckedChange={v => updateSeo("auto_meta_generation", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Hreflang tagek</Label><Switch checked={seo.hreflang_enabled} onCheckedChange={v => updateSeo("hreflang_enabled", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Kifogyott termékek noindex</Label><Switch checked={seo.noindex_out_of_stock} onCheckedChange={v => updateSeo("noindex_out_of_stock", v)} /></div>
        </div>
      </div>
    </div>
  );
};

export default AdminAdvancedSeoTab;
