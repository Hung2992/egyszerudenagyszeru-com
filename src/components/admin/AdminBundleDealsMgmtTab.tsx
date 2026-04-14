import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Gift, Layers, DollarSign } from "lucide-react";

const AdminBundleDealsMgmtTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_bundle_suggestions: true,
    min_bundle_items: 2,
    max_bundle_items: 5,
    bundle_discount_type: "percent",
    default_bundle_discount: 15,
    cross_category_bundles: true,
    display_savings: true,
    bundle_stock_check: true,
    limited_time_bundles: false,
    bundle_priority_display: true,
    allow_custom_bundles: false,
    min_bundle_value: 5000,
    max_bundle_discount_percent: 30,
    bundle_analytics: true,
    notify_low_stock_bundle: true,
    auto_deactivate_out_of_stock: true,
    show_individual_prices: true,
    bundle_badge_text: "Csomag akció",
    seasonal_bundles: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("bundle_deals_mgmt_enabled, bundle_deals_mgmt_settings").limit(1).single();
      if (data) {
        setEnabled(data.bundle_deals_mgmt_enabled ?? false);
        if (data.bundle_deals_mgmt_settings && typeof data.bundle_deals_mgmt_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.bundle_deals_mgmt_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      bundle_deals_mgmt_enabled: enabled,
      bundle_deals_mgmt_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Csomag akció beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Gift className="w-5 h-5 text-accent" /> Csomag akció kezelő</h2>
          <p className="text-sm text-muted-foreground">Bundle kedvezmények, cross-sell csomagok, csomag akció szabályok</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Layers className="w-4 h-4" /> Csomag szabályok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_bundle_suggestions} onCheckedChange={(v) => setSettings({ ...settings, auto_bundle_suggestions: v })} />
            <Label className="text-sm">Auto csomag javaslatok</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Min termékek / csomag</Label>
            <Input type="number" min={2} max={10} value={settings.min_bundle_items} onChange={(e) => setSettings({ ...settings, min_bundle_items: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Max termékek / csomag</Label>
            <Input type="number" min={2} max={20} value={settings.max_bundle_items} onChange={(e) => setSettings({ ...settings, max_bundle_items: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Alap kedvezmény (%)</Label>
            <Input type="number" min={1} max={50} value={settings.default_bundle_discount} onChange={(e) => setSettings({ ...settings, default_bundle_discount: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Max kedvezmény (%)</Label>
            <Input type="number" min={5} max={80} value={settings.max_bundle_discount_percent} onChange={(e) => setSettings({ ...settings, max_bundle_discount_percent: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.cross_category_bundles} onCheckedChange={(v) => setSettings({ ...settings, cross_category_bundles: v })} />
            <Label className="text-sm">Kategóriák közötti csomagok</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.allow_custom_bundles} onCheckedChange={(v) => setSettings({ ...settings, allow_custom_bundles: v })} />
            <Label className="text-sm">Egyedi csomag összeállítás</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Min csomag érték (Ft)</Label>
            <Input type="number" min={0} value={settings.min_bundle_value} onChange={(e) => setSettings({ ...settings, min_bundle_value: Number(e.target.value) })} /></div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" /> Megjelenítés & kezelés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.display_savings} onCheckedChange={(v) => setSettings({ ...settings, display_savings: v })} />
            <Label className="text-sm">Megtakarítás megjelenítés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_individual_prices} onCheckedChange={(v) => setSettings({ ...settings, show_individual_prices: v })} />
            <Label className="text-sm">Egyedi árak mutatása</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.bundle_priority_display} onCheckedChange={(v) => setSettings({ ...settings, bundle_priority_display: v })} />
            <Label className="text-sm">Prioritásos megjelenítés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.bundle_stock_check} onCheckedChange={(v) => setSettings({ ...settings, bundle_stock_check: v })} />
            <Label className="text-sm">Készlet ellenőrzés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_deactivate_out_of_stock} onCheckedChange={(v) => setSettings({ ...settings, auto_deactivate_out_of_stock: v })} />
            <Label className="text-sm">Auto deaktiválás (nincs készlet)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_low_stock_bundle} onCheckedChange={(v) => setSettings({ ...settings, notify_low_stock_bundle: v })} />
            <Label className="text-sm">Alacsony készlet értesítés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.limited_time_bundles} onCheckedChange={(v) => setSettings({ ...settings, limited_time_bundles: v })} />
            <Label className="text-sm">Időkorlátos csomagok</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.bundle_analytics} onCheckedChange={(v) => setSettings({ ...settings, bundle_analytics: v })} />
            <Label className="text-sm">Csomag analitika</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminBundleDealsMgmtTab;
