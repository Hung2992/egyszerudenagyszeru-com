import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Share2 } from "lucide-react";

const AdminSocialMediaTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data);
    };
    fetch();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      social_facebook_url: settings.social_facebook_url,
      social_instagram_url: settings.social_instagram_url,
      social_tiktok_url: settings.social_tiktok_url,
      social_youtube_url: settings.social_youtube_url,
      social_auto_post_enabled: settings.social_auto_post_enabled,
      social_share_buttons_enabled: settings.social_share_buttons_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mentve", description: "Közösségi média beállítások frissítve." });
    }
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Közösségi média integráció</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Share2 className="h-4 w-4 text-accent" />
          Közösségi fiókok
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Facebook URL</Label>
            <Input value={settings.social_facebook_url ?? ""} onChange={e => setSettings({ ...settings, social_facebook_url: e.target.value })} placeholder="https://facebook.com/..." className="rounded-none mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Instagram URL</Label>
            <Input value={settings.social_instagram_url ?? ""} onChange={e => setSettings({ ...settings, social_instagram_url: e.target.value })} placeholder="https://instagram.com/..." className="rounded-none mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">TikTok URL</Label>
            <Input value={settings.social_tiktok_url ?? ""} onChange={e => setSettings({ ...settings, social_tiktok_url: e.target.value })} placeholder="https://tiktok.com/@..." className="rounded-none mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">YouTube URL</Label>
            <Input value={settings.social_youtube_url ?? ""} onChange={e => setSettings({ ...settings, social_youtube_url: e.target.value })} placeholder="https://youtube.com/..." className="rounded-none mt-1" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Automatikus posztolás</Label>
            <Switch checked={settings.social_auto_post_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, social_auto_post_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Új termékek és akciók automatikus megosztása a közösségi fiókokban.</p>
        </div>
        <div className="border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Megosztás gombok a termékoldalakon</Label>
            <Switch checked={settings.social_share_buttons_enabled ?? true} onCheckedChange={v => setSettings({ ...settings, social_share_buttons_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Megosztás gombok megjelenítése a termékoldalakon (Facebook, X, WhatsApp).</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSocialMediaTab;
