import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Package, Clock, Truck } from "lucide-react";

const AdminOrderConsolidationTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_consolidate: true,
    consolidation_window_hours: 24,
    same_address_only: true,
    same_payment_only: false,
    max_orders_per_bundle: 5,
    notify_customer: true,
    optimize_packaging: true,
    packaging_size_options: ["small", "medium", "large"],
    weight_limit_kg: 30,
    combine_shipping_discount: true,
    shipping_discount_percent: 15,
    allow_manual_merge: true,
    auto_split_oversized: true,
    split_threshold_kg: 25,
    consolidation_status: "pending_merge",
    require_admin_approval: false,
    show_savings_to_customer: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("order_consolidation_enabled, order_consolidation_settings").limit(1).single();
      if (data) {
        setEnabled(data.order_consolidation_enabled ?? false);
        if (data.order_consolidation_settings && typeof data.order_consolidation_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.order_consolidation_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      order_consolidation_enabled: enabled,
      order_consolidation_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Rendelés összevonás beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Package className="w-5 h-5 text-accent" /> Rendelés összevonás</h2>
          <p className="text-sm text-muted-foreground">Rendelések automatikus összevonása, csomagolás optimalizálás</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Összevonási szabályok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_consolidate} onCheckedChange={(v) => setSettings({ ...settings, auto_consolidate: v })} />
            <Label className="text-sm">Automatikus összevonás</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Összevonási ablak (óra)</Label>
            <Input type="number" min={1} max={72} value={settings.consolidation_window_hours} onChange={(e) => setSettings({ ...settings, consolidation_window_hours: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.same_address_only} onCheckedChange={(v) => setSettings({ ...settings, same_address_only: v })} />
            <Label className="text-sm">Csak azonos cím esetén</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.same_payment_only} onCheckedChange={(v) => setSettings({ ...settings, same_payment_only: v })} />
            <Label className="text-sm">Csak azonos fizetési mód</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max rendelés/csomag</Label>
            <Input type="number" min={2} max={20} value={settings.max_orders_per_bundle} onChange={(e) => setSettings({ ...settings, max_orders_per_bundle: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.require_admin_approval} onCheckedChange={(v) => setSettings({ ...settings, require_admin_approval: v })} />
            <Label className="text-sm">Admin jóváhagyás szükséges</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.allow_manual_merge} onCheckedChange={(v) => setSettings({ ...settings, allow_manual_merge: v })} />
            <Label className="text-sm">Manuális összevonás engedélyezése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_customer} onCheckedChange={(v) => setSettings({ ...settings, notify_customer: v })} />
            <Label className="text-sm">Vásárló értesítése</Label>
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Truck className="w-4 h-4" /> Csomagolás & szállítás</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.optimize_packaging} onCheckedChange={(v) => setSettings({ ...settings, optimize_packaging: v })} />
            <Label className="text-sm">Csomagolás optimalizálás</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Súlyhatár (kg)</Label>
            <Input type="number" min={1} max={100} value={settings.weight_limit_kg} onChange={(e) => setSettings({ ...settings, weight_limit_kg: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_split_oversized} onCheckedChange={(v) => setSettings({ ...settings, auto_split_oversized: v })} />
            <Label className="text-sm">Túlméretes auto-felosztás</Label>
          </div>
          {settings.auto_split_oversized && (
            <div>
              <Label className="text-xs text-muted-foreground">Felosztási küszöb (kg)</Label>
              <Input type="number" min={1} max={100} value={settings.split_threshold_kg} onChange={(e) => setSettings({ ...settings, split_threshold_kg: Number(e.target.value) })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.combine_shipping_discount} onCheckedChange={(v) => setSettings({ ...settings, combine_shipping_discount: v })} />
            <Label className="text-sm">Kombinált szállítási kedvezmény</Label>
          </div>
          {settings.combine_shipping_discount && (
            <div>
              <Label className="text-xs text-muted-foreground">Kedvezmény (%)</Label>
              <Input type="number" min={0} max={100} value={settings.shipping_discount_percent} onChange={(e) => setSettings({ ...settings, shipping_discount_percent: Number(e.target.value) })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_savings_to_customer} onCheckedChange={(v) => setSettings({ ...settings, show_savings_to_customer: v })} />
            <Label className="text-sm">Megtakarítás megjelenítése</Label>
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminOrderConsolidationTab;
