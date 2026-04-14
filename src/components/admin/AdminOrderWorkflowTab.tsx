import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, GitBranch, Plus, Trash2, ArrowRight } from "lucide-react";

interface Status {
  name: string;
  color: string;
  auto_next: string;
  auto_after_hours: number;
  notify_customer: boolean;
}

const AdminOrderWorkflowTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    statuses: [
      { name: "Új rendelés", color: "#3B82F6", auto_next: "Feldolgozás alatt", auto_after_hours: 0, notify_customer: true },
      { name: "Feldolgozás alatt", color: "#F59E0B", auto_next: "Csomagolva", auto_after_hours: 24, notify_customer: false },
      { name: "Csomagolva", color: "#8B5CF6", auto_next: "Feladva", auto_after_hours: 0, notify_customer: true },
      { name: "Feladva", color: "#10B981", auto_next: "Kiszállítva", auto_after_hours: 48, notify_customer: true },
      { name: "Kiszállítva", color: "#22C55E", auto_next: "", auto_after_hours: 0, notify_customer: true },
      { name: "Törölve", color: "#EF4444", auto_next: "", auto_after_hours: 0, notify_customer: true },
    ] as Status[],
    auto_transition_enabled: true,
    allow_manual_skip: true,
    require_note_on_cancel: true,
    auto_cancel_unpaid_hours: 48,
    auto_complete_after_delivery_days: 14,
    allow_reopen: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("order_workflow_enabled, order_workflow_settings").limit(1).single();
      if (data) {
        setEnabled(data.order_workflow_enabled ?? false);
        if (data.order_workflow_settings && typeof data.order_workflow_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.order_workflow_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      order_workflow_enabled: enabled,
      order_workflow_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Rendelés workflow beállítások mentve!" });
    setSaving(false);
  };

  const addStatus = () => {
    setSettings({ ...settings, statuses: [...settings.statuses, { name: "", color: "#6B7280", auto_next: "", auto_after_hours: 0, notify_customer: false }] });
  };

  const removeStatus = (idx: number) => {
    setSettings({ ...settings, statuses: settings.statuses.filter((_, i) => i !== idx) });
  };

  const updateStatus = (idx: number, field: keyof Status, value: any) => {
    const updated = [...settings.statuses];
    (updated[idx] as any)[field] = value;
    setSettings({ ...settings, statuses: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><GitBranch className="w-5 h-5 text-accent" /> Rendelés workflow</h2>
          <p className="text-sm text-muted-foreground">Rendelés státuszok és automatikus átmenetek</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="border border-border rounded p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Switch checked={settings.auto_transition_enabled} onCheckedChange={(v) => setSettings({ ...settings, auto_transition_enabled: v })} />
          <Label className="text-sm">Automatikus státusz váltás</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={settings.allow_manual_skip} onCheckedChange={(v) => setSettings({ ...settings, allow_manual_skip: v })} />
          <Label className="text-sm">Kézi státusz átugrás engedélyezése</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={settings.require_note_on_cancel} onCheckedChange={(v) => setSettings({ ...settings, require_note_on_cancel: v })} />
          <Label className="text-sm">Megjegyzés kötelező törléskor</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={settings.allow_reopen} onCheckedChange={(v) => setSettings({ ...settings, allow_reopen: v })} />
          <Label className="text-sm">Lezárt rendelés újranyitása</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Auto törlés fizetetlen (óra, 0=ki)</Label>
            <Input type="number" min={0} value={settings.auto_cancel_unpaid_hours} onChange={(e) => setSettings({ ...settings, auto_cancel_unpaid_hours: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Auto lezárás szállítás után (nap)</Label>
            <Input type="number" min={0} value={settings.auto_complete_after_delivery_days} onChange={(e) => setSettings({ ...settings, auto_complete_after_delivery_days: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Státuszok</h3>
          <Button size="sm" variant="outline" onClick={addStatus} className="gap-1"><Plus className="w-3 h-3" /> Új</Button>
        </div>
        {settings.statuses.map((s, idx) => (
          <div key={idx} className="border border-border rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input type="color" value={s.color} onChange={(e) => updateStatus(idx, "color", e.target.value)} className="w-8 h-8 border-0 p-0 cursor-pointer" />
              <Input placeholder="Státusz neve" value={s.name} onChange={(e) => updateStatus(idx, "name", e.target.value)} className="text-sm flex-1" />
              <div className="flex items-center gap-1">
                <Switch checked={s.notify_customer} onCheckedChange={(v) => updateStatus(idx, "notify_customer", v)} />
                <Label className="text-xs">Értesítés</Label>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeStatus(idx)}><Trash2 className="w-3 h-3" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Következő státusz (auto)</Label>
                <Input value={s.auto_next} onChange={(e) => updateStatus(idx, "auto_next", e.target.value)} className="text-sm" placeholder="Nincs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Auto váltás után (óra, 0=kézi)</Label>
                <Input type="number" min={0} value={s.auto_after_hours} onChange={(e) => updateStatus(idx, "auto_after_hours", Number(e.target.value))} className="text-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminOrderWorkflowTab;
