import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Tag, Plus, Trash2, Palette } from "lucide-react";

interface Badge {
  name: string;
  type: string;
  color: string;
  text_color: string;
  auto_apply: boolean;
  condition: string;
  condition_value: string;
  enabled: boolean;
}

const AdminProductBadgesTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    badges: [
      { name: "ÚJ", type: "new", color: "#3B82F6", text_color: "#FFFFFF", auto_apply: true, condition: "created_within_days", condition_value: "14", enabled: true },
      { name: "BESTSELLER", type: "bestseller", color: "#F59E0B", text_color: "#000000", auto_apply: true, condition: "sold_count_above", condition_value: "50", enabled: true },
      { name: "AKCIÓ", type: "sale", color: "#EF4444", text_color: "#FFFFFF", auto_apply: true, condition: "has_discount", condition_value: "", enabled: true },
      { name: "LIMITÁLT", type: "limited", color: "#8B5CF6", text_color: "#FFFFFF", auto_apply: false, condition: "manual", condition_value: "", enabled: true },
      { name: "UTOLSÓ DARABOK", type: "low_stock", color: "#F97316", text_color: "#FFFFFF", auto_apply: true, condition: "stock_below", condition_value: "5", enabled: false },
    ] as Badge[],
    show_on_listing: true,
    show_on_product_page: true,
    max_badges_per_product: 2,
    badge_position: "top-left",
    badge_style: "rounded",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("product_badges_enabled, product_badges_settings").limit(1).single();
      if (data) {
        setEnabled(data.product_badges_enabled ?? false);
        if (data.product_badges_settings && typeof data.product_badges_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.product_badges_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      product_badges_enabled: enabled,
      product_badges_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Termék badge beállítások mentve!" });
    setSaving(false);
  };

  const addBadge = () => {
    setSettings({ ...settings, badges: [...settings.badges, { name: "", type: "custom", color: "#6B7280", text_color: "#FFFFFF", auto_apply: false, condition: "manual", condition_value: "", enabled: false }] });
  };

  const removeBadge = (idx: number) => {
    setSettings({ ...settings, badges: settings.badges.filter((_, i) => i !== idx) });
  };

  const updateBadge = (idx: number, field: keyof Badge, value: any) => {
    const updated = [...settings.badges];
    (updated[idx] as any)[field] = value;
    setSettings({ ...settings, badges: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Tag className="w-5 h-5 text-accent" /> Termék címkék & badge-ek</h2>
          <p className="text-sm text-muted-foreground">Automatikus és manuális termék jelölések</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="border border-border rounded p-4 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Palette className="w-4 h-4" /> Megjelenítés</h3>
        <div className="flex items-center gap-2">
          <Switch checked={settings.show_on_listing} onCheckedChange={(v) => setSettings({ ...settings, show_on_listing: v })} />
          <Label className="text-sm">Listázáson megjelenítés</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={settings.show_on_product_page} onCheckedChange={(v) => setSettings({ ...settings, show_on_product_page: v })} />
          <Label className="text-sm">Terméklapon megjelenítés</Label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Max badge / termék</Label>
            <Input type="number" min={1} max={5} value={settings.max_badges_per_product} onChange={(e) => setSettings({ ...settings, max_badges_per_product: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pozíció</Label>
            <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={settings.badge_position} onChange={(e) => setSettings({ ...settings, badge_position: e.target.value })}>
              <option value="top-left">Bal felső</option>
              <option value="top-right">Jobb felső</option>
              <option value="bottom-left">Bal alsó</option>
              <option value="bottom-right">Jobb alsó</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Stílus</Label>
            <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={settings.badge_style} onChange={(e) => setSettings({ ...settings, badge_style: e.target.value })}>
              <option value="rounded">Lekerekített</option>
              <option value="square">Szögletes</option>
              <option value="pill">Kapszula</option>
              <option value="ribbon">Szalag</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Tag className="w-4 h-4" /> Badge-ek</h3>
          <Button size="sm" variant="outline" onClick={addBadge} className="gap-1"><Plus className="w-3 h-3" /> Új</Button>
        </div>
        {settings.badges.map((b, idx) => (
          <div key={idx} className="border border-border rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input type="color" value={b.color} onChange={(e) => updateBadge(idx, "color", e.target.value)} className="w-8 h-8 border-0 p-0 cursor-pointer" />
              <Input placeholder="Név" value={b.name} onChange={(e) => updateBadge(idx, "name", e.target.value)} className="text-sm flex-1" />
              <Switch checked={b.enabled} onCheckedChange={(v) => updateBadge(idx, "enabled", v)} />
              <Button size="sm" variant="ghost" onClick={() => removeBadge(idx)}><Trash2 className="w-3 h-3" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Feltétel</Label>
                <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={b.condition} onChange={(e) => updateBadge(idx, "condition", e.target.value)}>
                  <option value="manual">Manuális</option>
                  <option value="created_within_days">Új (napok)</option>
                  <option value="sold_count_above">Eladás felett</option>
                  <option value="has_discount">Van kedvezmény</option>
                  <option value="stock_below">Készlet alatt</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Érték</Label>
                <Input value={b.condition_value} onChange={(e) => updateBadge(idx, "condition_value", e.target.value)} className="text-sm" placeholder="-" />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={b.auto_apply} onCheckedChange={(v) => updateBadge(idx, "auto_apply", v)} />
                <Label className="text-xs">Auto</Label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminProductBadgesTab;
