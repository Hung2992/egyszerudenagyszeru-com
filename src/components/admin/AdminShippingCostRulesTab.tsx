import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Truck, Package, DollarSign } from "lucide-react";

const AdminShippingCostRulesTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    free_shipping_enabled: true,
    free_shipping_threshold: 15000,
    weight_based_pricing: true,
    weight_price_per_kg: 500,
    size_based_pricing: false,
    flat_rate: 1490,
    express_multiplier: 2,
    local_pickup_enabled: true,
    local_pickup_discount: 100,
    international_multiplier: 3,
    max_shipping_cost: 5000,
    fragile_surcharge: 500,
    oversized_surcharge: 1500,
    insurance_enabled: true,
    insurance_percent: 2,
    cod_fee: 500,
    packaging_fee: 0,
    rural_surcharge: 300,
    weekend_surcharge: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("shipping_cost_rules_enabled, shipping_cost_rules_settings").limit(1).single();
      if (data) {
        setEnabled(data.shipping_cost_rules_enabled ?? false);
        if (data.shipping_cost_rules_settings && typeof data.shipping_cost_rules_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.shipping_cost_rules_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      shipping_cost_rules_enabled: enabled,
      shipping_cost_rules_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Szállítási költség szabályok mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Truck className="w-5 h-5 text-accent" /> Szállítási költség szabályok</h2>
          <p className="text-sm text-muted-foreground">Szállítási díj kalkulátor, súly/méret alapú árazás, ingyenes szállítás feltételek</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" /> Alap díjszabás</h3>
          <div><Label className="text-xs text-muted-foreground">Fix szállítási díj (Ft)</Label>
            <Input type="number" min={0} value={settings.flat_rate} onChange={(e) => setSettings({ ...settings, flat_rate: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.free_shipping_enabled} onCheckedChange={(v) => setSettings({ ...settings, free_shipping_enabled: v })} />
            <Label className="text-sm">Ingyenes szállítás</Label>
          </div>
          {settings.free_shipping_enabled && (
            <div><Label className="text-xs text-muted-foreground">Ingyenes szállítás küszöb (Ft)</Label>
              <Input type="number" min={0} value={settings.free_shipping_threshold} onChange={(e) => setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })} /></div>
          )}
          <div><Label className="text-xs text-muted-foreground">Max szállítási díj (Ft)</Label>
            <Input type="number" min={0} value={settings.max_shipping_cost} onChange={(e) => setSettings({ ...settings, max_shipping_cost: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Expressz szorzó</Label>
            <Input type="number" min={1} step={0.1} value={settings.express_multiplier} onChange={(e) => setSettings({ ...settings, express_multiplier: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Nemzetközi szorzó</Label>
            <Input type="number" min={1} step={0.1} value={settings.international_multiplier} onChange={(e) => setSettings({ ...settings, international_multiplier: Number(e.target.value) })} /></div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Pótdíjak & kalkuláció</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.weight_based_pricing} onCheckedChange={(v) => setSettings({ ...settings, weight_based_pricing: v })} />
            <Label className="text-sm">Súly alapú árazás</Label>
          </div>
          {settings.weight_based_pricing && (
            <div><Label className="text-xs text-muted-foreground">Díj / kg (Ft)</Label>
              <Input type="number" min={0} value={settings.weight_price_per_kg} onChange={(e) => setSettings({ ...settings, weight_price_per_kg: Number(e.target.value) })} /></div>
          )}
          <div><Label className="text-xs text-muted-foreground">Törékeny pótdíj (Ft)</Label>
            <Input type="number" min={0} value={settings.fragile_surcharge} onChange={(e) => setSettings({ ...settings, fragile_surcharge: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Túlméretes pótdíj (Ft)</Label>
            <Input type="number" min={0} value={settings.oversized_surcharge} onChange={(e) => setSettings({ ...settings, oversized_surcharge: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Utánvét díj (Ft)</Label>
            <Input type="number" min={0} value={settings.cod_fee} onChange={(e) => setSettings({ ...settings, cod_fee: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Vidéki pótdíj (Ft)</Label>
            <Input type="number" min={0} value={settings.rural_surcharge} onChange={(e) => setSettings({ ...settings, rural_surcharge: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.insurance_enabled} onCheckedChange={(v) => setSettings({ ...settings, insurance_enabled: v })} />
            <Label className="text-sm">Szállítási biztosítás</Label>
          </div>
          {settings.insurance_enabled && (
            <div><Label className="text-xs text-muted-foreground">Biztosítás (%)</Label>
              <Input type="number" min={0} max={100} step={0.1} value={settings.insurance_percent} onChange={(e) => setSettings({ ...settings, insurance_percent: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.local_pickup_enabled} onCheckedChange={(v) => setSettings({ ...settings, local_pickup_enabled: v })} />
            <Label className="text-sm">Személyes átvétel</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminShippingCostRulesTab;
