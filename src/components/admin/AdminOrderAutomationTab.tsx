import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Zap, Mail, Plus, Trash2 } from "lucide-react";

interface AutoRule {
  id: string;
  name: string;
  trigger_status: string;
  action: string;
  delay_minutes: number;
  is_active: boolean;
}

const emptyRule = (): AutoRule => ({
  id: crypto.randomUUID(), name: "", trigger_status: "paid", action: "send_email", delay_minutes: 0, is_active: true,
});

const STATUS_OPTIONS = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
const ACTION_OPTIONS = [
  { value: "send_email", label: "E-mail küldés" },
  { value: "update_status", label: "Státusz váltás" },
  { value: "notify_admin", label: "Admin értesítés" },
  { value: "create_invoice", label: "Számla generálás" },
  { value: "assign_courier", label: "Futár hozzárendelés" },
];

const AdminOrderAutomationTab = () => {
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
      order_automation_enabled: settings.order_automation_enabled,
      order_automation_settings: settings.order_automation_settings,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Rendelés automatizáció beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const oa = settings.order_automation_settings && typeof settings.order_automation_settings === "object" ? settings.order_automation_settings : {};
  const rules: AutoRule[] = Array.isArray(oa.rules) ? oa.rules : [];

  const updateRules = (newRules: AutoRule[]) => {
    setSettings({ ...settings, order_automation_settings: { ...oa, rules: newRules } });
  };

  const addRule = () => updateRules([...rules, emptyRule()]);
  const updateRule = (idx: number, field: string, value: any) => {
    const updated = [...rules]; updated[idx] = { ...updated[idx], [field]: value }; updateRules(updated);
  };
  const removeRule = (idx: number) => updateRules(rules.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Rendelés automatizáció</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Zap className="h-4 w-4 text-accent" /> Automatizáció engedélyezése
          </div>
          <Switch checked={settings.order_automation_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, order_automation_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Státuszváltás triggerek, automatikus e-mail szabályok és munkafolyamatok.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Szabályok ({rules.length})</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addRule}><Plus className="h-3 w-3 mr-1" /> Új szabály</Button>
        </div>
        {rules.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek automatizációs szabályok.</p>}
        {rules.map((r, i) => (
          <div key={r.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <Input placeholder="Szabály neve" value={r.name} onChange={e => updateRule(i, "name", e.target.value)} className="rounded-none text-xs max-w-xs" />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeRule(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs uppercase tracking-wider">Trigger státusz</Label>
                <select value={r.trigger_status} onChange={e => updateRule(i, "trigger_status", e.target.value)} className="w-full mt-1 border bg-background px-2 py-1.5 text-xs">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Művelet</Label>
                <select value={r.action} onChange={e => updateRule(i, "action", e.target.value)} className="w-full mt-1 border bg-background px-2 py-1.5 text-xs">
                  {ACTION_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Késleltetés (perc)</Label>
                <Input type="number" min={0} value={r.delay_minutes} onChange={e => updateRule(i, "delay_minutes", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={r.is_active} onCheckedChange={v => updateRule(i, "is_active", v)} />
              <span className="text-xs text-muted-foreground">Aktív</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOrderAutomationTab;
