import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, CreditCard, Clock, Shield } from "lucide-react";

const AdminInstallmentPaymentTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    min_order_amount: 10000,
    max_order_amount: 500000,
    installment_options: [3, 6, 12],
    interest_free_months: 3,
    interest_rate_percent: 0,
    late_fee_percent: 5,
    auto_approve: true,
    auto_approve_max_amount: 100000,
    require_id_verification: false,
    require_credit_check: false,
    allow_early_repayment: true,
    early_repayment_discount: true,
    payment_reminder_days_before: 3,
    auto_cancel_after_missed: 2,
    show_installment_calculator: true,
    show_on_product_page: true,
    show_on_cart: true,
    provider: "internal",
    bnpl_partner_enabled: false,
    bnpl_partner_name: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("installment_payment_enabled, installment_payment_settings").limit(1).single();
      if (data) {
        setEnabled(data.installment_payment_enabled ?? false);
        if (data.installment_payment_settings && typeof data.installment_payment_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.installment_payment_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      installment_payment_enabled: enabled,
      installment_payment_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Részletfizetés beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><CreditCard className="w-5 h-5 text-accent" /> Részletfizetés kezelés</h2>
          <p className="text-sm text-muted-foreground">BNPL opciók, részlet szabályok, limit kezelés</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Részlet opciók</h3>
          <div><Label className="text-xs text-muted-foreground">Min. rendelés összeg (Ft)</Label>
            <Input type="number" min={0} value={settings.min_order_amount} onChange={(e) => setSettings({ ...settings, min_order_amount: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Max. rendelés összeg (Ft)</Label>
            <Input type="number" min={0} value={settings.max_order_amount} onChange={(e) => setSettings({ ...settings, max_order_amount: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Kamatmentes hónapok</Label>
            <Input type="number" min={0} max={24} value={settings.interest_free_months} onChange={(e) => setSettings({ ...settings, interest_free_months: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Kamat (%)</Label>
            <Input type="number" min={0} max={50} value={settings.interest_rate_percent} onChange={(e) => setSettings({ ...settings, interest_rate_percent: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Késedelmi díj (%)</Label>
            <Input type="number" min={0} max={30} value={settings.late_fee_percent} onChange={(e) => setSettings({ ...settings, late_fee_percent: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.allow_early_repayment} onCheckedChange={(v) => setSettings({ ...settings, allow_early_repayment: v })} />
            <Label className="text-sm">Korai visszafizetés engedélyezése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.early_repayment_discount} onCheckedChange={(v) => setSettings({ ...settings, early_repayment_discount: v })} />
            <Label className="text-sm">Kedvezmény korai fizetésért</Label>
          </div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Jóváhagyás & megjelenítés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_approve} onCheckedChange={(v) => setSettings({ ...settings, auto_approve: v })} />
            <Label className="text-sm">Automatikus jóváhagyás</Label>
          </div>
          {settings.auto_approve && (
            <div><Label className="text-xs text-muted-foreground">Auto jóváhagyás limit (Ft)</Label>
              <Input type="number" min={0} value={settings.auto_approve_max_amount} onChange={(e) => setSettings({ ...settings, auto_approve_max_amount: Number(e.target.value) })} /></div>
          )}
          <div><Label className="text-xs text-muted-foreground">Fizetési emlékeztető (nap előtte)</Label>
            <Input type="number" min={1} max={14} value={settings.payment_reminder_days_before} onChange={(e) => setSettings({ ...settings, payment_reminder_days_before: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Törlés ennyi kihagyás után</Label>
            <Input type="number" min={1} max={5} value={settings.auto_cancel_after_missed} onChange={(e) => setSettings({ ...settings, auto_cancel_after_missed: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_installment_calculator} onCheckedChange={(v) => setSettings({ ...settings, show_installment_calculator: v })} />
            <Label className="text-sm">Részlet kalkulátor megjelenítése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_on_product_page} onCheckedChange={(v) => setSettings({ ...settings, show_on_product_page: v })} />
            <Label className="text-sm">Megjelenítés termék oldalon</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_on_cart} onCheckedChange={(v) => setSettings({ ...settings, show_on_cart: v })} />
            <Label className="text-sm">Megjelenítés kosárban</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.bnpl_partner_enabled} onCheckedChange={(v) => setSettings({ ...settings, bnpl_partner_enabled: v })} />
            <Label className="text-sm">BNPL partner integráció</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminInstallmentPaymentTab;
