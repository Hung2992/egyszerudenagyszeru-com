import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, SmilePlus, Mail, Clock, BarChart3 } from "lucide-react";

const AdminCsatTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_send: true,
    send_after_days: 3,
    send_after_delivery: true,
    survey_type: "stars",
    scale_max: 5,
    follow_up_enabled: true,
    follow_up_threshold: 3,
    follow_up_message: "Sajnáljuk, hogy nem volt tökéletes az élmény! Kérlek, írd le, mit tehetnénk jobban.",
    email_subject: "Hogy tetszett a rendelésed?",
    reminder_enabled: true,
    reminder_after_days: 5,
    incentive_enabled: false,
    incentive_discount_percent: 5,
    collect_nps: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("csat_enabled, csat_settings").limit(1).single();
      if (data) {
        setEnabled(data.csat_enabled ?? false);
        if (data.csat_settings && typeof data.csat_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.csat_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      csat_enabled: enabled,
      csat_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "CSAT beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><SmilePlus className="w-5 h-5 text-accent" /> Ügyfél elégedettség (CSAT)</h2>
          <p className="text-sm text-muted-foreground">Automatikus elégedettségi felmérések küldése és elemzése</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Kiküldés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_send} onCheckedChange={(v) => setSettings({ ...settings, auto_send: v })} />
            <Label className="text-sm">Automatikus küldés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.send_after_delivery} onCheckedChange={(v) => setSettings({ ...settings, send_after_delivery: v })} />
            <Label className="text-sm">Kézbesítés után küldés</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Küldés ennyi nap után</Label>
            <Input type="number" min={1} value={settings.send_after_days} onChange={(e) => setSettings({ ...settings, send_after_days: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">E-mail tárgy</Label>
            <Input value={settings.email_subject} onChange={(e) => setSettings({ ...settings, email_subject: e.target.value })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Felmérés típus</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Típus</Label>
            <select className="w-full border border-border bg-background text-foreground p-2 rounded text-sm" value={settings.survey_type} onChange={(e) => setSettings({ ...settings, survey_type: e.target.value })}>
              <option value="stars">Csillagos (1-5)</option>
              <option value="emoji">Emoji</option>
              <option value="thumbs">👍 / 👎</option>
              <option value="scale">Numerikus skála</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Skála max</Label>
            <Input type="number" min={3} max={10} value={settings.scale_max} onChange={(e) => setSettings({ ...settings, scale_max: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.collect_nps} onCheckedChange={(v) => setSettings({ ...settings, collect_nps: v })} />
            <Label className="text-sm">NPS kérdés is</Label>
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Follow-up & Emlékeztető</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.follow_up_enabled} onCheckedChange={(v) => setSettings({ ...settings, follow_up_enabled: v })} />
            <Label className="text-sm">Negatív follow-up</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Follow-up küszöb (alatta)</Label>
            <Input type="number" min={1} max={5} value={settings.follow_up_threshold} onChange={(e) => setSettings({ ...settings, follow_up_threshold: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Follow-up üzenet</Label>
            <Input value={settings.follow_up_message} onChange={(e) => setSettings({ ...settings, follow_up_message: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.reminder_enabled} onCheckedChange={(v) => setSettings({ ...settings, reminder_enabled: v })} />
            <Label className="text-sm">Emlékeztető küldése</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Emlékeztető napok</Label>
            <Input type="number" min={1} value={settings.reminder_after_days} onChange={(e) => setSettings({ ...settings, reminder_after_days: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">🎁 Ösztönző</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.incentive_enabled} onCheckedChange={(v) => setSettings({ ...settings, incentive_enabled: v })} />
            <Label className="text-sm">Kedvezmény a kitöltésért</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Kedvezmény (%)</Label>
            <Input type="number" min={1} max={50} value={settings.incentive_discount_percent} onChange={(e) => setSettings({ ...settings, incentive_discount_percent: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminCsatTab;
