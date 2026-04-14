import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, TrendingUp, TrendingDown, Zap } from "lucide-react";

const AdminLoyaltyAutomationTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_promote: true,
    auto_demote: true,
    promote_check_interval: "daily",
    demote_check_interval: "monthly",
    promote_notify: true,
    demote_notify: true,
    demote_warning_days: 14,
    grace_period_days: 30,
    promote_immediately: true,
    demote_at_period_end: true,
    silver_threshold: 200,
    gold_threshold: 500,
    vip_threshold: 1000,
    silver_min_orders: 3,
    gold_min_orders: 8,
    vip_min_orders: 15,
    evaluation_period_months: 12,
    demote_inactivity_months: 6,
    demote_below_threshold: true,
    keep_earned_rewards: false,
    birthday_auto_bonus: true,
    anniversary_auto_bonus: true,
    milestone_rewards: true,
    milestone_orders: [5, 10, 25, 50, 100],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("loyalty_automation_enabled, loyalty_automation_settings").limit(1).single();
      if (data) {
        setEnabled(data.loyalty_automation_enabled ?? false);
        if (data.loyalty_automation_settings && typeof data.loyalty_automation_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.loyalty_automation_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      loyalty_automation_enabled: enabled,
      loyalty_automation_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Hűségszint automatizálás mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Zap className="w-5 h-5 text-accent" /> Hűségszint automatizálás</h2>
          <p className="text-sm text-muted-foreground">Automatikus előléptetés, visszaesés szabályok, mérföldkő jutalmak</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Előléptetés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_promote} onCheckedChange={(v) => setSettings({ ...settings, auto_promote: v })} />
            <Label className="text-sm">Automatikus előléptetés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.promote_immediately} onCheckedChange={(v) => setSettings({ ...settings, promote_immediately: v })} />
            <Label className="text-sm">Azonnali előléptetés</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ellenőrzés gyakorisága</Label>
            <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={settings.promote_check_interval} onChange={(e) => setSettings({ ...settings, promote_check_interval: e.target.value })}>
              <option value="realtime">Valós idejű</option>
              <option value="daily">Naponta</option>
              <option value="weekly">Hetente</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Silver küszöb (pont)</Label>
            <Input type="number" min={0} value={settings.silver_threshold} onChange={(e) => setSettings({ ...settings, silver_threshold: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Gold küszöb (pont)</Label>
            <Input type="number" min={0} value={settings.gold_threshold} onChange={(e) => setSettings({ ...settings, gold_threshold: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">VIP küszöb (pont)</Label>
            <Input type="number" min={0} value={settings.vip_threshold} onChange={(e) => setSettings({ ...settings, vip_threshold: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Min rendelés Silver-hez</Label>
            <Input type="number" min={0} value={settings.silver_min_orders} onChange={(e) => setSettings({ ...settings, silver_min_orders: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Min rendelés Gold-hoz</Label>
            <Input type="number" min={0} value={settings.gold_min_orders} onChange={(e) => setSettings({ ...settings, gold_min_orders: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.promote_notify} onCheckedChange={(v) => setSettings({ ...settings, promote_notify: v })} />
            <Label className="text-sm">Értesítés előléptetéskor</Label>
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Visszaesés & mérföldkövek</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_demote} onCheckedChange={(v) => setSettings({ ...settings, auto_demote: v })} />
            <Label className="text-sm">Automatikus visszaesés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.demote_at_period_end} onCheckedChange={(v) => setSettings({ ...settings, demote_at_period_end: v })} />
            <Label className="text-sm">Visszaesés időszak végén</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Értékelési időszak (hónap)</Label>
            <Input type="number" min={1} max={24} value={settings.evaluation_period_months} onChange={(e) => setSettings({ ...settings, evaluation_period_months: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Inaktivitási küszöb (hónap)</Label>
            <Input type="number" min={1} max={24} value={settings.demote_inactivity_months} onChange={(e) => setSettings({ ...settings, demote_inactivity_months: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Figyelmeztetés (nap előtte)</Label>
            <Input type="number" min={0} max={60} value={settings.demote_warning_days} onChange={(e) => setSettings({ ...settings, demote_warning_days: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Türelmi idő (nap)</Label>
            <Input type="number" min={0} max={90} value={settings.grace_period_days} onChange={(e) => setSettings({ ...settings, grace_period_days: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.keep_earned_rewards} onCheckedChange={(v) => setSettings({ ...settings, keep_earned_rewards: v })} />
            <Label className="text-sm">Megszerzett jutalmak megtartása</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.demote_notify} onCheckedChange={(v) => setSettings({ ...settings, demote_notify: v })} />
            <Label className="text-sm">Értesítés visszaeséskor</Label>
          </div>
          <hr className="border-border" />
          <div className="flex items-center gap-2">
            <Switch checked={settings.milestone_rewards} onCheckedChange={(v) => setSettings({ ...settings, milestone_rewards: v })} />
            <Label className="text-sm">Mérföldkő jutalmak</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.birthday_auto_bonus} onCheckedChange={(v) => setSettings({ ...settings, birthday_auto_bonus: v })} />
            <Label className="text-sm">Születésnapi auto bónusz</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.anniversary_auto_bonus} onCheckedChange={(v) => setSettings({ ...settings, anniversary_auto_bonus: v })} />
            <Label className="text-sm">Évforduló auto bónusz</Label>
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminLoyaltyAutomationTab;
