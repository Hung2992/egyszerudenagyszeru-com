import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Share2 } from "lucide-react";

interface SocialMediaSettings {
  id: string;
  social_facebook: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
}

const AdminSocialMediaTab = () => {
  const [settings, setSettings] = useState<SocialMediaSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("id, social_facebook, social_instagram, social_tiktok, social_youtube")
        .limit(1)
        .maybeSingle();

      if (error) {
        toast({ title: "Hiba", description: error.message, variant: "destructive" });
        return;
      }

      if (data) setSettings(data as SocialMediaSettings);
    };
    fetch();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      social_facebook: settings.social_facebook,
      social_instagram: settings.social_instagram,
      social_tiktok: settings.social_tiktok,
      social_youtube: settings.social_youtube,
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
            <Input value={settings.social_facebook ?? ""} onChange={e => setSettings({ ...settings, social_facebook: e.target.value })} placeholder="https://facebook.com/..." className="rounded-none mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Instagram URL</Label>
            <Input value={settings.social_instagram ?? ""} onChange={e => setSettings({ ...settings, social_instagram: e.target.value })} placeholder="https://instagram.com/..." className="rounded-none mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">TikTok URL</Label>
            <Input value={settings.social_tiktok ?? ""} onChange={e => setSettings({ ...settings, social_tiktok: e.target.value })} placeholder="https://tiktok.com/@..." className="rounded-none mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">YouTube URL</Label>
            <Input value={settings.social_youtube ?? ""} onChange={e => setSettings({ ...settings, social_youtube: e.target.value })} placeholder="https://youtube.com/..." className="rounded-none mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSocialMediaTab;
