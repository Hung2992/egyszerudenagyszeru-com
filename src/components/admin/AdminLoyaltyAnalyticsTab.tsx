import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, BarChart3, TrendingUp } from "lucide-react";

const AdminLoyaltyAnalyticsTab = () => {
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
      loyalty_analytics_settings: settings.loyalty_analytics_settings,
      loyalty_analytics_enabled: settings.loyalty_analytics_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Hűség analytics beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const la = settings.loyalty_analytics_settings && typeof settings.loyalty_analytics_settings === "object" ? settings.loyalty_analytics_settings : {};

  const updateLa = (field: string, value: any) => {
    setSettings({ ...settings, loyalty_analytics_settings: { ...la, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Vásárlói hűség analytics</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <BarChart3 className="h-4 w-4 text-accent" /> Hűség analytics
          </div>
          <Switch checked={settings.loyalty_analytics_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, loyalty_analytics_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Kohort elemzés, CLV előrejelzés, churn predikció és retention mérőszámok.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Kohort elemzés</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Kohort elemzés engedélyezése</Label><Switch checked={la.cohort_enabled ?? true} onCheckedChange={v => updateLa("cohort_enabled", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Kohort periódus (nap)</Label><Input type="number" value={la.cohort_period_days ?? 30} onChange={e => updateLa("cohort_period_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">CLV (Customer Lifetime Value)</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">CLV előrejelzés</Label><Switch checked={la.clv_prediction_enabled ?? true} onCheckedChange={v => updateLa("clv_prediction_enabled", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Előrejelzési horizont (hónap)</Label><Input type="number" value={la.clv_horizon_months ?? 12} onChange={e => updateLa("clv_horizon_months", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Számítási modell</Label>
            <select value={la.clv_model ?? "rfm"} onChange={e => updateLa("clv_model", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
              <option value="rfm">RFM alapú</option>
              <option value="pareto_nbd">Pareto/NBD</option>
              <option value="simple_avg">Egyszerű átlag</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Churn predikció</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Churn predikció</Label><Switch checked={la.churn_prediction_enabled ?? true} onCheckedChange={v => updateLa("churn_prediction_enabled", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Inaktivitási küszöb (nap)</Label><Input type="number" value={la.churn_threshold_days ?? 90} onChange={e => updateLa("churn_threshold_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Automatikus win-back e-mail</Label><Switch checked={la.auto_winback_email ?? false} onCheckedChange={v => updateLa("auto_winback_email", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Win-back kedvezmény (%)</Label><Input type="number" value={la.winback_discount_percent ?? 10} onChange={e => updateLa("winback_discount_percent", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Retention mérőszámok</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Retention dashboard</Label><Switch checked={la.retention_dashboard ?? true} onCheckedChange={v => updateLa("retention_dashboard", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Heti riport e-mail</Label><Switch checked={la.weekly_report ?? false} onCheckedChange={v => updateLa("weekly_report", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Riport e-mail cím</Label><Input value={la.report_email ?? ""} onChange={e => updateLa("report_email", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="admin@webshop.hu" /></div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoyaltyAnalyticsTab;
