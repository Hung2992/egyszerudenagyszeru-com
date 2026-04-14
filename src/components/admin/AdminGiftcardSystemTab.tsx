import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Gift, CreditCard, Calendar, Palette } from "lucide-react";

const AdminGiftcardSystemTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    denominations: [5000, 10000, 15000, 25000, 50000],
    custom_amount_enabled: true,
    custom_min: 1000,
    custom_max: 100000,
    expiry_months: 12,
    allow_partial_use: true,
    allow_top_up: false,
    digital_delivery: true,
    physical_card: false,
    personalized_message: true,
    max_message_length: 200,
    design_templates: ["Minimál fekete", "Arany elegáns", "Születésnapi", "Karácsonyi"],
    auto_send_on_purchase: true,
    reminder_before_expiry_days: 30,
    code_format: "GIFT-XXXX-XXXX",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("giftcard_system_enabled, giftcard_system_settings").limit(1).single();
      if (data) {
        setEnabled(data.giftcard_system_enabled ?? false);
        if (data.giftcard_system_settings && typeof data.giftcard_system_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.giftcard_system_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      giftcard_system_enabled: enabled,
      giftcard_system_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Ajándékkártya beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Gift className="w-5 h-5 text-accent" /> Ajándékkártya rendszer</h2>
          <p className="text-sm text-muted-foreground">Ajándékkártya sablonok, egyenleg és lejárati szabályok</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><CreditCard className="w-4 h-4" /> Címletek & összeg</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Címletek (Ft, vesszővel)</Label>
            <Input value={settings.denominations.join(", ")} onChange={(e) => setSettings({ ...settings, denominations: e.target.value.split(",").map((s) => Number(s.trim())).filter(Boolean) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.custom_amount_enabled} onCheckedChange={(v) => setSettings({ ...settings, custom_amount_enabled: v })} />
            <Label className="text-sm">Egyéni összeg</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Min (Ft)</Label>
              <Input type="number" value={settings.custom_min} onChange={(e) => setSettings({ ...settings, custom_min: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Max (Ft)</Label>
              <Input type="number" value={settings.custom_max} onChange={(e) => setSettings({ ...settings, custom_max: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Kód formátum</Label>
            <Input value={settings.code_format} onChange={(e) => setSettings({ ...settings, code_format: e.target.value })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Lejárat & használat</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Lejárat (hónap)</Label>
            <Input type="number" min={1} value={settings.expiry_months} onChange={(e) => setSettings({ ...settings, expiry_months: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.allow_partial_use} onCheckedChange={(v) => setSettings({ ...settings, allow_partial_use: v })} />
            <Label className="text-sm">Részleges felhasználás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.allow_top_up} onCheckedChange={(v) => setSettings({ ...settings, allow_top_up: v })} />
            <Label className="text-sm">Feltöltés engedélyezése</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Emlékeztető lejárat előtt (nap)</Label>
            <Input type="number" min={0} value={settings.reminder_before_expiry_days} onChange={(e) => setSettings({ ...settings, reminder_before_expiry_days: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Palette className="w-4 h-4" /> Kézbesítés & design</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.digital_delivery} onCheckedChange={(v) => setSettings({ ...settings, digital_delivery: v })} />
            <Label className="text-sm">Digitális kézbesítés (e-mail)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.physical_card} onCheckedChange={(v) => setSettings({ ...settings, physical_card: v })} />
            <Label className="text-sm">Fizikai kártya</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.personalized_message} onCheckedChange={(v) => setSettings({ ...settings, personalized_message: v })} />
            <Label className="text-sm">Személyes üzenet</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Design sablonok (vesszővel)</Label>
            <Input value={settings.design_templates.join(", ")} onChange={(e) => setSettings({ ...settings, design_templates: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_send_on_purchase} onCheckedChange={(v) => setSettings({ ...settings, auto_send_on_purchase: v })} />
            <Label className="text-sm">Automatikus küldés vásárláskor</Label>
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminGiftcardSystemTab;
