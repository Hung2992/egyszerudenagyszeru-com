import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, SlidersHorizontal, Eye, ListChecks } from "lucide-react";

const AdminProductCompareTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    max_compare_items: 4,
    show_on_product_card: true,
    show_on_product_page: true,
    sticky_compare_bar: true,
    compare_attributes: [
      { name: "Ár", key: "price", enabled: true },
      { name: "Méret", key: "size", enabled: true },
      { name: "Anyag", key: "material", enabled: true },
      { name: "Szín", key: "color", enabled: true },
      { name: "Értékelés", key: "rating", enabled: true },
      { name: "Elérhetőség", key: "stock", enabled: true },
    ],
    highlight_differences: true,
    allow_add_to_cart_from_compare: true,
    save_comparison: false,
    share_comparison: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("product_compare_enabled, product_compare_settings").limit(1).single();
      if (data) {
        setEnabled(data.product_compare_enabled ?? false);
        if (data.product_compare_settings && typeof data.product_compare_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.product_compare_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      product_compare_enabled: enabled,
      product_compare_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Termék összehasonlító beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-accent" /> Termék összehasonlító</h2>
          <p className="text-sm text-muted-foreground">Összehasonlítási funkció beállításai</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Eye className="w-4 h-4" /> Megjelenítés</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Max összehasonlítható termék</Label>
            <Input type="number" min={2} max={8} value={settings.max_compare_items} onChange={(e) => setSettings({ ...settings, max_compare_items: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_on_product_card} onCheckedChange={(v) => setSettings({ ...settings, show_on_product_card: v })} />
            <Label className="text-sm">Gomb a termékkártyán</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_on_product_page} onCheckedChange={(v) => setSettings({ ...settings, show_on_product_page: v })} />
            <Label className="text-sm">Gomb a terméklapon</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.sticky_compare_bar} onCheckedChange={(v) => setSettings({ ...settings, sticky_compare_bar: v })} />
            <Label className="text-sm">Ragadós összehasonlító sáv</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.highlight_differences} onCheckedChange={(v) => setSettings({ ...settings, highlight_differences: v })} />
            <Label className="text-sm">Eltérések kiemelése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.allow_add_to_cart_from_compare} onCheckedChange={(v) => setSettings({ ...settings, allow_add_to_cart_from_compare: v })} />
            <Label className="text-sm">Kosárba rakás az összehasonlítóból</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.share_comparison} onCheckedChange={(v) => setSettings({ ...settings, share_comparison: v })} />
            <Label className="text-sm">Összehasonlítás megosztása</Label>
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ListChecks className="w-4 h-4" /> Összehasonlítandó tulajdonságok</h3>
          {settings.compare_attributes.map((attr, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Switch checked={attr.enabled} onCheckedChange={(v) => {
                const updated = [...settings.compare_attributes];
                updated[idx] = { ...updated[idx], enabled: v };
                setSettings({ ...settings, compare_attributes: updated });
              }} />
              <span className="text-sm text-foreground">{attr.name}</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminProductCompareTab;
