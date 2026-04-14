import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, DollarSign, TrendingUp, BarChart3 } from "lucide-react";

const AdminMarginManagementTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    min_margin_percent: 20,
    target_margin_percent: 40,
    max_margin_percent: 80,
    auto_price_adjustment: false,
    round_prices: true,
    rounding_method: "up_99",
    cost_includes_shipping: false,
    cost_includes_tax: false,
    alert_below_min_margin: true,
    alert_threshold_percent: 15,
    competitor_tracking: false,
    competitor_check_interval_hours: 24,
    auto_match_competitor: false,
    match_strategy: "undercut_1_percent",
    category_margins: {} as Record<string, number>,
    show_margin_in_product_list: true,
    show_cost_price: false,
    profit_report_frequency: "weekly",
    currency_conversion_margin: 2,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("margin_management_enabled, margin_management_settings").limit(1).single();
      if (data) {
        setEnabled(data.margin_management_enabled ?? false);
        if (data.margin_management_settings && typeof data.margin_management_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.margin_management_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      margin_management_enabled: enabled,
      margin_management_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Árrés beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><DollarSign className="w-5 h-5 text-accent" /> Árrés menedzsment</h2>
          <p className="text-sm text-muted-foreground">Árrés számítás, árkategorizálás, versenytárs figyelés</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Árrés szabályok</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Minimum árrés (%)</Label>
            <Input type="number" min={0} max={100} value={settings.min_margin_percent} onChange={(e) => setSettings({ ...settings, min_margin_percent: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cél árrés (%)</Label>
            <Input type="number" min={0} max={100} value={settings.target_margin_percent} onChange={(e) => setSettings({ ...settings, target_margin_percent: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Maximum árrés (%)</Label>
            <Input type="number" min={0} max={100} value={settings.max_margin_percent} onChange={(e) => setSettings({ ...settings, max_margin_percent: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_price_adjustment} onCheckedChange={(v) => setSettings({ ...settings, auto_price_adjustment: v })} />
            <Label className="text-sm">Automatikus ár korrekció</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.round_prices} onCheckedChange={(v) => setSettings({ ...settings, round_prices: v })} />
            <Label className="text-sm">Árak kerekítése (x990 Ft)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.cost_includes_shipping} onCheckedChange={(v) => setSettings({ ...settings, cost_includes_shipping: v })} />
            <Label className="text-sm">Beszerzési ár tartalmazza a szállítást</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.cost_includes_tax} onCheckedChange={(v) => setSettings({ ...settings, cost_includes_tax: v })} />
            <Label className="text-sm">Beszerzési ár tartalmazza az ÁFA-t</Label>
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Versenytárs & riportok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.alert_below_min_margin} onCheckedChange={(v) => setSettings({ ...settings, alert_below_min_margin: v })} />
            <Label className="text-sm">Riasztás min. árrés alatt</Label>
          </div>
          {settings.alert_below_min_margin && (
            <div>
              <Label className="text-xs text-muted-foreground">Riasztási küszöb (%)</Label>
              <Input type="number" min={0} max={100} value={settings.alert_threshold_percent} onChange={(e) => setSettings({ ...settings, alert_threshold_percent: Number(e.target.value) })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.competitor_tracking} onCheckedChange={(v) => setSettings({ ...settings, competitor_tracking: v })} />
            <Label className="text-sm">Versenytárs ár figyelés</Label>
          </div>
          {settings.competitor_tracking && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Ellenőrzés gyakorisága (óra)</Label>
                <Input type="number" min={1} max={168} value={settings.competitor_check_interval_hours} onChange={(e) => setSettings({ ...settings, competitor_check_interval_hours: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={settings.auto_match_competitor} onCheckedChange={(v) => setSettings({ ...settings, auto_match_competitor: v })} />
                <Label className="text-sm">Automatikus ár igazítás</Label>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_margin_in_product_list} onCheckedChange={(v) => setSettings({ ...settings, show_margin_in_product_list: v })} />
            <Label className="text-sm">Árrés megjelenítése terméklistán</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_cost_price} onCheckedChange={(v) => setSettings({ ...settings, show_cost_price: v })} />
            <Label className="text-sm">Beszerzési ár megjelenítése</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Deviza konverziós árrés (%)</Label>
            <Input type="number" min={0} max={20} value={settings.currency_conversion_margin} onChange={(e) => setSettings({ ...settings, currency_conversion_margin: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminMarginManagementTab;
