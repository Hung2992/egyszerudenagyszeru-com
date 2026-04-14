import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, Pencil, Users } from "lucide-react";

interface CustomerGroup {
  id: string;
  name: string;
  discount_percent: number;
  min_order_for_discount: number;
  price_list_type: "discount" | "fixed" | "multiplier";
  multiplier: number;
  is_active: boolean;
}

const PRICE_LIST_TYPES: Record<string, string> = { discount: "Százalékos kedvezmény", fixed: "Fix árlista", multiplier: "Szorzó" };

const emptyGroup = (): CustomerGroup => ({
  id: crypto.randomUUID(), name: "", discount_percent: 10, min_order_for_discount: 0,
  price_list_type: "discount", multiplier: 1, is_active: true,
});

const AdminCustomerGroupPricingTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

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
      customer_group_pricing: settings.customer_group_pricing,
      b2b_pricing_enabled: settings.b2b_pricing_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Vásárlói csoport árazás frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const groups: CustomerGroup[] = Array.isArray(settings.customer_group_pricing) ? settings.customer_group_pricing : [];

  const addGroup = () => {
    const n = emptyGroup();
    setSettings({ ...settings, customer_group_pricing: [...groups, n] });
    setEditIdx(groups.length);
  };

  const updateGroup = (idx: number, field: string, value: any) => {
    const updated = [...groups];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, customer_group_pricing: updated });
  };

  const removeGroup = (idx: number) => {
    setSettings({ ...settings, customer_group_pricing: groups.filter((_, i) => i !== idx) });
    if (editIdx === idx) setEditIdx(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Vásárlói csoport árazás</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Users className="h-4 w-4 text-accent" /> B2B árazás
          </div>
          <Switch checked={settings.b2b_pricing_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, b2b_pricing_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Egyedi nagykereskedelmi árak engedélyezése regisztrált B2B vásárlóknak.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Csoportok ({groups.length})</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addGroup}>
            <Plus className="h-3 w-3 mr-1" /> Új csoport
          </Button>
        </div>

        {groups.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek vásárlói csoportok.</p>}

        {groups.map((g, i) => (
          <div key={g.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{g.name || "Névtelen csoport"}</span>
                <span className="text-[9px] uppercase tracking-widest border px-1.5 py-0.5">{PRICE_LIST_TYPES[g.price_list_type]}</span>
                <span className="text-xs text-accent font-mono">
                  {g.price_list_type === "discount" ? `-${g.discount_percent}%` : g.price_list_type === "multiplier" ? `×${g.multiplier}` : "Fix"}
                </span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeGroup(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {editIdx === i && (
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label className="text-xs uppercase tracking-wider">Csoport neve</Label><Input value={g.name} onChange={e => updateGroup(i, "name", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                <div><Label className="text-xs uppercase tracking-wider">Árazás típusa</Label>
                  <select value={g.price_list_type} onChange={e => updateGroup(i, "price_list_type", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    {Object.entries(PRICE_LIST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {g.price_list_type === "discount" && (
                  <div><Label className="text-xs uppercase tracking-wider">Kedvezmény (%)</Label><Input type="number" value={g.discount_percent} onChange={e => updateGroup(i, "discount_percent", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
                )}
                {g.price_list_type === "multiplier" && (
                  <div><Label className="text-xs uppercase tracking-wider">Szorzó</Label><Input type="number" step="0.01" value={g.multiplier} onChange={e => updateGroup(i, "multiplier", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
                )}
                <div><Label className="text-xs uppercase tracking-wider">Min. rendelés összeg (Ft)</Label><Input type="number" value={g.min_order_for_discount} onChange={e => updateGroup(i, "min_order_for_discount", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
                <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Aktív</Label><Switch checked={g.is_active} onCheckedChange={v => updateGroup(i, "is_active", v)} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCustomerGroupPricingTab;
