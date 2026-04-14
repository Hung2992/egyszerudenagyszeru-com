import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Check, Truck } from "lucide-react";

interface ShippingMethod {
  id: string;
  name: string;
  description: string | null;
  price: number;
  free_above: number | null;
  estimated_days_min: number;
  estimated_days_max: number;
  zones: string[];
  is_active: boolean;
  sort_order: number;
}

const AdminShippingTab = () => {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [editMethod, setEditMethod] = useState<Partial<ShippingMethod> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchMethods = async () => {
    const { data } = await supabase.from("shipping_methods").select("*").order("sort_order", { ascending: true });
    if (data) setMethods(data as any);
  };

  useEffect(() => { fetchMethods(); }, []);

  const saveMethod = async () => {
    if (!editMethod?.name) {
      toast({ title: "Hiba", description: "Név kötelező!", variant: "destructive" });
      return;
    }
    const payload = {
      name: editMethod.name,
      description: editMethod.description || null,
      price: Number(editMethod.price) || 0,
      free_above: editMethod.free_above ? Number(editMethod.free_above) : null,
      estimated_days_min: Number(editMethod.estimated_days_min) || 1,
      estimated_days_max: Number(editMethod.estimated_days_max) || 3,
      zones: editMethod.zones || [],
      is_active: editMethod.is_active ?? true,
      sort_order: Number(editMethod.sort_order) || 0,
    };
    if (editMethod.id) {
      await supabase.from("shipping_methods").update(payload).eq("id", editMethod.id);
      toast({ title: "Szállítási mód frissítve!" });
    } else {
      await supabase.from("shipping_methods").insert(payload);
      toast({ title: "Szállítási mód létrehozva!" });
    }
    setShowForm(false);
    setEditMethod(null);
    fetchMethods();
  };

  const deleteMethod = async (id: string) => {
    await supabase.from("shipping_methods").delete().eq("id", id);
    toast({ title: "Szállítási mód törölve!" });
    fetchMethods();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Szállítási módok ({methods.length})</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditMethod({}); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Új szállítási mód
        </Button>
      </div>

      {showForm && editMethod && (
        <div className="border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">{editMethod.id ? "Szerkesztés" : "Új szállítási mód"}</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowForm(false); setEditMethod(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Név *</Label>
              <Input value={editMethod.name || ""} onChange={e => setEditMethod({ ...editMethod, name: e.target.value })} className="mt-1" placeholder="pl. GLS Futárszolgálat" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ár (Ft)</Label>
              <Input type="number" value={editMethod.price || 0} onChange={e => setEditMethod({ ...editMethod, price: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ingyenes szállítás felett (Ft)</Label>
              <Input type="number" value={editMethod.free_above || ""} onChange={e => setEditMethod({ ...editMethod, free_above: e.target.value ? Number(e.target.value) : null })} className="mt-1" placeholder="pl. 15000" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sorrend</Label>
              <Input type="number" value={editMethod.sort_order || 0} onChange={e => setEditMethod({ ...editMethod, sort_order: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szállítási idő (nap) - minimum</Label>
              <Input type="number" value={editMethod.estimated_days_min || 1} onChange={e => setEditMethod({ ...editMethod, estimated_days_min: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Szállítási idő (nap) - maximum</Label>
              <Input type="number" value={editMethod.estimated_days_max || 3} onChange={e => setEditMethod({ ...editMethod, estimated_days_max: Number(e.target.value) })} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Zónák (vesszővel elválasztva)</Label>
              <Input value={(editMethod.zones || []).join(", ")} onChange={e => setEditMethod({ ...editMethod, zones: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="mt-1" placeholder="Budapest, Vidék, Nemzetközi" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Leírás</Label>
              <Textarea value={editMethod.description || ""} onChange={e => setEditMethod({ ...editMethod, description: e.target.value })} className="mt-1 rounded-none min-h-[60px] text-xs" placeholder="Rövid leírás a szállítási módról..." />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={editMethod.is_active ?? true} onChange={e => setEditMethod({ ...editMethod, is_active: e.target.checked })} className="rounded" />
              Aktív
            </label>
          </div>
          <Button className="rounded-none uppercase tracking-wider text-xs" onClick={saveMethod}>
            <Check className="h-3.5 w-3.5 mr-1" /> Mentés
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {methods.map(m => (
          <div key={m.id} className="flex items-center gap-3 border bg-card p-3">
            <Truck className="h-5 w-5 text-accent flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{m.name}</span>
                {!m.is_active && <span className="text-[9px] font-bold uppercase tracking-widest text-destructive">Inaktív</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{m.price.toLocaleString()} Ft</span>
                {m.free_above && <span>Ingyenes {m.free_above.toLocaleString()} Ft felett</span>}
                <span>{m.estimated_days_min}-{m.estimated_days_max} munkanap</span>
                {m.zones.length > 0 && <span>{m.zones.join(", ")}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditMethod(m); setShowForm(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMethod(m.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {methods.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek szállítási módok. Adj hozzá egyet!</p>
        )}
      </div>
    </div>
  );
};

export default AdminShippingTab;
