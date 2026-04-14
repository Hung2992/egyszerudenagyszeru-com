import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Database, ClipboardList, RefreshCw } from "lucide-react";

const AdminInventoryMovementLogTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    log_incoming: true,
    log_outgoing: true,
    log_adjustments: true,
    log_transfers: true,
    log_returns: true,
    log_damages: true,
    auto_reconcile: false,
    reconcile_interval_hours: 24,
    alert_on_discrepancy: true,
    discrepancy_threshold_percent: 5,
    retain_logs_days: 365,
    export_format: "csv",
    scheduled_inventory_enabled: false,
    inventory_schedule_day: "monday",
    track_serial_numbers: false,
    track_batch_numbers: false,
    track_expiry_dates: false,
    movement_approval_required: false,
    notify_on_low_stock_movement: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("inventory_movement_log_enabled, inventory_movement_log_settings").limit(1).single();
      if (data) {
        setEnabled(data.inventory_movement_log_enabled ?? false);
        if (data.inventory_movement_log_settings && typeof data.inventory_movement_log_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.inventory_movement_log_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      inventory_movement_log_enabled: enabled,
      inventory_movement_log_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Készletmozgás napló beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Database className="w-5 h-5 text-accent" /> Készletmozgás napló</h2>
          <p className="text-sm text-muted-foreground">Raktárkészlet mozgás nyomonkövetés, selejt kezelés, leltár ütemezés</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Naplózási szabályok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.log_incoming} onCheckedChange={(v) => setSettings({ ...settings, log_incoming: v })} />
            <Label className="text-sm">Bejövő készlet naplózás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.log_outgoing} onCheckedChange={(v) => setSettings({ ...settings, log_outgoing: v })} />
            <Label className="text-sm">Kimenő készlet naplózás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.log_adjustments} onCheckedChange={(v) => setSettings({ ...settings, log_adjustments: v })} />
            <Label className="text-sm">Korrekciók naplózása</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.log_transfers} onCheckedChange={(v) => setSettings({ ...settings, log_transfers: v })} />
            <Label className="text-sm">Raktárközi mozgás naplózás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.log_returns} onCheckedChange={(v) => setSettings({ ...settings, log_returns: v })} />
            <Label className="text-sm">Visszáruk naplózás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.log_damages} onCheckedChange={(v) => setSettings({ ...settings, log_damages: v })} />
            <Label className="text-sm">Selejtezés naplózás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.movement_approval_required} onCheckedChange={(v) => setSettings({ ...settings, movement_approval_required: v })} />
            <Label className="text-sm">Jóváhagyás szükséges</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Napló megőrzés (nap)</Label>
            <Input type="number" min={30} max={3650} value={settings.retain_logs_days} onChange={(e) => setSettings({ ...settings, retain_logs_days: Number(e.target.value) })} /></div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Leltár & egyeztetés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_reconcile} onCheckedChange={(v) => setSettings({ ...settings, auto_reconcile: v })} />
            <Label className="text-sm">Automatikus egyeztetés</Label>
          </div>
          {settings.auto_reconcile && (
            <div><Label className="text-xs text-muted-foreground">Egyeztetés gyakorisága (óra)</Label>
              <Input type="number" min={1} max={168} value={settings.reconcile_interval_hours} onChange={(e) => setSettings({ ...settings, reconcile_interval_hours: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.alert_on_discrepancy} onCheckedChange={(v) => setSettings({ ...settings, alert_on_discrepancy: v })} />
            <Label className="text-sm">Eltérés riasztás</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Eltérés küszöb (%)</Label>
            <Input type="number" min={1} max={50} value={settings.discrepancy_threshold_percent} onChange={(e) => setSettings({ ...settings, discrepancy_threshold_percent: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.scheduled_inventory_enabled} onCheckedChange={(v) => setSettings({ ...settings, scheduled_inventory_enabled: v })} />
            <Label className="text-sm">Ütemezett leltár</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.track_serial_numbers} onCheckedChange={(v) => setSettings({ ...settings, track_serial_numbers: v })} />
            <Label className="text-sm">Sorozatszám követés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.track_batch_numbers} onCheckedChange={(v) => setSettings({ ...settings, track_batch_numbers: v })} />
            <Label className="text-sm">Batch szám követés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_on_low_stock_movement} onCheckedChange={(v) => setSettings({ ...settings, notify_on_low_stock_movement: v })} />
            <Label className="text-sm">Alacsony készlet értesítés</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminInventoryMovementLogTab;
