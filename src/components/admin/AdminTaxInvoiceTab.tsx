import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Receipt, Percent } from "lucide-react";

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  country: string;
  is_default: boolean;
  is_active: boolean;
  applies_to: string;
}

interface InvoiceSettings {
  id: string;
  prefix: string;
  next_number: number;
  company_name: string | null;
  company_address: string | null;
  company_tax_number: string | null;
  company_bank_account: string | null;
  footer_note: string | null;
  auto_generate: boolean;
}

const AdminTaxInvoiceTab = () => {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [taxForm, setTaxForm] = useState({ name: "", rate: 27, country: "HU" });
  const [view, setView] = useState<"tax" | "invoice">("tax");

  const fetchData = async () => {
    const [taxRes, invRes] = await Promise.all([
      supabase.from("tax_rates").select("*").order("rate", { ascending: false }),
      supabase.from("invoice_settings").select("*").limit(1).maybeSingle(),
    ]);
    if (taxRes.data) setTaxRates(taxRes.data as TaxRate[]);
    if (invRes.data) {
      setInvoiceSettings(invRes.data as InvoiceSettings);
    } else {
      const { data } = await supabase.from("invoice_settings").insert({}).select().single();
      if (data) setInvoiceSettings(data as InvoiceSettings);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addTax = async () => {
    if (!taxForm.name.trim()) return;
    const { error } = await supabase.from("tax_rates").insert({ name: taxForm.name, rate: taxForm.rate, country: taxForm.country });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Adókulcs hozzáadva" }); setShowTaxForm(false); setTaxForm({ name: "", rate: 27, country: "HU" }); fetchData(); }
  };

  const toggleTax = async (id: string, active: boolean) => {
    await supabase.from("tax_rates").update({ is_active: !active }).eq("id", id);
    fetchData();
  };

  const setDefault = async (id: string) => {
    await supabase.from("tax_rates").update({ is_default: false }).neq("id", id);
    await supabase.from("tax_rates").update({ is_default: true }).eq("id", id);
    fetchData();
  };

  const deleteTax = async (id: string) => {
    await supabase.from("tax_rates").delete().eq("id", id);
    toast({ title: "Törölve" }); fetchData();
  };

  const saveInvoice = async () => {
    if (!invoiceSettings) return;
    const { error } = await supabase.from("invoice_settings").update({
      prefix: invoiceSettings.prefix,
      next_number: invoiceSettings.next_number,
      company_name: invoiceSettings.company_name,
      company_address: invoiceSettings.company_address,
      company_tax_number: invoiceSettings.company_tax_number,
      company_bank_account: invoiceSettings.company_bank_account,
      footer_note: invoiceSettings.footer_note,
      auto_generate: invoiceSettings.auto_generate,
    }).eq("id", invoiceSettings.id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Számlázási beállítások mentve" });
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Receipt className="w-5 h-5" /><h2 className="font-bold text-lg">Adó & Számlázás</h2></div>
        <div className="flex gap-2">
          <Button variant={view === "tax" ? "default" : "outline"} size="sm" onClick={() => setView("tax")}>Adókulcsok</Button>
          <Button variant={view === "invoice" ? "default" : "outline"} size="sm" onClick={() => setView("invoice")}>Számlázás</Button>
        </div>
      </div>

      {view === "tax" && (
        <div className="space-y-4">
          <Button size="sm" onClick={() => setShowTaxForm(!showTaxForm)}><Plus className="w-4 h-4 mr-1" /> Új adókulcs</Button>
          {showTaxForm && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label>Megnevezés</Label><Input value={taxForm.name} onChange={e => setTaxForm({ ...taxForm, name: e.target.value })} placeholder="pl. Normál ÁFA" /></div>
                <div><Label>Kulcs (%)</Label><Input type="number" value={taxForm.rate} onChange={e => setTaxForm({ ...taxForm, rate: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Ország</Label><Input value={taxForm.country} onChange={e => setTaxForm({ ...taxForm, country: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addTax}>Mentés</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowTaxForm(false)}>Mégse</Button>
              </div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Megnevezés</TableHead>
                <TableHead>Kulcs</TableHead>
                <TableHead>Ország</TableHead>
                <TableHead>Alapértelmezett</TableHead>
                <TableHead>Aktív</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxRates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline"><Percent className="w-3 h-3 mr-1" />{t.rate}%</Badge></TableCell>
                  <TableCell>{t.country}</TableCell>
                  <TableCell>
                    <Button variant={t.is_default ? "default" : "ghost"} size="sm" onClick={() => setDefault(t.id)}>
                      {t.is_default ? "✓ Alapértelmezett" : "Beállítás"}
                    </Button>
                  </TableCell>
                  <TableCell><Switch checked={t.is_active} onCheckedChange={() => toggleTax(t.id, t.is_active)} /></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => deleteTax(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {taxRates.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nincs adókulcs.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      {view === "invoice" && invoiceSettings && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between border rounded-lg p-3">
            <div><p className="font-medium">Automatikus számlagenerálás</p><p className="text-xs text-muted-foreground">Rendelés után automatikusan számla készül</p></div>
            <Switch checked={invoiceSettings.auto_generate} onCheckedChange={v => setInvoiceSettings({ ...invoiceSettings, auto_generate: v })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Számla prefix</Label><Input value={invoiceSettings.prefix} onChange={e => setInvoiceSettings({ ...invoiceSettings, prefix: e.target.value })} /></div>
            <div><Label>Következő sorszám</Label><Input type="number" value={invoiceSettings.next_number} onChange={e => setInvoiceSettings({ ...invoiceSettings, next_number: parseInt(e.target.value) || 1 })} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Cégnév</Label><Input value={invoiceSettings.company_name || ""} onChange={e => setInvoiceSettings({ ...invoiceSettings, company_name: e.target.value })} /></div>
            <div><Label>Adószám</Label><Input value={invoiceSettings.company_tax_number || ""} onChange={e => setInvoiceSettings({ ...invoiceSettings, company_tax_number: e.target.value })} /></div>
          </div>
          <div><Label>Cím</Label><Input value={invoiceSettings.company_address || ""} onChange={e => setInvoiceSettings({ ...invoiceSettings, company_address: e.target.value })} /></div>
          <div><Label>Bankszámlaszám</Label><Input value={invoiceSettings.company_bank_account || ""} onChange={e => setInvoiceSettings({ ...invoiceSettings, company_bank_account: e.target.value })} /></div>
          <div><Label>Számla lábléc</Label><Textarea value={invoiceSettings.footer_note || ""} onChange={e => setInvoiceSettings({ ...invoiceSettings, footer_note: e.target.value })} rows={2} /></div>
          <Button onClick={saveInvoice}><Save className="w-4 h-4 mr-1" /> Mentés</Button>
        </div>
      )}
    </div>
  );
};

export default AdminTaxInvoiceTab;
