import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Warehouse, MapPin, ArrowRightLeft, Plus, Trash2 } from "lucide-react";

interface WarehouseItem {
  name: string;
  location: string;
  is_primary: boolean;
  capacity: number;
}

const AdminMultiWarehouseTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_allocate: true,
    allocation_strategy: "nearest",
    transfer_enabled: true,
    low_stock_threshold: 5,
    warehouses: [
      { name: "Központi raktár", location: "Budapest", is_primary: true, capacity: 10000 },
    ] as WarehouseItem[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("multi_warehouse_enabled, multi_warehouse_settings").limit(1).single();
      if (data) {
        setEnabled(data.multi_warehouse_enabled ?? false);
        if (data.multi_warehouse_settings && typeof data.multi_warehouse_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.multi_warehouse_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      multi_warehouse_enabled: enabled,
      multi_warehouse_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Többraktáras beállítások mentve!" });
    setSaving(false);
  };

  const addWarehouse = () => {
    setSettings({
      ...settings,
      warehouses: [...settings.warehouses, { name: "", location: "", is_primary: false, capacity: 1000 }],
    });
  };

  const removeWarehouse = (idx: number) => {
    setSettings({ ...settings, warehouses: settings.warehouses.filter((_, i) => i !== idx) });
  };

  const updateWarehouse = (idx: number, field: keyof WarehouseItem, value: any) => {
    const updated = [...settings.warehouses];
    (updated[idx] as any)[field] = value;
    if (field === "is_primary" && value) {
      updated.forEach((w, i) => { if (i !== idx) w.is_primary = false; });
    }
    setSettings({ ...settings, warehouses: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Warehouse className="w-5 h-5 text-accent" /> Többraktáras készletkezelés</h2>
          <p className="text-sm text-muted-foreground">Raktárak közötti készletmozgatás és allokáció</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Allokáció</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_allocate} onCheckedChange={(v) => setSettings({ ...settings, auto_allocate: v })} />
            <Label className="text-sm">Automatikus készletallokáció</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Allokációs stratégia</Label>
            <select className="w-full border border-border bg-background text-foreground p-2 rounded text-sm" value={settings.allocation_strategy} onChange={(e) => setSettings({ ...settings, allocation_strategy: e.target.value })}>
              <option value="nearest">Legközelebbi raktár</option>
              <option value="stock">Legnagyobb készlet</option>
              <option value="priority">Prioritás alapú</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.transfer_enabled} onCheckedChange={(v) => setSettings({ ...settings, transfer_enabled: v })} />
            <Label className="text-sm">Raktárközi transzfer engedélyezése</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Alacsony készlet küszöb</Label>
            <Input type="number" value={settings.low_stock_threshold} onChange={(e) => setSettings({ ...settings, low_stock_threshold: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Raktárak</h3>
            <Button size="sm" variant="outline" onClick={addWarehouse} className="gap-1"><Plus className="w-3 h-3" /> Hozzáadás</Button>
          </div>
          {settings.warehouses.map((wh, idx) => (
            <div key={idx} className="border border-border/50 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Input placeholder="Raktár neve" value={wh.name} onChange={(e) => updateWarehouse(idx, "name", e.target.value)} className="text-sm" />
                <Button size="sm" variant="ghost" onClick={() => removeWarehouse(idx)}><Trash2 className="w-3 h-3" /></Button>
              </div>
              <Input placeholder="Helyszín" value={wh.location} onChange={(e) => updateWarehouse(idx, "location", e.target.value)} className="text-sm" />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Switch checked={wh.is_primary} onCheckedChange={(v) => updateWarehouse(idx, "is_primary", v)} />
                  <Label className="text-xs">Elsődleges</Label>
                </div>
                <div className="flex-1">
                  <Input type="number" placeholder="Kapacitás" value={wh.capacity} onChange={(e) => updateWarehouse(idx, "capacity", Number(e.target.value))} className="text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminMultiWarehouseTab;
