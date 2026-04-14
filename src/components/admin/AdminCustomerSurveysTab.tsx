import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, ClipboardList, Clock, Plus, Trash2 } from "lucide-react";

interface Survey {
  name: string;
  trigger: string;
  delay_hours: number;
  questions_count: number;
  enabled: boolean;
}

const AdminCustomerSurveysTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    surveys: [
      { name: "Vásárlás utáni elégedettség", trigger: "post_purchase", delay_hours: 48, questions_count: 5, enabled: true },
      { name: "Szállítási élmény", trigger: "delivery", delay_hours: 24, questions_count: 3, enabled: true },
      { name: "Weboldal használat", trigger: "periodic", delay_hours: 720, questions_count: 8, enabled: false },
    ] as Survey[],
    incentive_enabled: true,
    incentive_type: "points",
    incentive_amount: 50,
    max_surveys_per_month: 2,
    anonymous_allowed: false,
    show_results_to_customers: false,
    reminder_enabled: true,
    reminder_after_hours: 72,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("customer_surveys_enabled, customer_surveys_settings").limit(1).single();
      if (data) {
        setEnabled(data.customer_surveys_enabled ?? false);
        if (data.customer_surveys_settings && typeof data.customer_surveys_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.customer_surveys_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      customer_surveys_enabled: enabled,
      customer_surveys_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Kérdőív beállítások mentve!" });
    setSaving(false);
  };

  const addSurvey = () => {
    setSettings({ ...settings, surveys: [...settings.surveys, { name: "", trigger: "custom", delay_hours: 0, questions_count: 3, enabled: false }] });
  };

  const removeSurvey = (idx: number) => {
    setSettings({ ...settings, surveys: settings.surveys.filter((_, i) => i !== idx) });
  };

  const updateSurvey = (idx: number, field: keyof Survey, value: any) => {
    const updated = [...settings.surveys];
    (updated[idx] as any)[field] = value;
    setSettings({ ...settings, surveys: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><ClipboardList className="w-5 h-5 text-accent" /> Vásárlói kérdőívek</h2>
          <p className="text-sm text-muted-foreground">Elégedettségi felmérések és visszajelzés gyűjtés</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="border border-border rounded p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Max kérdőív / hónap / vásárló</Label>
            <Input type="number" min={1} value={settings.max_surveys_per_month} onChange={(e) => setSettings({ ...settings, max_surveys_per_month: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={settings.anonymous_allowed} onCheckedChange={(v) => setSettings({ ...settings, anonymous_allowed: v })} />
              <Label className="text-sm">Anonim kitöltés</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.show_results_to_customers} onCheckedChange={(v) => setSettings({ ...settings, show_results_to_customers: v })} />
              <Label className="text-sm">Eredmények megjelenítése</Label>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={settings.incentive_enabled} onCheckedChange={(v) => setSettings({ ...settings, incentive_enabled: v })} />
          <Label className="text-sm">Kitöltési ösztönző</Label>
        </div>
        {settings.incentive_enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Típus</Label>
              <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={settings.incentive_type} onChange={(e) => setSettings({ ...settings, incentive_type: e.target.value })}>
                <option value="points">Hűségpont</option>
                <option value="discount">Kedvezmény kód</option>
                <option value="shipping">Ingyenes szállítás</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Összeg / pont</Label>
              <Input type="number" min={0} value={settings.incentive_amount} onChange={(e) => setSettings({ ...settings, incentive_amount: Number(e.target.value) })} />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch checked={settings.reminder_enabled} onCheckedChange={(v) => setSettings({ ...settings, reminder_enabled: v })} />
          <Label className="text-sm">Emlékeztető küldése</Label>
        </div>
        {settings.reminder_enabled && (
          <div>
            <Label className="text-xs text-muted-foreground">Emlékeztető után (óra)</Label>
            <Input type="number" min={1} value={settings.reminder_after_hours} onChange={(e) => setSettings({ ...settings, reminder_after_hours: Number(e.target.value) })} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Kérdőívek</h3>
          <Button size="sm" variant="outline" onClick={addSurvey} className="gap-1"><Plus className="w-3 h-3" /> Új</Button>
        </div>
        {settings.surveys.map((s, idx) => (
          <div key={idx} className="border border-border rounded p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Input placeholder="Név" value={s.name} onChange={(e) => updateSurvey(idx, "name", e.target.value)} className="text-sm flex-1" />
              <Switch checked={s.enabled} onCheckedChange={(v) => updateSurvey(idx, "enabled", v)} />
              <Button size="sm" variant="ghost" onClick={() => removeSurvey(idx)}><Trash2 className="w-3 h-3" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Trigger</Label>
                <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={s.trigger} onChange={(e) => updateSurvey(idx, "trigger", e.target.value)}>
                  <option value="post_purchase">Vásárlás után</option>
                  <option value="delivery">Szállítás után</option>
                  <option value="return">Visszaküldés után</option>
                  <option value="periodic">Időszakos</option>
                  <option value="custom">Egyéni</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Késleltetés (óra)</Label>
                <Input type="number" min={0} value={s.delay_hours} onChange={(e) => updateSurvey(idx, "delay_hours", Number(e.target.value))} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Kérdések száma</Label>
                <Input type="number" min={1} value={s.questions_count} onChange={(e) => updateSurvey(idx, "questions_count", Number(e.target.value))} className="text-sm" />
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

export default AdminCustomerSurveysTab;
