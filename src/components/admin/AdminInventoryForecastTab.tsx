import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";

const AdminInventoryForecastTab = () => {
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
      inventory_forecast_enabled: settings.inventory_forecast_enabled,
      inventory_forecast_settings: settings.inventory_forecast_settings,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Készlet előrejelzés beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const fc = settings.inventory_forecast_settings && typeof settings.inventory_forecast_settings === "object" ? settings.inventory_forecast_settings : {};
  const update = (field: string, value: any) => {
    setSettings({ ...settings, inventory_forecast_settings: { ...fc, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Készlet előrejelzés</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-accent" /> Előrejelzés engedélyezése
          </div>
          <Switch checked={settings.inventory_forecast_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, inventory_forecast_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">AI-alapú kereslet-előrejelzés a készletgazdálkodás optimalizálásához.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <BarChart3 className="h-4 w-4 text-accent" /> Előrejelzési paraméterek
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Előrejelzési időszak (nap)</Label>
            <Input type="number" value={fc.forecast_days ?? 30} onChange={e => update("forecast_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Historikus adatok (nap)</Label>
            <Input type="number" value={fc.history_days ?? 90} onChange={e => update("history_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Biztonsági készlet (%)</Label>
            <Input type="number" value={fc.safety_stock_pct ?? 20} onChange={e => update("safety_stock_pct", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Újrarendelési pont (db)</Label>
            <Input type="number" value={fc.reorder_point ?? 10} onChange={e => update("reorder_point", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <AlertTriangle className="h-4 w-4 text-accent" /> Szezonalitás
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider">Szezonális korrekció</Label>
          <Switch checked={fc.seasonal_adjustment ?? false} onCheckedChange={v => update("seasonal_adjustment", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider">Trend figyelés</Label>
          <Switch checked={fc.trend_detection ?? true} onCheckedChange={v => update("trend_detection", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider">Automatikus riasztás</Label>
          <Switch checked={fc.auto_alert ?? true} onCheckedChange={v => update("auto_alert", v)} />
        </div>
      </div>
    </div>
  );
};

export default AdminInventoryForecastTab;
