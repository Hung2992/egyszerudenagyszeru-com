import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Megaphone, Mail, ShoppingCart } from "lucide-react";

const AdminRemarketingAutomationTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    abandoned_cart_enabled: true,
    abandoned_cart_delay_hours: 2,
    abandoned_cart_reminder_count: 3,
    abandoned_cart_discount: true,
    abandoned_cart_discount_percent: 10,
    browse_abandonment_enabled: false,
    browse_abandonment_delay_hours: 24,
    returning_customer_campaign: true,
    returning_customer_days_inactive: 30,
    returning_customer_discount_percent: 15,
    win_back_enabled: true,
    win_back_days_inactive: 90,
    win_back_discount_percent: 20,
    post_purchase_upsell: true,
    post_purchase_delay_days: 7,
    birthday_remarketing: true,
    seasonal_campaigns: true,
    email_channel: true,
    push_channel: false,
    sms_channel: false,
    frequency_cap_per_week: 3,
    unsubscribe_auto_stop: true,
    track_conversions: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("remarketing_automation_enabled, remarketing_automation_settings").limit(1).single();
      if (data) {
        setEnabled(data.remarketing_automation_enabled ?? false);
        if (data.remarketing_automation_settings && typeof data.remarketing_automation_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.remarketing_automation_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      remarketing_automation_enabled: enabled,
      remarketing_automation_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Remarketing beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Megaphone className="w-5 h-5 text-accent" /> Remarketing automatizálás</h2>
          <p className="text-sm text-muted-foreground">Elhagyott kosár, visszatérő vásárló és win-back kampányok</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Elhagyott kosár & böngészés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.abandoned_cart_enabled} onCheckedChange={(v) => setSettings({ ...settings, abandoned_cart_enabled: v })} />
            <Label className="text-sm">Elhagyott kosár emlékeztető</Label>
          </div>
          {settings.abandoned_cart_enabled && (
            <>
              <div><Label className="text-xs text-muted-foreground">Késleltetés (óra)</Label>
                <Input type="number" min={1} max={72} value={settings.abandoned_cart_delay_hours} onChange={(e) => setSettings({ ...settings, abandoned_cart_delay_hours: Number(e.target.value) })} /></div>
              <div><Label className="text-xs text-muted-foreground">Emlékeztetők száma</Label>
                <Input type="number" min={1} max={5} value={settings.abandoned_cart_reminder_count} onChange={(e) => setSettings({ ...settings, abandoned_cart_reminder_count: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={settings.abandoned_cart_discount} onCheckedChange={(v) => setSettings({ ...settings, abandoned_cart_discount: v })} />
                <Label className="text-sm">Kedvezmény csatolása</Label>
              </div>
              {settings.abandoned_cart_discount && (
                <div><Label className="text-xs text-muted-foreground">Kedvezmény (%)</Label>
                  <Input type="number" min={0} max={50} value={settings.abandoned_cart_discount_percent} onChange={(e) => setSettings({ ...settings, abandoned_cart_discount_percent: Number(e.target.value) })} /></div>
              )}
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.browse_abandonment_enabled} onCheckedChange={(v) => setSettings({ ...settings, browse_abandonment_enabled: v })} />
            <Label className="text-sm">Böngészés elhagyás követés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.post_purchase_upsell} onCheckedChange={(v) => setSettings({ ...settings, post_purchase_upsell: v })} />
            <Label className="text-sm">Vásárlás utáni upsell</Label>
          </div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Visszatérő & win-back</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.returning_customer_campaign} onCheckedChange={(v) => setSettings({ ...settings, returning_customer_campaign: v })} />
            <Label className="text-sm">Visszatérő vásárló kampány</Label>
          </div>
          {settings.returning_customer_campaign && (
            <>
              <div><Label className="text-xs text-muted-foreground">Inaktivitás (nap)</Label>
                <Input type="number" min={7} max={180} value={settings.returning_customer_days_inactive} onChange={(e) => setSettings({ ...settings, returning_customer_days_inactive: Number(e.target.value) })} /></div>
              <div><Label className="text-xs text-muted-foreground">Kedvezmény (%)</Label>
                <Input type="number" min={0} max={50} value={settings.returning_customer_discount_percent} onChange={(e) => setSettings({ ...settings, returning_customer_discount_percent: Number(e.target.value) })} /></div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.win_back_enabled} onCheckedChange={(v) => setSettings({ ...settings, win_back_enabled: v })} />
            <Label className="text-sm">Win-back kampány</Label>
          </div>
          {settings.win_back_enabled && (
            <>
              <div><Label className="text-xs text-muted-foreground">Inaktivitás (nap)</Label>
                <Input type="number" min={30} max={365} value={settings.win_back_days_inactive} onChange={(e) => setSettings({ ...settings, win_back_days_inactive: Number(e.target.value) })} /></div>
              <div><Label className="text-xs text-muted-foreground">Kedvezmény (%)</Label>
                <Input type="number" min={0} max={50} value={settings.win_back_discount_percent} onChange={(e) => setSettings({ ...settings, win_back_discount_percent: Number(e.target.value) })} /></div>
            </>
          )}
          <div><Label className="text-xs text-muted-foreground">Max üzenet / hét</Label>
            <Input type="number" min={1} max={10} value={settings.frequency_cap_per_week} onChange={(e) => setSettings({ ...settings, frequency_cap_per_week: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.track_conversions} onCheckedChange={(v) => setSettings({ ...settings, track_conversions: v })} />
            <Label className="text-sm">Konverzió követés</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminRemarketingAutomationTab;
