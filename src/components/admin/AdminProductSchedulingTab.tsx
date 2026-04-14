import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Calendar, Archive, Leaf } from "lucide-react";

const AdminProductSchedulingTab = () => {
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
      product_scheduling_enabled: settings.product_scheduling_enabled,
      product_auto_archive_days: settings.product_auto_archive_days,
      product_seasonal_enabled: settings.product_seasonal_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Termék ütemezés beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Termék ütemezés / Archiválás</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Calendar className="h-4 w-4 text-accent" /> Ütemezett publikálás
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Engedélyezés</Label>
            <Switch checked={settings.product_scheduling_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, product_scheduling_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Termékek megjelenítése előre beállított dátumra ütemezhető.</p>
        </div>

        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Leaf className="h-4 w-4 text-accent" /> Szezonális megjelenítés
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Engedélyezés</Label>
            <Switch checked={settings.product_seasonal_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, product_seasonal_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">Termékek automatikusan megjelennek/eltűnnek szezon alapján.</p>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Archive className="h-4 w-4 text-accent" /> Automatikus archiválás
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Archiválás X nap inaktivitás után (0 = kikapcsolva)</Label>
          <Input type="number" min={0} value={settings.product_auto_archive_days ?? 0} onChange={e => setSettings({ ...settings, product_auto_archive_days: parseInt(e.target.value) || 0 })} className="rounded-none mt-1 max-w-xs" />
          <p className="text-xs text-muted-foreground mt-1">Ha egy terméknek nincs rendelése ennyi napig, automatikusan archiválódik.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminProductSchedulingTab;
