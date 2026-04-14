import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Trophy, BarChart3, Gift } from "lucide-react";

const AdminLoyaltyDashboardTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    show_points_summary: true,
    show_redemption_stats: true,
    show_tier_distribution: true,
    show_top_earners: true,
    top_earners_count: 10,
    show_expiring_points: true,
    expiring_points_days: 30,
    show_conversion_rate: true,
    show_engagement_metrics: true,
    show_revenue_impact: true,
    auto_refresh_interval_min: 5,
    export_enabled: true,
    compare_periods: true,
    compare_period_days: 30,
    show_campaign_performance: true,
    show_referral_stats: true,
    show_birthday_rewards: true,
    alert_low_engagement: true,
    low_engagement_threshold: 20,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("loyalty_dashboard_enabled, loyalty_dashboard_settings").limit(1).single();
      if (data) {
        setEnabled(data.loyalty_dashboard_enabled ?? false);
        if (data.loyalty_dashboard_settings && typeof data.loyalty_dashboard_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.loyalty_dashboard_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      loyalty_dashboard_enabled: enabled,
      loyalty_dashboard_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Hűségprogram dashboard beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-accent" /> Hűségprogram dashboard</h2>
          <p className="text-sm text-muted-foreground">Pontgyűjtés elemzés, jutalom beváltás statisztikák, engagement mérés</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Megjelenítés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_points_summary} onCheckedChange={(v) => setSettings({ ...settings, show_points_summary: v })} />
            <Label className="text-sm">Pont összesítő</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_redemption_stats} onCheckedChange={(v) => setSettings({ ...settings, show_redemption_stats: v })} />
            <Label className="text-sm">Beváltás statisztikák</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_tier_distribution} onCheckedChange={(v) => setSettings({ ...settings, show_tier_distribution: v })} />
            <Label className="text-sm">Szint eloszlás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_top_earners} onCheckedChange={(v) => setSettings({ ...settings, show_top_earners: v })} />
            <Label className="text-sm">Top gyűjtők</Label>
          </div>
          {settings.show_top_earners && (
            <div><Label className="text-xs text-muted-foreground">Top gyűjtők száma</Label>
              <Input type="number" min={5} max={50} value={settings.top_earners_count} onChange={(e) => setSettings({ ...settings, top_earners_count: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_expiring_points} onCheckedChange={(v) => setSettings({ ...settings, show_expiring_points: v })} />
            <Label className="text-sm">Lejáró pontok</Label>
          </div>
          {settings.show_expiring_points && (
            <div><Label className="text-xs text-muted-foreground">Lejárat figyelmeztetés (nap)</Label>
              <Input type="number" min={7} max={90} value={settings.expiring_points_days} onChange={(e) => setSettings({ ...settings, expiring_points_days: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_conversion_rate} onCheckedChange={(v) => setSettings({ ...settings, show_conversion_rate: v })} />
            <Label className="text-sm">Konverziós ráta</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_revenue_impact} onCheckedChange={(v) => setSettings({ ...settings, show_revenue_impact: v })} />
            <Label className="text-sm">Bevétel hatás</Label>
          </div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Gift className="w-4 h-4" /> Elemzés & riportok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_engagement_metrics} onCheckedChange={(v) => setSettings({ ...settings, show_engagement_metrics: v })} />
            <Label className="text-sm">Engagement metrikák</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_campaign_performance} onCheckedChange={(v) => setSettings({ ...settings, show_campaign_performance: v })} />
            <Label className="text-sm">Kampány teljesítmény</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_referral_stats} onCheckedChange={(v) => setSettings({ ...settings, show_referral_stats: v })} />
            <Label className="text-sm">Ajánlási statisztikák</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_birthday_rewards} onCheckedChange={(v) => setSettings({ ...settings, show_birthday_rewards: v })} />
            <Label className="text-sm">Születésnapi jutalmak</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.compare_periods} onCheckedChange={(v) => setSettings({ ...settings, compare_periods: v })} />
            <Label className="text-sm">Időszak összehasonlítás</Label>
          </div>
          {settings.compare_periods && (
            <div><Label className="text-xs text-muted-foreground">Összehasonlítás periódus (nap)</Label>
              <Input type="number" min={7} max={365} value={settings.compare_period_days} onChange={(e) => setSettings({ ...settings, compare_period_days: Number(e.target.value) })} /></div>
          )}
          <div><Label className="text-xs text-muted-foreground">Auto frissítés (perc)</Label>
            <Input type="number" min={1} max={60} value={settings.auto_refresh_interval_min} onChange={(e) => setSettings({ ...settings, auto_refresh_interval_min: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.alert_low_engagement} onCheckedChange={(v) => setSettings({ ...settings, alert_low_engagement: v })} />
            <Label className="text-sm">Alacsony engagement riasztás</Label>
          </div>
          {settings.alert_low_engagement && (
            <div><Label className="text-xs text-muted-foreground">Engagement küszöb (%)</Label>
              <Input type="number" min={5} max={50} value={settings.low_engagement_threshold} onChange={(e) => setSettings({ ...settings, low_engagement_threshold: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.export_enabled} onCheckedChange={(v) => setSettings({ ...settings, export_enabled: v })} />
            <Label className="text-sm">Export engedélyezés</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminLoyaltyDashboardTab;
