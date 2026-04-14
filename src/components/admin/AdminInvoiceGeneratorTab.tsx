import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, FileText, Receipt, Settings } from "lucide-react";

const AdminInvoiceGeneratorTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_generate: true,
    generate_on_payment: true,
    generate_on_shipping: false,
    invoice_prefix: "INV",
    invoice_number_format: "YYYY-NNNNN",
    next_invoice_number: 1,
    default_currency: "HUF",
    tax_rate: 27,
    include_tax_breakdown: true,
    company_name: "",
    company_address: "",
    company_tax_number: "",
    company_bank_account: "",
    nav_compatible: true,
    pdf_template: "default",
    include_logo: true,
    include_qr_code: false,
    send_email_with_invoice: true,
    payment_due_days: 14,
    late_payment_reminder: true,
    reminder_days: 7,
    credit_note_enabled: true,
    proforma_enabled: true,
    retain_invoices_years: 8,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("invoice_generator_enabled, invoice_generator_settings").limit(1).single();
      if (data) {
        setEnabled(data.invoice_generator_enabled ?? false);
        if (data.invoice_generator_settings && typeof data.invoice_generator_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.invoice_generator_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      invoice_generator_enabled: enabled,
      invoice_generator_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Számla generátor beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><FileText className="w-5 h-5 text-accent" /> Számla generátor</h2>
          <p className="text-sm text-muted-foreground">Automatikus számla PDF generálás, NAV kompatibilis formátum, számlaszám sorozat</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Receipt className="w-4 h-4" /> Számla beállítások</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_generate} onCheckedChange={(v) => setSettings({ ...settings, auto_generate: v })} />
            <Label className="text-sm">Automatikus generálás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.generate_on_payment} onCheckedChange={(v) => setSettings({ ...settings, generate_on_payment: v })} />
            <Label className="text-sm">Generálás fizetéskor</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.nav_compatible} onCheckedChange={(v) => setSettings({ ...settings, nav_compatible: v })} />
            <Label className="text-sm">NAV kompatibilis</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Számla prefix</Label>
            <Input value={settings.invoice_prefix} onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })} /></div>
          <div><Label className="text-xs text-muted-foreground">Számla formátum</Label>
            <Input value={settings.invoice_number_format} onChange={(e) => setSettings({ ...settings, invoice_number_format: e.target.value })} /></div>
          <div><Label className="text-xs text-muted-foreground">ÁFA kulcs (%)</Label>
            <Input type="number" min={0} max={50} value={settings.tax_rate} onChange={(e) => setSettings({ ...settings, tax_rate: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.include_tax_breakdown} onCheckedChange={(v) => setSettings({ ...settings, include_tax_breakdown: v })} />
            <Label className="text-sm">ÁFA bontás</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Fizetési határidő (nap)</Label>
            <Input type="number" min={0} max={90} value={settings.payment_due_days} onChange={(e) => setSettings({ ...settings, payment_due_days: Number(e.target.value) })} /></div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Settings className="w-4 h-4" /> Cégadatok & opciók</h3>
          <div><Label className="text-xs text-muted-foreground">Cégnév</Label>
            <Input value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} /></div>
          <div><Label className="text-xs text-muted-foreground">Cím</Label>
            <Input value={settings.company_address} onChange={(e) => setSettings({ ...settings, company_address: e.target.value })} /></div>
          <div><Label className="text-xs text-muted-foreground">Adószám</Label>
            <Input value={settings.company_tax_number} onChange={(e) => setSettings({ ...settings, company_tax_number: e.target.value })} /></div>
          <div><Label className="text-xs text-muted-foreground">Bankszámlaszám</Label>
            <Input value={settings.company_bank_account} onChange={(e) => setSettings({ ...settings, company_bank_account: e.target.value })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.include_logo} onCheckedChange={(v) => setSettings({ ...settings, include_logo: v })} />
            <Label className="text-sm">Logo a számlán</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.send_email_with_invoice} onCheckedChange={(v) => setSettings({ ...settings, send_email_with_invoice: v })} />
            <Label className="text-sm">E-mail küldés számlával</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.proforma_enabled} onCheckedChange={(v) => setSettings({ ...settings, proforma_enabled: v })} />
            <Label className="text-sm">Díjbekérő engedélyezés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.credit_note_enabled} onCheckedChange={(v) => setSettings({ ...settings, credit_note_enabled: v })} />
            <Label className="text-sm">Sztornó számla</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.late_payment_reminder} onCheckedChange={(v) => setSettings({ ...settings, late_payment_reminder: v })} />
            <Label className="text-sm">Késedelmi emlékeztető</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminInvoiceGeneratorTab;
