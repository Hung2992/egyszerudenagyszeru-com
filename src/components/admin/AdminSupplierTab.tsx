import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, Pencil, Factory, Star } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  lead_time_days: number;
  rating: number;
  min_order_amount: number;
  currency: string;
  auto_reorder_threshold: number;
  notes: string;
  is_active: boolean;
}

const emptySupplier = (): Supplier => ({
  id: crypto.randomUUID(),
  name: "",
  contact_email: "",
  contact_phone: "",
  lead_time_days: 7,
  rating: 5,
  min_order_amount: 0,
  currency: "HUF",
  auto_reorder_threshold: 5,
  notes: "",
  is_active: true,
});

const AdminSupplierTab = () => {
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
      supplier_management: settings.supplier_management,
      supplier_auto_reorder_enabled: settings.supplier_auto_reorder_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Beszállító beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const suppliers: Supplier[] = Array.isArray(settings.supplier_management) ? settings.supplier_management : [];

  const addSupplier = () => {
    const n = emptySupplier();
    setSettings({ ...settings, supplier_management: [...suppliers, n] });
    setEditIdx(suppliers.length);
  };

  const updateSupplier = (idx: number, field: string, value: any) => {
    const updated = [...suppliers];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, supplier_management: updated });
  };

  const removeSupplier = (idx: number) => {
    setSettings({ ...settings, supplier_management: suppliers.filter((_, i) => i !== idx) });
    if (editIdx === idx) setEditIdx(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Beszállító menedzsment</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Factory className="h-4 w-4 text-accent" /> Automatikus újrarendelés
          </div>
          <Switch checked={settings.supplier_auto_reorder_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, supplier_auto_reorder_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Készletszint alá csökkenéskor automatikus rendelés a beszállítóktól.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Beszállítók ({suppliers.length})</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addSupplier}>
            <Plus className="h-3 w-3 mr-1" /> Új beszállító
          </Button>
        </div>

        {suppliers.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek regisztrált beszállítók.</p>}

        {suppliers.map((s, i) => (
          <div key={s.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{s.name || "Névtelen beszállító"}</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} className={`h-3 w-3 ${si < s.rating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{s.lead_time_days} nap</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeSupplier(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {editIdx === i && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Beszállító neve</Label>
                  <Input value={s.name} onChange={e => updateSupplier(i, "name", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">E-mail</Label>
                  <Input value={s.contact_email} onChange={e => updateSupplier(i, "contact_email", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Telefon</Label>
                  <Input value={s.contact_phone} onChange={e => updateSupplier(i, "contact_phone", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Szállítási idő (nap)</Label>
                  <Input type="number" value={s.lead_time_days} onChange={e => updateSupplier(i, "lead_time_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Értékelés (1-5)</Label>
                  <Input type="number" min={1} max={5} value={s.rating} onChange={e => updateSupplier(i, "rating", Math.min(5, Math.max(1, Number(e.target.value))))} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Min. rendelési összeg</Label>
                  <Input type="number" value={s.min_order_amount} onChange={e => updateSupplier(i, "min_order_amount", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Újrarendelési küszöb (db)</Label>
                  <Input type="number" value={s.auto_reorder_threshold} onChange={e => updateSupplier(i, "auto_reorder_threshold", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider">Aktív</Label>
                  <Switch checked={s.is_active} onCheckedChange={v => updateSupplier(i, "is_active", v)} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSupplierTab;
