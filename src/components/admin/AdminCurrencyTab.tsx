import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Globe, Star } from "lucide-react";

interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
  exchange_rate: number;
  is_default: boolean;
  is_active: boolean;
  decimal_places: number;
}

const AdminCurrencyTab = () => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", symbol: "", name: "", exchange_rate: 1, decimal_places: 2 });

  const fetchData = async () => {
    const { data } = await supabase.from("currency_settings").select("*").order("is_default", { ascending: false });
    if (data) setCurrencies(data as Currency[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addCurrency = async () => {
    if (!form.code.trim() || !form.name.trim()) return;
    const { error } = await supabase.from("currency_settings").insert({
      code: form.code.toUpperCase(), symbol: form.symbol, name: form.name,
      exchange_rate: form.exchange_rate, decimal_places: form.decimal_places,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Pénznem hozzáadva" }); setShowForm(false); setForm({ code: "", symbol: "", name: "", exchange_rate: 1, decimal_places: 2 }); fetchData(); }
  };

  const setDefault = async (id: string) => {
    await supabase.from("currency_settings").update({ is_default: false }).neq("id", id);
    await supabase.from("currency_settings").update({ is_default: true }).eq("id", id);
    toast({ title: "Alapértelmezett pénznem beállítva" }); fetchData();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("currency_settings").update({ is_active: active }).eq("id", id);
    fetchData();
  };

  const deleteCurrency = async (id: string) => {
    await supabase.from("currency_settings").delete().eq("id", id);
    toast({ title: "Pénznem törölve" }); fetchData();
  };

  const updateRate = async (id: string, rate: number) => {
    await supabase.from("currency_settings").update({ exchange_rate: rate }).eq("id", id);
    fetchData();
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Globe className="w-5 h-5" /><h2 className="font-bold text-lg">Pénznemek kezelése</h2></div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Új pénznem</Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Kód (pl. EUR)</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} maxLength={3} /></div>
            <div><Label>Szimbólum</Label><Input value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} placeholder="€" /></div>
            <div><Label>Név</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Euró" /></div>
            <div><Label>Árfolyam (HUF-hoz)</Label><Input type="number" step="0.01" value={form.exchange_rate} onChange={e => setForm({ ...form, exchange_rate: Number(e.target.value) })} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addCurrency}>Hozzáadás</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Mégse</Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kód</TableHead><TableHead>Szimbólum</TableHead><TableHead>Név</TableHead>
            <TableHead>Árfolyam</TableHead><TableHead>Alapért.</TableHead><TableHead>Aktív</TableHead><TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currencies.map(c => (
            <TableRow key={c.id}>
              <TableCell className="font-mono font-bold">{c.code}</TableCell>
              <TableCell>{c.symbol}</TableCell>
              <TableCell>{c.name}</TableCell>
              <TableCell>
                <Input type="number" step="0.01" className="w-24 h-8 text-xs" defaultValue={c.exchange_rate}
                  onBlur={e => { const v = Number(e.target.value); if (v !== c.exchange_rate) updateRate(c.id, v); }} />
              </TableCell>
              <TableCell>
                {c.is_default ? <Badge>Alapértelmezett</Badge> : <Button variant="ghost" size="sm" onClick={() => setDefault(c.id)}><Star className="w-3 h-3" /></Button>}
              </TableCell>
              <TableCell><Switch checked={c.is_active} onCheckedChange={v => toggleActive(c.id, v)} /></TableCell>
              <TableCell>{!c.is_default && <Button variant="ghost" size="icon" onClick={() => deleteCurrency(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {currencies.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek pénznemek. Adj hozzá egyet (pl. HUF).</p>}
    </div>
  );
};

export default AdminCurrencyTab;
