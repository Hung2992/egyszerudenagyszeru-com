import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Receipt, FileDown, Percent } from "lucide-react";

const AdminAccountingTab = () => {
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
      accounting_vat_rate: settings.accounting_vat_rate,
      accounting_invoice_prefix: settings.accounting_invoice_prefix,
      accounting_auto_invoice: settings.accounting_auto_invoice,
      accounting_export_format: settings.accounting_export_format,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Számviteli beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Számviteli / Könyvelési beállítások</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Percent className="h-4 w-4 text-accent" /> ÁFA beállítás
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">ÁFA kulcs (%)</Label>
            <Input type="number" min={0} max={100} value={settings.accounting_vat_rate ?? 27} onChange={e => setSettings({ ...settings, accounting_vat_rate: parseFloat(e.target.value) || 0 })} className="rounded-none mt-1 max-w-xs" />
            <p className="text-xs text-muted-foreground mt-1">Alapértelmezett ÁFA kulcs a számlázáshoz.</p>
          </div>
        </div>

        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Receipt className="h-4 w-4 text-accent" /> Számla beállítások
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Számla prefix</Label>
            <Input value={settings.accounting_invoice_prefix ?? "INV-"} onChange={e => setSettings({ ...settings, accounting_invoice_prefix: e.target.value })} className="rounded-none mt-1 max-w-xs" />
            <p className="text-xs text-muted-foreground mt-1">Számlaszám előtag (pl. INV-, SZ-).</p>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Automatikus számlakiállítás</Label>
            <Switch checked={settings.accounting_auto_invoice ?? false} onCheckedChange={v => setSettings({ ...settings, accounting_auto_invoice: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Rendelés után automatikusan generálódik a számla.</p>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <FileDown className="h-4 w-4 text-accent" /> Export formátum
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Könyvelési export formátum</Label>
          <select
            value={settings.accounting_export_format ?? "csv"}
            onChange={e => setSettings({ ...settings, accounting_export_format: e.target.value })}
            className="flex h-10 w-full max-w-xs rounded-none border border-input bg-background px-3 py-2 text-sm mt-1"
          >
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
            <option value="xml">XML (NAV)</option>
            <option value="json">JSON</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">Milyen formátumban exportálódjanak a könyvelési adatok.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminAccountingTab;
