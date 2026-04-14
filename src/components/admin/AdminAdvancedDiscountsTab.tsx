import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Layers, Tag, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DiscountRule {
  name: string;
  type: string;
  value: number;
  min_order_amount: number;
  applies_to: string;
  is_active: boolean;
}

const AdminAdvancedDiscountsTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data);
    };
    f();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      discount_stacking_enabled: settings.discount_stacking_enabled,
      discount_tier_pricing_enabled: settings.discount_tier_pricing_enabled,
      discount_advanced_rules: settings.discount_advanced_rules,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Kedvezmény szabályok frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const rules: DiscountRule[] = Array.isArray(settings.discount_advanced_rules) ? settings.discount_advanced_rules : [];

  const addRule = () => {
    setSettings({ ...settings, discount_advanced_rules: [...rules, { name: "", type: "percent", value: 10, min_order_amount: 0, applies_to: "all", is_active: false }] });
  };

  const updateRule = (idx: number, field: string, value: any) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, discount_advanced_rules: updated });
  };

  const removeRule = (idx: number) => {
    setSettings({ ...settings, discount_advanced_rules: rules.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Haladó kedvezmény szabályok</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Layers className="h-4 w-4 text-accent" /> Kupon kombinálás
            </div>
            <Switch checked={settings.discount_stacking_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, discount_stacking_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Több kuponkód egyidejű használata egy rendelésnél.</p>
        </div>

        <div className="border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Tag className="h-4 w-4 text-accent" /> Szinthez kötött árazás
            </div>
            <Switch checked={settings.discount_tier_pricing_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, discount_tier_pricing_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Hűségszintekhez kötött automatikus árak a termékeken.</p>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Egyedi kedvezmény szabályok</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addRule}>
            <Plus className="h-3 w-3 mr-1" /> Új szabály
          </Button>
        </div>
        {rules.length === 0 && <p className="text-xs text-muted-foreground">Nincs egyedi kedvezmény szabály.</p>}
        {rules.map((rule, i) => (
          <div key={i} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <Input placeholder="Szabály neve" value={rule.name} onChange={e => updateRule(i, "name", e.target.value)} className="rounded-none text-xs max-w-xs" />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeRule(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className="text-xs uppercase tracking-wider">Típus</Label>
                <Select value={rule.type} onValueChange={v => updateRule(i, "type", v)}>
                  <SelectTrigger className="rounded-none mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Százalék (%)</SelectItem>
                    <SelectItem value="fixed">Fix összeg (Ft)</SelectItem>
                    <SelectItem value="free_shipping">Ingyenes szállítás</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Érték</Label>
                <Input type="number" min={0} value={rule.value} onChange={e => updateRule(i, "value", parseFloat(e.target.value) || 0)} className="rounded-none mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Min. rendelés (Ft)</Label>
                <Input type="number" min={0} value={rule.min_order_amount} onChange={e => updateRule(i, "min_order_amount", parseInt(e.target.value) || 0)} className="rounded-none mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Vonatkozik</Label>
                <Select value={rule.applies_to} onValueChange={v => updateRule(i, "applies_to", v)}>
                  <SelectTrigger className="rounded-none mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Minden termék</SelectItem>
                    <SelectItem value="category">Kategória</SelectItem>
                    <SelectItem value="vip">VIP vásárlók</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={rule.is_active} onCheckedChange={v => updateRule(i, "is_active", v)} />
              <span className="text-xs text-muted-foreground">Aktív</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAdvancedDiscountsTab;
