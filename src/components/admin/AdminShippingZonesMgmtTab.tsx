import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, MapPin, Plus, Trash2, Truck } from "lucide-react";

interface Zone {
  name: string;
  regions: string;
  flat_rate: number;
  free_above: number;
  delivery_days: string;
  enabled: boolean;
}

const AdminShippingZonesMgmtTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    zones: [
      { name: "Budapest", regions: "Budapest", flat_rate: 990, free_above: 15000, delivery_days: "1-2", enabled: true },
      { name: "Vidék", regions: "Pest, Győr, Debrecen, Szeged", flat_rate: 1490, free_above: 20000, delivery_days: "2-4", enabled: true },
      { name: "EU", regions: "Ausztria, Szlovákia, Románia", flat_rate: 2990, free_above: 0, delivery_days: "5-10", enabled: false },
    ] as Zone[],
    default_zone: "Vidék",
    show_delivery_estimate: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("shipping_zones_mgmt_enabled, shipping_zones_mgmt_settings").limit(1).single();
      if (data) {
        setEnabled(data.shipping_zones_mgmt_enabled ?? false);
        if (data.shipping_zones_mgmt_settings && typeof data.shipping_zones_mgmt_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.shipping_zones_mgmt_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      shipping_zones_mgmt_enabled: enabled,
      shipping_zones_mgmt_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Szállítási zóna beállítások mentve!" });
    setSaving(false);
  };

  const addZone = () => {
    setSettings({ ...settings, zones: [...settings.zones, { name: "", regions: "", flat_rate: 0, free_above: 0, delivery_days: "", enabled: false }] });
  };

  const removeZone = (idx: number) => {
    setSettings({ ...settings, zones: settings.zones.filter((_, i) => i !== idx) });
  };

  const updateZone = (idx: number, field: keyof Zone, value: any) => {
    const updated = [...settings.zones];
    (updated[idx] as any)[field] = value;
    setSettings({ ...settings, zones: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><MapPin className="w-5 h-5 text-accent" /> Szállítási zóna kezelő</h2>
          <p className="text-sm text-muted-foreground">Régiónkénti szállítási díjak és szabályok</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="border border-border rounded p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Switch checked={settings.show_delivery_estimate} onCheckedChange={(v) => setSettings({ ...settings, show_delivery_estimate: v })} />
          <Label className="text-sm">Szállítási idő becslés megjelenítése</Label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Truck className="w-4 h-4" /> Zónák</h3>
          <Button size="sm" variant="outline" onClick={addZone} className="gap-1"><Plus className="w-3 h-3" /> Új zóna</Button>
        </div>
        {settings.zones.map((zone, idx) => (
          <div key={idx} className="border border-border rounded p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Input placeholder="Zóna neve" value={zone.name} onChange={(e) => updateZone(idx, "name", e.target.value)} className="text-sm flex-1" />
              <Switch checked={zone.enabled} onCheckedChange={(v) => updateZone(idx, "enabled", v)} />
              <Button size="sm" variant="ghost" onClick={() => removeZone(idx)}><Trash2 className="w-3 h-3" /></Button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Régiók (vesszővel)</Label>
              <Input value={zone.regions} onChange={(e) => updateZone(idx, "regions", e.target.value)} className="text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Átalánydíj (Ft)</Label>
                <Input type="number" value={zone.flat_rate} onChange={(e) => updateZone(idx, "flat_rate", Number(e.target.value))} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ingyenes felett (Ft)</Label>
                <Input type="number" value={zone.free_above} onChange={(e) => updateZone(idx, "free_above", Number(e.target.value))} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Szállítási idő</Label>
                <Input value={zone.delivery_days} onChange={(e) => updateZone(idx, "delivery_days", e.target.value)} className="text-sm" placeholder="pl. 2-4 nap" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminShippingZonesMgmtTab;
