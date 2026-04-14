import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, Pencil, RefreshCw } from "lucide-react";

interface ReorderRule {
  id: string;
  product_sku: string;
  product_name: string;
  min_stock: number;
  reorder_qty: number;
  supplier: string;
  auto_approve: boolean;
  is_active: boolean;
}

const emptyRule = (): ReorderRule => ({
  id: crypto.randomUUID(), product_sku: "", product_name: "", min_stock: 5,
  reorder_qty: 50, supplier: "", auto_approve: false, is_active: true,
});

const AdminAutoReorderTab = () => {
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
      auto_reorder_settings: settings.auto_reorder_settings,
      auto_reorder_enabled: settings.auto_reorder_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Automatikus újrarendelés beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const rules: ReorderRule[] = Array.isArray(settings.auto_reorder_settings?.rules) ? settings.auto_reorder_settings.rules : [];

  const updateRules = (newRules: ReorderRule[]) => {
    setSettings({ ...settings, auto_reorder_settings: { ...settings.auto_reorder_settings, rules: newRules } });
  };

  const addRule = () => {
    const n = emptyRule();
    updateRules([...rules, n]);
    setEditIdx(rules.length);
  };

  const updateRule = (idx: number, field: string, value: any) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: value };
    updateRules(updated);
  };

  const removeRule = (idx: number) => {
    updateRules(rules.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Automatikus készlet újrarendelés</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <RefreshCw className="h-4 w-4 text-accent" /> Auto újrarendelés
          </div>
          <Switch checked={settings.auto_reorder_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, auto_reorder_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Minimum készletszint alá csökkenéskor automatikus beszerezési javaslat vagy rendelés.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Újrarendelési szabályok ({rules.length})</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addRule}>
            <Plus className="h-3 w-3 mr-1" /> Új szabály
          </Button>
        </div>

        {rules.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek újrarendelési szabályok.</p>}

        {rules.map((r, i) => (
          <div key={r.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.product_name || r.product_sku || "Új szabály"}</span>
                <span className="text-xs text-accent font-mono">min: {r.min_stock} → +{r.reorder_qty}</span>
                {r.auto_approve && <span className="text-[9px] uppercase tracking-widest border px-1.5 py-0.5 text-green-500">Auto</span>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeRule(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {editIdx === i && (
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label className="text-xs uppercase tracking-wider">Termék neve</Label><Input value={r.product_name} onChange={e => updateRule(i, "product_name", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                <div><Label className="text-xs uppercase tracking-wider">SKU</Label><Input value={r.product_sku} onChange={e => updateRule(i, "product_sku", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                <div><Label className="text-xs uppercase tracking-wider">Minimum készlet</Label><Input type="number" value={r.min_stock} onChange={e => updateRule(i, "min_stock", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
                <div><Label className="text-xs uppercase tracking-wider">Rendelési mennyiség</Label><Input type="number" value={r.reorder_qty} onChange={e => updateRule(i, "reorder_qty", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
                <div><Label className="text-xs uppercase tracking-wider">Beszállító</Label><Input value={r.supplier} onChange={e => updateRule(i, "supplier", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Auto jóváhagyás</Label><Switch checked={r.auto_approve} onCheckedChange={v => updateRule(i, "auto_approve", v)} /></div>
                <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Aktív</Label><Switch checked={r.is_active} onCheckedChange={v => updateRule(i, "is_active", v)} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAutoReorderTab;
