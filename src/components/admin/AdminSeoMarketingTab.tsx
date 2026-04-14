import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Search, BarChart3, Globe, Save, Image } from "lucide-react";

interface SeoSettings {
  id: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  google_analytics_id: string | null;
  facebook_pixel_id: string | null;
  meta_robots: string | null;
  og_image_url: string | null;
  sitemap_enabled: boolean;
  social_facebook: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
}

const AdminSeoMarketingTab = () => {
  const [settings, setSettings] = useState<SeoSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    const { data } = await supabase.from("store_settings").select("id, seo_title, seo_description, seo_keywords, google_analytics_id, facebook_pixel_id, meta_robots, og_image_url, sitemap_enabled, social_facebook, social_instagram, social_tiktok").limit(1).single();
    if (data) setSettings(data as any);
  };

  useEffect(() => { fetchSettings(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, ...payload } = settings;
    await supabase.from("store_settings").update(payload as any).eq("id", id);
    toast({ title: "SEO & Marketing beállítások mentve!" });
    setSaving(false);
  };

  if (!settings) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">SEO & Marketing</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={saveSettings} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      {/* SEO Settings */}
      <div className="border bg-card p-5 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Search className="h-4 w-4" /> SEO beállítások
        </h3>
        <p className="text-xs text-muted-foreground">Keresőoptimalizálás a jobb Google rangsorolásért.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Meta cím (max 60 karakter)</Label>
            <Input value={settings.seo_title || ""} onChange={e => setSettings({ ...settings, seo_title: e.target.value })} className="mt-1" placeholder="Webshop neve - Fő kulcsszó" />
            <p className="text-[10px] text-muted-foreground mt-1">{(settings.seo_title || "").length}/60 karakter</p>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Meta leírás (max 160 karakter)</Label>
            <Textarea value={settings.seo_description || ""} onChange={e => setSettings({ ...settings, seo_description: e.target.value })} className="mt-1 rounded-none min-h-[60px] text-xs" placeholder="Rövid, vonzó leírás a keresőtalálatokban..." />
            <p className="text-[10px] text-muted-foreground mt-1">{(settings.seo_description || "").length}/160 karakter</p>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kulcsszavak (vesszővel elválasztva)</Label>
            <Input value={settings.seo_keywords || ""} onChange={e => setSettings({ ...settings, seo_keywords: e.target.value })} className="mt-1" placeholder="webshop, divat, ruha, cipő" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Meta Robots</Label>
            <select value={settings.meta_robots || "index, follow"} onChange={e => setSettings({ ...settings, meta_robots: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="index, follow">index, follow (ajánlott)</option>
              <option value="noindex, follow">noindex, follow</option>
              <option value="index, nofollow">index, nofollow</option>
              <option value="noindex, nofollow">noindex, nofollow</option>
            </select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">OG kép URL</Label>
            <Input value={settings.og_image_url || ""} onChange={e => setSettings({ ...settings, og_image_url: e.target.value })} className="mt-1" placeholder="https://..." />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={settings.sitemap_enabled} onChange={e => setSettings({ ...settings, sitemap_enabled: e.target.checked })} className="rounded" />
              Sitemap engedélyezése
            </label>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="border bg-card p-5 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Analitika & Követőkódok
        </h3>
        <p className="text-xs text-muted-foreground">Google Analytics és Facebook Pixel azonosítók a látogatói statisztikákhoz és hirdetésekhez.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Google Analytics ID</Label>
            <Input value={settings.google_analytics_id || ""} onChange={e => setSettings({ ...settings, google_analytics_id: e.target.value })} className="mt-1" placeholder="G-XXXXXXXXXX vagy UA-XXXXXXXX-X" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Facebook Pixel ID</Label>
            <Input value={settings.facebook_pixel_id || ""} onChange={e => setSettings({ ...settings, facebook_pixel_id: e.target.value })} className="mt-1" placeholder="123456789012345" />
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="border bg-card p-5 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Globe className="h-4 w-4" /> Közösségi média
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Facebook</Label>
            <Input value={settings.social_facebook || ""} onChange={e => setSettings({ ...settings, social_facebook: e.target.value })} className="mt-1" placeholder="https://facebook.com/..." />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Instagram</Label>
            <Input value={settings.social_instagram || ""} onChange={e => setSettings({ ...settings, social_instagram: e.target.value })} className="mt-1" placeholder="https://instagram.com/..." />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">TikTok</Label>
            <Input value={settings.social_tiktok || ""} onChange={e => setSettings({ ...settings, social_tiktok: e.target.value })} className="mt-1" placeholder="https://tiktok.com/@..." />
          </div>
        </div>
      </div>

      {/* SEO Preview */}
      <div className="border bg-card p-5 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider">Google keresési előnézet</h3>
        <div className="bg-background border p-4 rounded-lg">
          <p className="text-blue-600 text-base font-medium truncate">{settings.seo_title || "Webshop címe"}</p>
          <p className="text-green-700 text-xs truncate">https://yourdomain.com</p>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{settings.seo_description || "Meta leírás jelenik meg itt a keresőtalálatok között..."}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSeoMarketingTab;
