import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Image, FolderOpen, Settings } from "lucide-react";

const AdminMediaManagerTab = () => {
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
      media_manager_enabled: settings.media_manager_enabled,
      media_manager_settings: settings.media_manager_settings,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Média kezelő beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const mm = settings.media_manager_settings && typeof settings.media_manager_settings === "object" ? settings.media_manager_settings : {};
  const update = (field: string, value: any) => {
    setSettings({ ...settings, media_manager_settings: { ...mm, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Média kezelő</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Image className="h-4 w-4 text-accent" /> Média kezelő engedélyezése
          </div>
          <Switch checked={settings.media_manager_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, media_manager_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Képek, videók tömeges feltöltése, szervezése és optimalizálása.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Settings className="h-4 w-4 text-accent" /> Feltöltési beállítások
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Max fájlméret (MB)</Label>
            <Input type="number" value={mm.max_file_size_mb ?? 10} onChange={e => update("max_file_size_mb", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Engedélyezett formátumok</Label>
            <Input value={mm.allowed_formats ?? "jpg,png,webp,mp4"} onChange={e => update("allowed_formats", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="jpg,png,webp" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Kép max szélesség (px)</Label>
            <Input type="number" value={mm.max_width ?? 2000} onChange={e => update("max_width", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Thumbnail méret (px)</Label>
            <Input type="number" value={mm.thumbnail_size ?? 300} onChange={e => update("thumbnail_size", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <FolderOpen className="h-4 w-4 text-accent" /> Optimalizáció
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider">Automatikus tömörítés</Label>
          <Switch checked={mm.auto_compress ?? true} onCheckedChange={v => update("auto_compress", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider">WebP konverzió</Label>
          <Switch checked={mm.webp_conversion ?? true} onCheckedChange={v => update("webp_conversion", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider">Lazy loading</Label>
          <Switch checked={mm.lazy_loading ?? true} onCheckedChange={v => update("lazy_loading", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider">Vízjel hozzáadás</Label>
          <Switch checked={mm.watermark ?? false} onCheckedChange={v => update("watermark", v)} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Tömörítési minőség (%)</Label>
          <Input type="number" min={10} max={100} value={mm.compression_quality ?? 80} onChange={e => update("compression_quality", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
        </div>
      </div>
    </div>
  );
};

export default AdminMediaManagerTab;
