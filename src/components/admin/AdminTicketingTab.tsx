import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Headphones, Clock, AlertTriangle } from "lucide-react";

const AdminTicketingTab = () => {
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
      ticketing_enabled: settings.ticketing_enabled,
      ticketing_auto_assign: settings.ticketing_auto_assign,
      ticketing_priorities: settings.ticketing_priorities,
      ticketing_sla_hours: settings.ticketing_sla_hours,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Ticketing beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const priorities = Array.isArray(settings.ticketing_priorities) ? settings.ticketing_priorities : ["alacsony", "közepes", "magas", "sürgős"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Ügyfél Ticketing</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Headphones className="h-4 w-4 text-accent" /> Ticketing rendszer
            </div>
            <Switch checked={settings.ticketing_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, ticketing_enabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Automatikus hozzárendelés</Label>
            <Switch checked={settings.ticketing_auto_assign ?? false} onCheckedChange={v => setSettings({ ...settings, ticketing_auto_assign: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Beérkező ticketek automatikusan a legkevesebb nyitott tickettel rendelkező munkatárshoz kerülnek.</p>
        </div>

        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Clock className="h-4 w-4 text-accent" /> SLA válaszidő
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Maximális válaszidő (óra)</Label>
            <Input type="number" min={1} max={168} value={settings.ticketing_sla_hours ?? 24} onChange={e => setSettings({ ...settings, ticketing_sla_hours: parseInt(e.target.value) || 24 })} className="rounded-none mt-1 max-w-xs" />
          </div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <AlertTriangle className="h-4 w-4 text-accent" /> Prioritási szintek
        </div>
        <div className="flex flex-wrap gap-2">
          {priorities.map((p: string, i: number) => (
            <span key={i} className="border px-3 py-1 text-xs font-medium uppercase tracking-wider">
              {p}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Az ügyfélszolgálati ticketek prioritási szintjei. Módosításhoz frissítsd az adatbázisban.
        </p>
      </div>
    </div>
  );
};

export default AdminTicketingTab;
