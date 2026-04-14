import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Layers, Palette, Ruler } from "lucide-react";

const AdminProductVariantsTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    color_variants: true,
    size_variants: true,
    material_variants: false,
    custom_variants: false,
    track_stock_per_variant: true,
    variant_images: true,
    variant_pricing: true,
    auto_generate_sku: true,
    sku_prefix: "",
    max_variant_options: 3,
    max_values_per_option: 20,
    show_out_of_stock_variants: true,
    low_stock_threshold: 5,
    variant_display: "dropdown",
    color_swatch_enabled: true,
    size_chart_link: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("product_variants_enabled, product_variants_settings").limit(1).single();
      if (data) {
        setEnabled(data.product_variants_enabled ?? false);
        if (data.product_variants_settings && typeof data.product_variants_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.product_variants_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      product_variants_enabled: enabled,
      product_variants_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Variáns beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Layers className="w-5 h-5 text-accent" /> Termék variáns kezelés</h2>
          <p className="text-sm text-muted-foreground">Szín, méret és egyéb variánsok kezelése, készlet variánsonként</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Palette className="w-4 h-4" /> Variáns típusok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.color_variants} onCheckedChange={(v) => setSettings({ ...settings, color_variants: v })} />
            <Label className="text-sm">Szín variánsok</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.size_variants} onCheckedChange={(v) => setSettings({ ...settings, size_variants: v })} />
            <Label className="text-sm">Méret variánsok</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.material_variants} onCheckedChange={(v) => setSettings({ ...settings, material_variants: v })} />
            <Label className="text-sm">Anyag variánsok</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.custom_variants} onCheckedChange={(v) => setSettings({ ...settings, custom_variants: v })} />
            <Label className="text-sm">Egyedi variáns típusok</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max variáns opció típus</Label>
            <Input type="number" min={1} max={10} value={settings.max_variant_options} onChange={(e) => setSettings({ ...settings, max_variant_options: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max érték opciónként</Label>
            <Input type="number" min={1} max={100} value={settings.max_values_per_option} onChange={(e) => setSettings({ ...settings, max_values_per_option: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Ruler className="w-4 h-4" /> Készlet & megjelenítés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.track_stock_per_variant} onCheckedChange={(v) => setSettings({ ...settings, track_stock_per_variant: v })} />
            <Label className="text-sm">Készlet követés variánsonként</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.variant_images} onCheckedChange={(v) => setSettings({ ...settings, variant_images: v })} />
            <Label className="text-sm">Variáns képek</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.variant_pricing} onCheckedChange={(v) => setSettings({ ...settings, variant_pricing: v })} />
            <Label className="text-sm">Eltérő ár variánsonként</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_generate_sku} onCheckedChange={(v) => setSettings({ ...settings, auto_generate_sku: v })} />
            <Label className="text-sm">Automatikus SKU generálás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_out_of_stock_variants} onCheckedChange={(v) => setSettings({ ...settings, show_out_of_stock_variants: v })} />
            <Label className="text-sm">Elfogyott variáns megjelenítése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.color_swatch_enabled} onCheckedChange={(v) => setSettings({ ...settings, color_swatch_enabled: v })} />
            <Label className="text-sm">Szín minták (swatch)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.size_chart_link} onCheckedChange={(v) => setSettings({ ...settings, size_chart_link: v })} />
            <Label className="text-sm">Mérettáblázat link</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Megjelenítés módja</Label>
            <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={settings.variant_display} onChange={(e) => setSettings({ ...settings, variant_display: e.target.value })}>
              <option value="dropdown">Legördülő</option>
              <option value="buttons">Gombok</option>
              <option value="swatches">Színminták</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Alacsony készlet küszöb</Label>
            <Input type="number" min={0} max={100} value={settings.low_stock_threshold} onChange={(e) => setSettings({ ...settings, low_stock_threshold: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">SKU előtag</Label>
            <Input value={settings.sku_prefix} onChange={(e) => setSettings({ ...settings, sku_prefix: e.target.value })} placeholder="pl. EDN-" />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminProductVariantsTab;
