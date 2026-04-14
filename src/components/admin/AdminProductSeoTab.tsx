import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Search, Globe, FileText, Link2 } from "lucide-react";

const AdminProductSeoTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_meta_title: true,
    meta_title_template: "{product_name} - {category} | Webshop",
    auto_meta_description: true,
    meta_desc_template: "Vásárolj {product_name} terméket kedvező áron! {category} kategória. Gyors szállítás.",
    auto_slug: true,
    canonical_url_enabled: true,
    schema_markup_enabled: true,
    schema_type: "Product",
    sitemap_enabled: true,
    sitemap_priority: 0.8,
    sitemap_changefreq: "weekly",
    og_image_enabled: true,
    noindex_out_of_stock: false,
    redirect_deleted_products: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("product_seo_manager_enabled, product_seo_manager_settings").limit(1).single();
      if (data) {
        setEnabled(data.product_seo_manager_enabled ?? false);
        if (data.product_seo_manager_settings && typeof data.product_seo_manager_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.product_seo_manager_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      product_seo_manager_enabled: enabled,
      product_seo_manager_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Termék SEO beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Search className="w-5 h-5 text-accent" /> Termék SEO kezelő</h2>
          <p className="text-sm text-muted-foreground">Meta adatok, sitemap, schema markup és URL kezelés</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Meta adatok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_meta_title} onCheckedChange={(v) => setSettings({ ...settings, auto_meta_title: v })} />
            <Label className="text-sm">Automatikus meta cím</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cím sablon</Label>
            <Input value={settings.meta_title_template} onChange={(e) => setSettings({ ...settings, meta_title_template: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_meta_description} onCheckedChange={(v) => setSettings({ ...settings, auto_meta_description: v })} />
            <Label className="text-sm">Automatikus meta leírás</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Leírás sablon</Label>
            <Input value={settings.meta_desc_template} onChange={(e) => setSettings({ ...settings, meta_desc_template: e.target.value })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Link2 className="w-4 h-4" /> URL & Slug</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_slug} onCheckedChange={(v) => setSettings({ ...settings, auto_slug: v })} />
            <Label className="text-sm">Automatikus SEO-barát slug</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.canonical_url_enabled} onCheckedChange={(v) => setSettings({ ...settings, canonical_url_enabled: v })} />
            <Label className="text-sm">Canonical URL</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.redirect_deleted_products} onCheckedChange={(v) => setSettings({ ...settings, redirect_deleted_products: v })} />
            <Label className="text-sm">Törölt termékek átirányítása</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.noindex_out_of_stock} onCheckedChange={(v) => setSettings({ ...settings, noindex_out_of_stock: v })} />
            <Label className="text-sm">Elfogyott termékek noindex</Label>
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Globe className="w-4 h-4" /> Schema & Sitemap</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.schema_markup_enabled} onCheckedChange={(v) => setSettings({ ...settings, schema_markup_enabled: v })} />
            <Label className="text-sm">Schema markup (JSON-LD)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.sitemap_enabled} onCheckedChange={(v) => setSettings({ ...settings, sitemap_enabled: v })} />
            <Label className="text-sm">Sitemap generálás</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sitemap prioritás</Label>
            <Input type="number" step="0.1" min={0} max={1} value={settings.sitemap_priority} onChange={(e) => setSettings({ ...settings, sitemap_priority: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Frissítési gyakoriság</Label>
            <select className="w-full border border-border bg-background text-foreground p-2 rounded text-sm" value={settings.sitemap_changefreq} onChange={(e) => setSettings({ ...settings, sitemap_changefreq: e.target.value })}>
              <option value="daily">Naponta</option>
              <option value="weekly">Hetente</option>
              <option value="monthly">Havonta</option>
            </select>
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">📸 Open Graph</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.og_image_enabled} onCheckedChange={(v) => setSettings({ ...settings, og_image_enabled: v })} />
            <Label className="text-sm">OG kép automatikus generálás</Label>
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminProductSeoTab;
