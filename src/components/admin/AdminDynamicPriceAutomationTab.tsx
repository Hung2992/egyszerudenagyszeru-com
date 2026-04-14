import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Zap, TrendingUp, Eye } from "lucide-react";

const AdminDynamicPriceAutomationTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    batch_price_update: true,
    scheduled_price_changes: true,
    competitor_monitoring: false,
    competitor_check_interval_hours: 6,
    auto_match_competitor: false,
    match_strategy: "match",
    max_discount_percent: 20,
    min_margin_percent: 10,
    demand_based_pricing: true,
    demand_increase_threshold: 50,
    demand_price_increase_percent: 5,
    low_demand_decrease_percent: 10,
    time_based_pricing: false,
    peak_hours_markup_percent: 0,
    off_peak_discount_percent: 0,
    bulk_discount_enabled: true,
    bulk_discount_min_qty: 3,
    bulk_discount_percent: 10,
    seasonal_pricing: false,
    clearance_auto: true,
    clearance_days_threshold: 60,
    clearance_discount_percent: 30,
    price_change_log: true,
    notify_on_price_change: true,
    approval_required: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("dynamic_price_automation_enabled, dynamic_price_automation_settings").limit(1).single();
      if (data) {
        setEnabled(data.dynamic_price_automation_enabled ?? false);
        if (data.dynamic_price_automation_settings && typeof data.dynamic_price_automation_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.dynamic_price_automation_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      dynamic_price_automation_enabled: enabled,
      dynamic_price_automation_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Dinamikus ár automatizálás beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Zap className="w-5 h-5 text-accent" /> Dinamikus ár automatizálás</h2>
          <p className="text-sm text-muted-foreground">Kötegelt árazás, időzített árváltozások, versenytárs ár figyelés</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Árazási szabályok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.batch_price_update} onCheckedChange={(v) => setSettings({ ...settings, batch_price_update: v })} />
            <Label className="text-sm">Kötegelt ár frissítés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.scheduled_price_changes} onCheckedChange={(v) => setSettings({ ...settings, scheduled_price_changes: v })} />
            <Label className="text-sm">Időzített árváltozások</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.demand_based_pricing} onCheckedChange={(v) => setSettings({ ...settings, demand_based_pricing: v })} />
            <Label className="text-sm">Kereslet alapú árazás</Label>
          </div>
          {settings.demand_based_pricing && (
            <>
              <div><Label className="text-xs text-muted-foreground">Kereslet növekedés küszöb (%)</Label>
                <Input type="number" min={10} max={200} value={settings.demand_increase_threshold} onChange={(e) => setSettings({ ...settings, demand_increase_threshold: Number(e.target.value) })} /></div>
              <div><Label className="text-xs text-muted-foreground">Ár emelés mértéke (%)</Label>
                <Input type="number" min={1} max={50} value={settings.demand_price_increase_percent} onChange={(e) => setSettings({ ...settings, demand_price_increase_percent: Number(e.target.value) })} /></div>
            </>
          )}
          <div><Label className="text-xs text-muted-foreground">Max kedvezmény (%)</Label>
            <Input type="number" min={0} max={80} value={settings.max_discount_percent} onChange={(e) => setSettings({ ...settings, max_discount_percent: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Min árrés (%)</Label>
            <Input type="number" min={0} max={80} value={settings.min_margin_percent} onChange={(e) => setSettings({ ...settings, min_margin_percent: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.bulk_discount_enabled} onCheckedChange={(v) => setSettings({ ...settings, bulk_discount_enabled: v })} />
            <Label className="text-sm">Mennyiségi kedvezmény</Label>
          </div>
          {settings.bulk_discount_enabled && (
            <>
              <div><Label className="text-xs text-muted-foreground">Min darabszám</Label>
                <Input type="number" min={2} max={100} value={settings.bulk_discount_min_qty} onChange={(e) => setSettings({ ...settings, bulk_discount_min_qty: Number(e.target.value) })} /></div>
              <div><Label className="text-xs text-muted-foreground">Kedvezmény (%)</Label>
                <Input type="number" min={1} max={50} value={settings.bulk_discount_percent} onChange={(e) => setSettings({ ...settings, bulk_discount_percent: Number(e.target.value) })} /></div>
            </>
          )}
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Eye className="w-4 h-4" /> Versenytárs & kiárusítás</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.competitor_monitoring} onCheckedChange={(v) => setSettings({ ...settings, competitor_monitoring: v })} />
            <Label className="text-sm">Versenytárs ár figyelés</Label>
          </div>
          {settings.competitor_monitoring && (
            <>
              <div><Label className="text-xs text-muted-foreground">Ellenőrzés gyakorisága (óra)</Label>
                <Input type="number" min={1} max={48} value={settings.competitor_check_interval_hours} onChange={(e) => setSettings({ ...settings, competitor_check_interval_hours: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={settings.auto_match_competitor} onCheckedChange={(v) => setSettings({ ...settings, auto_match_competitor: v })} />
                <Label className="text-sm">Auto ár egyeztetés</Label>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.clearance_auto} onCheckedChange={(v) => setSettings({ ...settings, clearance_auto: v })} />
            <Label className="text-sm">Auto kiárusítás</Label>
          </div>
          {settings.clearance_auto && (
            <>
              <div><Label className="text-xs text-muted-foreground">Kiárusítás küszöb (nap)</Label>
                <Input type="number" min={14} max={365} value={settings.clearance_days_threshold} onChange={(e) => setSettings({ ...settings, clearance_days_threshold: Number(e.target.value) })} /></div>
              <div><Label className="text-xs text-muted-foreground">Kiárusítás kedvezmény (%)</Label>
                <Input type="number" min={5} max={80} value={settings.clearance_discount_percent} onChange={(e) => setSettings({ ...settings, clearance_discount_percent: Number(e.target.value) })} /></div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.seasonal_pricing} onCheckedChange={(v) => setSettings({ ...settings, seasonal_pricing: v })} />
            <Label className="text-sm">Szezonális árazás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.price_change_log} onCheckedChange={(v) => setSettings({ ...settings, price_change_log: v })} />
            <Label className="text-sm">Árváltozás napló</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_on_price_change} onCheckedChange={(v) => setSettings({ ...settings, notify_on_price_change: v })} />
            <Label className="text-sm">Értesítés árváltozáskor</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.approval_required} onCheckedChange={(v) => setSettings({ ...settings, approval_required: v })} />
            <Label className="text-sm">Jóváhagyás szükséges</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminDynamicPriceAutomationTab;
