import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Truck, Package } from "lucide-react";

interface Fulfillment {
  id: string;
  courier_name: string;
  tracking_url_template: string | null;
  packaging_type: string;
  auto_tracking_email: boolean;
  is_active: boolean;
}

const AdminFulfillmentTab = () => {
  const [items, setItems] = useState<Fulfillment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ courier_name: "", tracking_url_template: "", packaging_type: "standard", auto_tracking_email: true });

  const fetchData = async () => {
    const { data } = await supabase.from("fulfillment_settings").select("*").order("created_at");
    if (data) setItems(data as Fulfillment[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const add = async () => {
    if (!form.courier_name.trim()) return;
    const { error } = await supabase.from("fulfillment_settings").insert(form);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Futár hozzáadva" }); setShowForm(false); setForm({ courier_name: "", tracking_url_template: "", packaging_type: "standard", auto_tracking_email: true }); fetchData(); }
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("fulfillment_settings").update({ is_active: active }).eq("id", id);
    fetchData();
  };

  const remove = async (id: string) => {
    await supabase.from("fulfillment_settings").delete().eq("id", id);
    toast({ title: "Törölve" }); fetchData();
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Truck className="w-5 h-5" /><h2 className="font-bold text-lg">Logisztika & Fulfillment</h2></div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Új futár</Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Futár neve</Label><Input value={form.courier_name} onChange={e => setForm({ ...form, courier_name: e.target.value })} placeholder="pl. GLS, DPD, MPL" /></div>
            <div><Label>Követési URL sablon</Label><Input value={form.tracking_url_template} onChange={e => setForm({ ...form, tracking_url_template: e.target.value })} placeholder="https://tracking.gls.hu/?id={tracking_number}" /></div>
            <div>
              <Label>Csomagolás típus</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.packaging_type} onChange={e => setForm({ ...form, packaging_type: e.target.value })}>
                <option value="standard">Standard</option>
                <option value="eco">Eco (környezetbarát)</option>
                <option value="premium">Prémium</option>
                <option value="fragile">Törékeny</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.auto_tracking_email} onCheckedChange={v => setForm({ ...form, auto_tracking_email: v })} />
              <Label>Automatikus követési e-mail</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={add}>Mentés</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Mégse</Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader><TableRow><TableHead>Futár</TableHead><TableHead>Csomagolás</TableHead><TableHead>Követési e-mail</TableHead><TableHead>Aktív</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {items.map(i => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.courier_name}</TableCell>
              <TableCell>{i.packaging_type}</TableCell>
              <TableCell>{i.auto_tracking_email ? "✓" : "✗"}</TableCell>
              <TableCell><Switch checked={i.is_active} onCheckedChange={v => toggle(i.id, v)} /></TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek futár beállítások.</p>}
    </div>
  );
};

export default AdminFulfillmentTab;
