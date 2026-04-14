import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, FileText } from "lucide-react";

const AdminInvoiceAutomationTab = () => {
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
      invoice_automation_settings: settings.invoice_automation_settings,
      invoice_automation_enabled: settings.invoice_automation_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Számla automatizálás beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const inv = settings.invoice_automation_settings && typeof settings.invoice_automation_settings === "object" ? settings.invoice_automation_settings : {};
  const updateInv = (field: string, value: any) => {
    setSettings({ ...settings, invoice_automation_settings: { ...inv, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Számla automatizálás</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <FileText className="h-4 w-4 text-accent" /> Auto számlázás
          </div>
          <Switch checked={settings.invoice_automation_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, invoice_automation_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Automatikus számla generálás rendelés teljesítésekor, PDF küldés e-mailben.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Számlaszám formátum</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label className="text-xs uppercase tracking-wider">Prefix</Label><Input value={inv.invoice_prefix ?? "INV-"} onChange={e => updateInv("invoice_prefix", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="INV-" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Következő szám</Label><Input type="number" value={inv.next_number ?? 1} onChange={e => updateInv("next_number", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Számjegyek száma</Label><Input type="number" value={inv.number_digits ?? 6} onChange={e => updateInv("number_digits", Number(e.target.value))} className="rounded-none mt-1 text-xs" min={3} max={10} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Év prefix (pl. 2026-INV)</Label><Switch checked={inv.year_prefix ?? true} onCheckedChange={v => updateInv("year_prefix", v)} /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Generálási szabályok</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Auto generálás fizetéskor</Label><Switch checked={inv.auto_on_payment ?? true} onCheckedChange={v => updateInv("auto_on_payment", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Auto generálás szállításkor</Label><Switch checked={inv.auto_on_shipping ?? false} onCheckedChange={v => updateInv("auto_on_shipping", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">PDF csatolás e-mailhez</Label><Switch checked={inv.attach_pdf ?? true} onCheckedChange={v => updateInv("attach_pdf", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Sztornó számla auto</Label><Switch checked={inv.auto_credit_note ?? false} onCheckedChange={v => updateInv("auto_credit_note", v)} /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">NAV kompatibilitás</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">NAV Online Számla</Label><Switch checked={inv.nav_online ?? false} onCheckedChange={v => updateInv("nav_online", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">NAV technikai felhasználó</Label><Input value={inv.nav_user ?? ""} onChange={e => updateInv("nav_user", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="Technikai felhasználó" /></div>
          <div><Label className="text-xs uppercase tracking-wider">NAV API kulcs</Label><Input value={inv.nav_api_key ?? ""} onChange={e => updateInv("nav_api_key", e.target.value)} className="rounded-none mt-1 text-xs" type="password" placeholder="••••••••" /></div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Külső számlázó</Label>
            <select value={inv.external_provider ?? "none"} onChange={e => updateInv("external_provider", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
              <option value="none">Nincs (saját)</option>
              <option value="billingo">Billingo</option>
              <option value="szamlazz_hu">Számlázz.hu</option>
              <option value="kulcs_soft">Kulcs-Soft</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInvoiceAutomationTab;
