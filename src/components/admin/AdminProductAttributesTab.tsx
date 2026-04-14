import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, SlidersHorizontal } from "lucide-react";

interface ProductAttribute {
  id: string;
  name: string;
  attribute_type: string;
  possible_values: string[];
  category_filter: string | null;
  sort_order: number;
  is_active: boolean;
}

const ATTR_TYPES = [
  { value: "select", label: "Legördülő" },
  { value: "color", label: "Szín" },
  { value: "size", label: "Méret" },
  { value: "text", label: "Szöveg" },
  { value: "number", label: "Szám" },
];

const AdminProductAttributesTab = () => {
  const [attrs, setAttrs] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", attribute_type: "select", possible_values_str: "", category_filter: "", sort_order: 0 });

  const fetchData = async () => {
    const { data } = await supabase.from("product_attributes").select("*").order("sort_order");
    if (data) setAttrs(data as ProductAttribute[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const add = async () => {
    if (!form.name.trim()) return;
    const possible_values = form.possible_values_str.split(",").map(v => v.trim()).filter(Boolean);
    const { error } = await supabase.from("product_attributes").insert({
      name: form.name,
      attribute_type: form.attribute_type,
      possible_values,
      category_filter: form.category_filter || null,
      sort_order: form.sort_order,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Attribútum létrehozva" }); setShowForm(false); setForm({ name: "", attribute_type: "select", possible_values_str: "", category_filter: "", sort_order: 0 }); fetchData(); }
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("product_attributes").update({ is_active: active }).eq("id", id);
    fetchData();
  };

  const remove = async (id: string) => {
    await supabase.from("product_attributes").delete().eq("id", id);
    toast({ title: "Törölve" }); fetchData();
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><SlidersHorizontal className="w-5 h-5" /><h2 className="font-bold text-lg">Termék attribútumok & szűrők</h2></div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Új attribútum</Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Név</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="pl. Anyag, Stílus" /></div>
            <div>
              <Label>Típus</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.attribute_type} onChange={e => setForm({ ...form, attribute_type: e.target.value })}>
                {ATTR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><Label>Lehetséges értékek (vesszővel)</Label><Input value={form.possible_values_str} onChange={e => setForm({ ...form, possible_values_str: e.target.value })} placeholder="Pamut, Poliészter, Bőr" /></div>
            <div><Label>Kategória szűrő</Label><Input value={form.category_filter} onChange={e => setForm({ ...form, category_filter: e.target.value })} placeholder="Opcionális: pl. Pólók" /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={add}>Mentés</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Mégse</Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader><TableRow><TableHead>Név</TableHead><TableHead>Típus</TableHead><TableHead>Értékek</TableHead><TableHead>Kategória</TableHead><TableHead>Aktív</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {attrs.map(a => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell><Badge variant="outline">{ATTR_TYPES.find(t => t.value === a.attribute_type)?.label || a.attribute_type}</Badge></TableCell>
              <TableCell className="text-sm max-w-[200px] truncate">{a.possible_values.join(", ")}</TableCell>
              <TableCell>{a.category_filter || "Összes"}</TableCell>
              <TableCell><Switch checked={a.is_active} onCheckedChange={v => toggle(a.id, v)} /></TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {attrs.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek termék attribútumok.</p>}
    </div>
  );
};

export default AdminProductAttributesTab;
