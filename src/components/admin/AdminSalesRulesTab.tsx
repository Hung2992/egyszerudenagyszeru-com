import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Zap } from "lucide-react";

interface SalesRule {
  id: string;
  name: string;
  rule_type: string;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const RULE_TYPES = [
  { value: "auto_discount", label: "Automatikus kedvezmény" },
  { value: "bundle", label: "Csomagajánlat" },
  { value: "cross_sell", label: "Cross-sell" },
  { value: "upsell", label: "Upsell" },
  { value: "free_shipping", label: "Ingyenes szállítás szabály" },
];

const AdminSalesRulesTab = () => {
  const [rules, setRules] = useState<SalesRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", rule_type: "auto_discount", priority: 0 });

  const fetchData = async () => {
    const { data } = await supabase.from("sales_rules").select("*").order("priority", { ascending: false });
    if (data) setRules(data as SalesRule[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const add = async () => {
    if (!form.name.trim()) return;
    const { error } = await supabase.from("sales_rules").insert(form);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Szabály létrehozva" }); setShowForm(false); setForm({ name: "", rule_type: "auto_discount", priority: 0 }); fetchData(); }
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("sales_rules").update({ is_active: active }).eq("id", id);
    fetchData();
  };

  const remove = async (id: string) => {
    await supabase.from("sales_rules").delete().eq("id", id);
    toast({ title: "Törölve" }); fetchData();
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Zap className="w-5 h-5" /><h2 className="font-bold text-lg">Értékesítési szabályok</h2></div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Új szabály</Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Név</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="pl. 3-ért 2-t fizetsz" /></div>
            <div>
              <Label>Típus</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.rule_type} onChange={e => setForm({ ...form, rule_type: e.target.value })}>
                {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><Label>Prioritás</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={add}>Mentés</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Mégse</Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader><TableRow><TableHead>Név</TableHead><TableHead>Típus</TableHead><TableHead>Prioritás</TableHead><TableHead>Aktív</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rules.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell><Badge variant="outline">{RULE_TYPES.find(t => t.value === r.rule_type)?.label || r.rule_type}</Badge></TableCell>
              <TableCell>{r.priority}</TableCell>
              <TableCell><Switch checked={r.is_active} onCheckedChange={v => toggle(r.id, v)} /></TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rules.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek értékesítési szabályok.</p>}
    </div>
  );
};

export default AdminSalesRulesTab;
