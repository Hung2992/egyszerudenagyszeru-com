import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Mail, Clock, Plus, Trash2 } from "lucide-react";

interface Sequence {
  name: string;
  trigger: string;
  delay_hours: number;
  subject: string;
  enabled: boolean;
}

const AdminEmailSequencesTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    sequences: [
      { name: "Üdvözlő e-mail", trigger: "signup", delay_hours: 0, subject: "Üdvözlünk a boltunkban!", enabled: true },
      { name: "Kosárelhagyás #1", trigger: "cart_abandon", delay_hours: 1, subject: "Elfelejtettél valamit?", enabled: true },
      { name: "Kosárelhagyás #2", trigger: "cart_abandon", delay_hours: 24, subject: "Még mindig vár a kosarad!", enabled: false },
      { name: "Vásárlás utáni", trigger: "purchase", delay_hours: 72, subject: "Hogy tetszik a rendelésed?", enabled: true },
    ] as Sequence[],
    max_emails_per_day: 3,
    unsubscribe_enabled: true,
    track_opens: true,
    track_clicks: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("email_sequences_enabled, email_sequences_settings").limit(1).single();
      if (data) {
        setEnabled(data.email_sequences_enabled ?? false);
        if (data.email_sequences_settings && typeof data.email_sequences_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.email_sequences_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      email_sequences_enabled: enabled,
      email_sequences_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "E-mail szekvencia beállítások mentve!" });
    setSaving(false);
  };

  const addSequence = () => {
    setSettings({ ...settings, sequences: [...settings.sequences, { name: "", trigger: "custom", delay_hours: 0, subject: "", enabled: false }] });
  };

  const removeSequence = (idx: number) => {
    setSettings({ ...settings, sequences: settings.sequences.filter((_, i) => i !== idx) });
  };

  const updateSequence = (idx: number, field: keyof Sequence, value: any) => {
    const updated = [...settings.sequences];
    (updated[idx] as any)[field] = value;
    setSettings({ ...settings, sequences: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Mail className="w-5 h-5 text-accent" /> E-mail szekvenciák</h2>
          <p className="text-sm text-muted-foreground">Automatikus e-mail sorozatok beállítása</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="border border-border rounded p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Max e-mail / nap / felhasználó</Label>
            <Input type="number" min={1} value={settings.max_emails_per_day} onChange={(e) => setSettings({ ...settings, max_emails_per_day: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={settings.unsubscribe_enabled} onCheckedChange={(v) => setSettings({ ...settings, unsubscribe_enabled: v })} />
              <Label className="text-sm">Leiratkozás link</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.track_opens} onCheckedChange={(v) => setSettings({ ...settings, track_opens: v })} />
              <Label className="text-sm">Megnyitás követése</Label>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Szekvenciák</h3>
          <Button size="sm" variant="outline" onClick={addSequence} className="gap-1"><Plus className="w-3 h-3" /> Új</Button>
        </div>
        {settings.sequences.map((seq, idx) => (
          <div key={idx} className="border border-border rounded p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Input placeholder="Név" value={seq.name} onChange={(e) => updateSequence(idx, "name", e.target.value)} className="text-sm flex-1" />
              <Switch checked={seq.enabled} onCheckedChange={(v) => updateSequence(idx, "enabled", v)} />
              <Button size="sm" variant="ghost" onClick={() => removeSequence(idx)}><Trash2 className="w-3 h-3" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Trigger</Label>
                <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={seq.trigger} onChange={(e) => updateSequence(idx, "trigger", e.target.value)}>
                  <option value="signup">Regisztráció</option>
                  <option value="purchase">Vásárlás</option>
                  <option value="cart_abandon">Kosárelhagyás</option>
                  <option value="review">Vélemény</option>
                  <option value="custom">Egyéni</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Késleltetés (óra)</Label>
                <Input type="number" min={0} value={seq.delay_hours} onChange={(e) => updateSequence(idx, "delay_hours", Number(e.target.value))} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tárgy</Label>
                <Input value={seq.subject} onChange={(e) => updateSequence(idx, "subject", e.target.value)} className="text-sm" />
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

export default AdminEmailSequencesTab;
