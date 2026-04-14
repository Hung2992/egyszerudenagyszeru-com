import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, SmilePlus, Mail, BarChart3 } from "lucide-react";

const AdminSatisfactionAutomationTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_send_survey: true,
    send_after_delivery_days: 3,
    survey_type: "nps_csat",
    reminder_enabled: true,
    reminder_after_days: 5,
    max_reminders: 1,
    incentive_enabled: false,
    incentive_type: "loyalty_points",
    incentive_amount: 50,
    negative_feedback_alert: true,
    negative_threshold: 3,
    auto_escalate_negative: true,
    escalate_to_email: "",
    follow_up_on_negative: true,
    follow_up_delay_hours: 24,
    survey_channel: "email",
    show_in_order_page: true,
    aggregate_report: true,
    report_frequency: "weekly",
    anonymous_option: false,
    satisfaction_goal_percent: 85,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("satisfaction_automation_enabled, satisfaction_automation_settings").limit(1).single();
      if (data) {
        setEnabled(data.satisfaction_automation_enabled ?? false);
        if (data.satisfaction_automation_settings && typeof data.satisfaction_automation_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.satisfaction_automation_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      satisfaction_automation_enabled: enabled,
      satisfaction_automation_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Elégedettségi automatizálás beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><SmilePlus className="w-5 h-5 text-accent" /> Elégedettségi automatizálás</h2>
          <p className="text-sm text-muted-foreground">Automatikus elégedettségi felmérések, visszajelzés kezelés</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Felmérés küldés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_send_survey} onCheckedChange={(v) => setSettings({ ...settings, auto_send_survey: v })} />
            <Label className="text-sm">Automatikus felmérés küldés</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Küldés kézbesítés után (nap)</Label>
            <Input type="number" min={1} max={30} value={settings.send_after_delivery_days} onChange={(e) => setSettings({ ...settings, send_after_delivery_days: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.reminder_enabled} onCheckedChange={(v) => setSettings({ ...settings, reminder_enabled: v })} />
            <Label className="text-sm">Emlékeztető küldés</Label>
          </div>
          {settings.reminder_enabled && (
            <div>
              <Label className="text-xs text-muted-foreground">Emlékeztető után (nap)</Label>
              <Input type="number" min={1} max={14} value={settings.reminder_after_days} onChange={(e) => setSettings({ ...settings, reminder_after_days: Number(e.target.value) })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.incentive_enabled} onCheckedChange={(v) => setSettings({ ...settings, incentive_enabled: v })} />
            <Label className="text-sm">Ösztönző kitöltésért</Label>
          </div>
          {settings.incentive_enabled && (
            <div>
              <Label className="text-xs text-muted-foreground">Hűségpont jutalom</Label>
              <Input type="number" min={0} max={1000} value={settings.incentive_amount} onChange={(e) => setSettings({ ...settings, incentive_amount: Number(e.target.value) })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.anonymous_option} onCheckedChange={(v) => setSettings({ ...settings, anonymous_option: v })} />
            <Label className="text-sm">Anonim kitöltés engedélyezése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_in_order_page} onCheckedChange={(v) => setSettings({ ...settings, show_in_order_page: v })} />
            <Label className="text-sm">Megjelenítés rendelés oldalon</Label>
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Negatív visszajelzés & riportok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.negative_feedback_alert} onCheckedChange={(v) => setSettings({ ...settings, negative_feedback_alert: v })} />
            <Label className="text-sm">Negatív értékelés riasztás</Label>
          </div>
          {settings.negative_feedback_alert && (
            <div>
              <Label className="text-xs text-muted-foreground">Negatív küszöb (1-5)</Label>
              <Input type="number" min={1} max={5} value={settings.negative_threshold} onChange={(e) => setSettings({ ...settings, negative_threshold: Number(e.target.value) })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_escalate_negative} onCheckedChange={(v) => setSettings({ ...settings, auto_escalate_negative: v })} />
            <Label className="text-sm">Automatikus eszkaláció</Label>
          </div>
          {settings.auto_escalate_negative && (
            <div>
              <Label className="text-xs text-muted-foreground">Eszkaláció e-mail cím</Label>
              <Input type="email" value={settings.escalate_to_email} onChange={(e) => setSettings({ ...settings, escalate_to_email: e.target.value })} placeholder="admin@pelda.hu" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.follow_up_on_negative} onCheckedChange={(v) => setSettings({ ...settings, follow_up_on_negative: v })} />
            <Label className="text-sm">Follow-up negatív válaszra</Label>
          </div>
          {settings.follow_up_on_negative && (
            <div>
              <Label className="text-xs text-muted-foreground">Follow-up késleltetés (óra)</Label>
              <Input type="number" min={1} max={168} value={settings.follow_up_delay_hours} onChange={(e) => setSettings({ ...settings, follow_up_delay_hours: Number(e.target.value) })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.aggregate_report} onCheckedChange={(v) => setSettings({ ...settings, aggregate_report: v })} />
            <Label className="text-sm">Összesítő riport</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Elégedettségi cél (%)</Label>
            <Input type="number" min={0} max={100} value={settings.satisfaction_goal_percent} onChange={(e) => setSettings({ ...settings, satisfaction_goal_percent: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminSatisfactionAutomationTab;
