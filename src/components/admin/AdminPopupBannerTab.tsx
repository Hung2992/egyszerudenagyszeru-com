import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Trash2, Pencil, MonitorSmartphone, X } from "lucide-react";

interface PopupBanner {
  id: string;
  title: string;
  content: string;
  type: "popup" | "banner" | "exit_intent";
  position: "top" | "bottom" | "center";
  bg_color: string;
  text_color: string;
  cta_text: string;
  cta_url: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

const TYPES: Record<string, string> = { popup: "Popup", banner: "Banner sáv", exit_intent: "Exit-intent" };
const POSITIONS: Record<string, string> = { top: "Felül", bottom: "Alul", center: "Középen" };

const emptyBanner = (): PopupBanner => ({
  id: crypto.randomUUID(),
  title: "",
  content: "",
  type: "banner",
  position: "top",
  bg_color: "#000000",
  text_color: "#ffffff",
  cta_text: "",
  cta_url: "",
  is_active: true,
  start_date: "",
  end_date: "",
});

const AdminPopupBannerTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

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
      popup_banners: settings.popup_banners,
      popup_exit_intent_enabled: settings.popup_exit_intent_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Popup/Banner beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const banners: PopupBanner[] = Array.isArray(settings.popup_banners) ? settings.popup_banners : [];

  const addBanner = () => {
    const n = emptyBanner();
    setSettings({ ...settings, popup_banners: [...banners, n] });
    setEditIdx(banners.length);
  };

  const updateBanner = (idx: number, field: string, value: any) => {
    const updated = [...banners];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, popup_banners: updated });
  };

  const removeBanner = (idx: number) => {
    setSettings({ ...settings, popup_banners: banners.filter((_, i) => i !== idx) });
    if (editIdx === idx) setEditIdx(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Popup / Banner kezelő</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <X className="h-4 w-4 text-accent" /> Exit-intent popup
          </div>
          <Switch checked={settings.popup_exit_intent_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, popup_exit_intent_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Ajánlat megjelenítése, ha a felhasználó el akarja hagyni az oldalt.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Bannerek & Popupok ({banners.length})</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addBanner}>
            <Plus className="h-3 w-3 mr-1" /> Új hozzáadása
          </Button>
        </div>

        {banners.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek aktív bannerek vagy popupok.</p>}

        {banners.map((b, i) => (
          <div key={b.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{b.title || "Névtelen"}</span>
                <span className="text-[9px] uppercase tracking-widest border px-1.5 py-0.5">{TYPES[b.type]}</span>
                {b.is_active ? (
                  <span className="text-[9px] uppercase tracking-widest text-green-500 border border-green-500/30 px-1.5 py-0.5">Aktív</span>
                ) : (
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground border px-1.5 py-0.5">Inaktív</span>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeBanner(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {editIdx === i && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Cím</Label>
                  <Input value={b.title} onChange={e => updateBanner(i, "title", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Típus</Label>
                  <select value={b.type} onChange={e => updateBanner(i, "type", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Pozíció</Label>
                  <select value={b.position} onChange={e => updateBanner(i, "position", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    {Object.entries(POSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider">Aktív</Label>
                  <Switch checked={b.is_active} onCheckedChange={v => updateBanner(i, "is_active", v)} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-wider">Tartalom</Label>
                  <Textarea value={b.content} onChange={e => updateBanner(i, "content", e.target.value)} className="rounded-none mt-1 text-xs min-h-[60px]" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">CTA szöveg</Label>
                  <Input value={b.cta_text} onChange={e => updateBanner(i, "cta_text", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="pl. Vásárolj most!" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">CTA link</Label>
                  <Input value={b.cta_url} onChange={e => updateBanner(i, "cta_url", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="/shop" />
                </div>
                <div className="flex gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Háttér szín</Label>
                    <Input type="color" value={b.bg_color} onChange={e => updateBanner(i, "bg_color", e.target.value)} className="rounded-none mt-1 h-10 w-16" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Szöveg szín</Label>
                    <Input type="color" value={b.text_color} onChange={e => updateBanner(i, "text_color", e.target.value)} className="rounded-none mt-1 h-10 w-16" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Kezdő dátum</Label>
                  <Input type="date" value={b.start_date} onChange={e => updateBanner(i, "start_date", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Záró dátum</Label>
                  <Input type="date" value={b.end_date} onChange={e => updateBanner(i, "end_date", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                {/* Preview */}
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-wider flex items-center gap-1"><MonitorSmartphone className="h-3 w-3" /> Előnézet</Label>
                  <div className="mt-1 p-3 text-center text-sm" style={{ backgroundColor: b.bg_color, color: b.text_color }}>
                    <strong>{b.title}</strong> — {b.content} {b.cta_text && <span className="underline ml-1">{b.cta_text}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPopupBannerTab;
