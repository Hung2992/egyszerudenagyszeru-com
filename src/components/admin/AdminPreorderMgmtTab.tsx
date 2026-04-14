import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, ShoppingCart, Calendar } from "lucide-react";

const AdminPreorderMgmtTab = () => {
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
      preorder_mgmt_settings: settings.preorder_mgmt_settings,
      preorder_mgmt_enabled: settings.preorder_mgmt_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Előrendelés beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const po = settings.preorder_mgmt_settings && typeof settings.preorder_mgmt_settings === "object" ? settings.preorder_mgmt_settings : {};
  const updatePo = (field: string, value: any) => {
    setSettings({ ...settings, preorder_mgmt_settings: { ...po, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Előrendelés menedzsment</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <ShoppingCart className="h-4 w-4 text-accent" /> Előrendelés rendszer
          </div>
          <Switch checked={settings.preorder_mgmt_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, preorder_mgmt_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Vásárlók előrendelhetik a még nem elérhető termékeket, automatikus értesítéssel.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Calendar className="h-4 w-4" /> Előrendelési beállítások</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Előleg kérése</Label><Switch checked={po.require_deposit ?? false} onCheckedChange={v => updatePo("require_deposit", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Előleg mértéke (%)</Label><Input type="number" value={po.deposit_percent ?? 20} onChange={e => updatePo("deposit_percent", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Max előrendelési idő (nap)</Label><Input type="number" value={po.max_preorder_days ?? 90} onChange={e => updatePo("max_preorder_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Várólista engedélyezése</Label><Switch checked={po.waitlist_enabled ?? true} onCheckedChange={v => updatePo("waitlist_enabled", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Auto értesítés elérhetőségkor</Label><Switch checked={po.auto_notify_available ?? true} onCheckedChange={v => updatePo("auto_notify_available", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Korlátozott mennyiség</Label><Switch checked={po.limited_quantity ?? false} onCheckedChange={v => updatePo("limited_quantity", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Max előrendelés/termék</Label><Input type="number" value={po.max_per_product ?? 100} onChange={e => updatePo("max_per_product", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Kedvezmény előrendelésre</Label><Switch checked={po.preorder_discount_enabled ?? false} onCheckedChange={v => updatePo("preorder_discount_enabled", v)} /></div>
          {po.preorder_discount_enabled && (
            <div><Label className="text-xs uppercase tracking-wider">Kedvezmény (%)</Label><Input type="number" value={po.preorder_discount_percent ?? 10} onChange={e => updatePo("preorder_discount_percent", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPreorderMgmtTab;
