import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Bell, RefreshCw, Package, Mail } from "lucide-react";

const AdminStockAlertAutoTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    low_stock_threshold: 5,
    critical_stock_threshold: 2,
    out_of_stock_alert: true,
    notify_admin_email: true,
    notify_admin_push: false,
    notify_customer_restock: true,
    auto_reorder_enabled: false,
    auto_reorder_threshold: 3,
    auto_reorder_quantity: 10,
    preferred_supplier_auto: true,
    reorder_lead_time_days: 7,
    daily_stock_report: true,
    weekly_stock_report: true,
    alert_frequency: "instant",
    hide_out_of_stock: false,
    show_stock_count: false,
    show_low_stock_badge: true,
    low_stock_badge_text: "Csak néhány darab!",
    back_in_stock_notification: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("stock_alert_auto_enabled, stock_alert_auto_settings").limit(1).single();
      if (data) {
        setEnabled(data.stock_alert_auto_enabled ?? false);
        if (data.stock_alert_auto_settings && typeof data.stock_alert_auto_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.stock_alert_auto_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      stock_alert_auto_enabled: enabled,
      stock_alert_auto_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Készlet riasztás beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Bell className="w-5 h-5 text-accent" /> Készlet riasztás & auto-rendelés</h2>
          <p className="text-sm text-muted-foreground">Készletszint figyelés, riasztások és automatikus újrarendelés</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Készletszintek</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Alacsony készlet küszöb (db)</Label>
            <Input type="number" min={1} value={settings.low_stock_threshold} onChange={(e) => setSettings({ ...settings, low_stock_threshold: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Kritikus készlet küszöb (db)</Label>
            <Input type="number" min={0} value={settings.critical_stock_threshold} onChange={(e) => setSettings({ ...settings, critical_stock_threshold: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.out_of_stock_alert} onCheckedChange={(v) => setSettings({ ...settings, out_of_stock_alert: v })} />
            <Label className="text-sm">Elfogyott termék riasztás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.hide_out_of_stock} onCheckedChange={(v) => setSettings({ ...settings, hide_out_of_stock: v })} />
            <Label className="text-sm">Elfogyott termékek elrejtése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_low_stock_badge} onCheckedChange={(v) => setSettings({ ...settings, show_low_stock_badge: v })} />
            <Label className="text-sm">Alacsony készlet jelvény</Label>
          </div>
          {settings.show_low_stock_badge && (
            <div>
              <Label className="text-xs text-muted-foreground">Jelvény szöveg</Label>
              <Input value={settings.low_stock_badge_text} onChange={(e) => setSettings({ ...settings, low_stock_badge_text: e.target.value })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_stock_count} onCheckedChange={(v) => setSettings({ ...settings, show_stock_count: v })} />
            <Label className="text-sm">Készletszám mutatása vásárlóknak</Label>
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Értesítések</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_admin_email} onCheckedChange={(v) => setSettings({ ...settings, notify_admin_email: v })} />
            <Label className="text-sm">Admin e-mail értesítés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_admin_push} onCheckedChange={(v) => setSettings({ ...settings, notify_admin_push: v })} />
            <Label className="text-sm">Admin push értesítés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_customer_restock} onCheckedChange={(v) => setSettings({ ...settings, notify_customer_restock: v })} />
            <Label className="text-sm">Vásárló értesítés feltöltéskor</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.back_in_stock_notification} onCheckedChange={(v) => setSettings({ ...settings, back_in_stock_notification: v })} />
            <Label className="text-sm">"Újra kapható" értesítés</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Riasztás gyakoriság</Label>
            <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={settings.alert_frequency} onChange={(e) => setSettings({ ...settings, alert_frequency: e.target.value })}>
              <option value="instant">Azonnal</option>
              <option value="hourly">Óránként</option>
              <option value="daily">Naponta</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.daily_stock_report} onCheckedChange={(v) => setSettings({ ...settings, daily_stock_report: v })} />
            <Label className="text-sm">Napi készletjelentés</Label>
          </div>

          <h3 className="font-semibold text-foreground flex items-center gap-2 mt-4"><RefreshCw className="w-4 h-4" /> Auto-rendelés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_reorder_enabled} onCheckedChange={(v) => setSettings({ ...settings, auto_reorder_enabled: v })} />
            <Label className="text-sm">Automatikus újrarendelés</Label>
          </div>
          {settings.auto_reorder_enabled && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Rendelés küszöb (db)</Label>
                <Input type="number" min={1} value={settings.auto_reorder_threshold} onChange={(e) => setSettings({ ...settings, auto_reorder_threshold: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Rendelendő mennyiség (db)</Label>
                <Input type="number" min={1} value={settings.auto_reorder_quantity} onChange={(e) => setSettings({ ...settings, auto_reorder_quantity: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Átfutási idő (nap)</Label>
                <Input type="number" min={1} value={settings.reorder_lead_time_days} onChange={(e) => setSettings({ ...settings, reorder_lead_time_days: Number(e.target.value) })} />
              </div>
            </>
          )}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminStockAlertAutoTab;
