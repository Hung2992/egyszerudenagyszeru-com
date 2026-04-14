import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, SmilePlus, BarChart3 } from "lucide-react";

const AdminNpsTab = () => {
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
      nps_settings: settings.nps_settings,
      nps_enabled: settings.nps_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "NPS beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const nps = settings.nps_settings && typeof settings.nps_settings === "object" ? settings.nps_settings : {};
  const updateNps = (field: string, value: any) => {
    setSettings({ ...settings, nps_settings: { ...nps, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Vásárlói elégedettség (NPS)</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <SmilePlus className="h-4 w-4 text-accent" /> NPS rendszer
          </div>
          <Switch checked={settings.nps_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, nps_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Vásárlói elégedettségi kérdőívek küldése, NPS pontszám mérés és riportok.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Kérdőív beállítások</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label className="text-xs uppercase tracking-wider">Küldés késleltetés (nap, kézbesítés után)</Label><Input type="number" value={nps.send_delay_days ?? 3} onChange={e => updateNps("send_delay_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Max kérdőív/vásárló/hónap</Label><Input type="number" value={nps.max_surveys_per_month ?? 1} onChange={e => updateNps("max_surveys_per_month", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Automatikus küldés</Label><Switch checked={nps.auto_send ?? true} onCheckedChange={v => updateNps("auto_send", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Szöveges visszajelzés kérése</Label><Switch checked={nps.ask_text_feedback ?? true} onCheckedChange={v => updateNps("ask_text_feedback", v)} /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Kérdések testreszabása</span>
        <div className="space-y-3">
          <div><Label className="text-xs uppercase tracking-wider">Fő kérdés</Label><Input value={nps.main_question ?? "Mennyire valószínű, hogy ajánlanál minket ismerőseidnek? (0-10)"} onChange={e => updateNps("main_question", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Szöveges kérdés (opcionális)</Label><Input value={nps.text_question ?? "Mi volt a legjobb a vásárlási élményedben?"} onChange={e => updateNps("text_question", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Negatív válasz kérdés (0-6 pont)</Label><Input value={nps.detractor_question ?? "Sajnáljuk! Miben javulhatnánk?"} onChange={e => updateNps("detractor_question", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Riportok</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Heti NPS riport e-mail</Label><Switch checked={nps.weekly_report ?? false} onCheckedChange={v => updateNps("weekly_report", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Riport e-mail cím</Label><Input value={nps.report_email ?? ""} onChange={e => updateNps("report_email", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="admin@webshop.hu" /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Alert alacsony NPS-nél</Label><Switch checked={nps.low_nps_alert ?? true} onCheckedChange={v => updateNps("low_nps_alert", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Alert küszöb (NPS pont)</Label><Input type="number" value={nps.alert_threshold ?? -10} onChange={e => updateNps("alert_threshold", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
        </div>
      </div>
    </div>
  );
};

export default AdminNpsTab;
