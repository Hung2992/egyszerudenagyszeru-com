import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Clock, Zap, CalendarX } from "lucide-react";

const AdminDeliverySlotsTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [newBlockedDay, setNewBlockedDay] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data);
    };
    fetch();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      delivery_slots_enabled: settings.delivery_slots_enabled,
      delivery_slot_duration_min: settings.delivery_slot_duration_min,
      delivery_express_enabled: settings.delivery_express_enabled,
      delivery_express_surcharge: settings.delivery_express_surcharge,
      delivery_blocked_days: settings.delivery_blocked_days,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mentve", description: "Szállítási időablak beállítások frissítve." });
    }
  };

  const addBlockedDay = () => {
    if (!newBlockedDay) return;
    const days = Array.isArray(settings.delivery_blocked_days) ? settings.delivery_blocked_days : [];
    if (!days.includes(newBlockedDay)) {
      setSettings({ ...settings, delivery_blocked_days: [...days, newBlockedDay] });
    }
    setNewBlockedDay("");
  };

  const removeBlockedDay = (day: string) => {
    const days = Array.isArray(settings.delivery_blocked_days) ? settings.delivery_blocked_days : [];
    setSettings({ ...settings, delivery_blocked_days: days.filter((d: string) => d !== day) });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const blockedDays = Array.isArray(settings.delivery_blocked_days) ? settings.delivery_blocked_days : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Szállítási időablak kezelés</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Clock className="h-4 w-4 text-accent" />
            Időablak rendszer
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Időablak választás engedélyezése</Label>
            <Switch checked={settings.delivery_slots_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, delivery_slots_enabled: v })} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Időablak hossza (perc)</Label>
            <Input type="number" min={30} max={480} value={settings.delivery_slot_duration_min ?? 120} onChange={e => setSettings({ ...settings, delivery_slot_duration_min: parseInt(e.target.value) || 120 })} className="rounded-none mt-1" />
          </div>
        </div>

        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Zap className="h-4 w-4 text-accent" />
            Expressz szállítás
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Expressz szállítás engedélyezése</Label>
            <Switch checked={settings.delivery_express_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, delivery_express_enabled: v })} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Expressz felár (Ft)</Label>
            <Input type="number" min={0} value={settings.delivery_express_surcharge ?? 1500} onChange={e => setSettings({ ...settings, delivery_express_surcharge: parseFloat(e.target.value) || 0 })} className="rounded-none mt-1" />
          </div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <CalendarX className="h-4 w-4 text-accent" />
          Blokkolt napok (nem szállítunk)
        </div>
        <div className="flex gap-2">
          <Input type="date" value={newBlockedDay} onChange={e => setNewBlockedDay(e.target.value)} className="rounded-none max-w-xs" />
          <Button size="sm" variant="outline" className="rounded-none" onClick={addBlockedDay}>Hozzáadás</Button>
        </div>
        {blockedDays.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {blockedDays.map((day: string) => (
              <span key={day} className="border px-2 py-1 text-xs flex items-center gap-1">
                {day}
                <button onClick={() => removeBlockedDay(day)} className="text-muted-foreground hover:text-foreground">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDeliverySlotsTab;
