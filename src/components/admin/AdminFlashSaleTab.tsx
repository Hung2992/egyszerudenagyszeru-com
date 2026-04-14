import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Zap, Clock, Percent } from "lucide-react";

const AdminFlashSaleTab = () => {
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
      flash_sale_enabled: settings.flash_sale_enabled,
      flash_sale_rules: settings.flash_sale_rules,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Flash sale beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const rules = Array.isArray(settings.flash_sale_rules) ? settings.flash_sale_rules : [];

  const addRule = () => {
    setSettings({ ...settings, flash_sale_rules: [...rules, { name: "", discount_percent: 20, start_date: "", end_date: "", categories: "", is_active: false }] });
  };

  const updateRule = (idx: number, field: string, value: any) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, flash_sale_rules: updated });
  };

  const removeRule = (idx: number) => {
    setSettings({ ...settings, flash_sale_rules: rules.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Időzített akciók / Flash Sale</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Zap className="h-4 w-4 text-accent" /> Flash Sale rendszer
          </div>
          <Switch checked={settings.flash_sale_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, flash_sale_enabled: v })} />
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Clock className="h-4 w-4 text-accent" /> Időzített akciók
          </div>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addRule}>+ Új akció</Button>
        </div>
        {rules.length === 0 && <p className="text-xs text-muted-foreground">Nincs beállított akció.</p>}
        {rules.map((r: any, i: number) => (
          <div key={i} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <Input placeholder="Akció neve" value={r.name || ""} onChange={e => updateRule(i, "name", e.target.value)} className="rounded-none text-xs max-w-xs" />
              <button onClick={() => removeRule(i)} className="text-xs text-muted-foreground hover:text-foreground">Törlés</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-xs uppercase tracking-wider flex items-center gap-1"><Percent className="h-3 w-3" /> Kedvezmény %</Label>
                <Input type="number" min={1} max={99} value={r.discount_percent ?? 20} onChange={e => updateRule(i, "discount_percent", parseInt(e.target.value) || 0)} className="rounded-none mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Kezdés</Label>
                <Input type="datetime-local" value={r.start_date || ""} onChange={e => updateRule(i, "start_date", e.target.value)} className="rounded-none mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Vége</Label>
                <Input type="datetime-local" value={r.end_date || ""} onChange={e => updateRule(i, "end_date", e.target.value)} className="rounded-none mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Kategóriák</Label>
                <Input value={r.categories || ""} onChange={e => updateRule(i, "categories", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="pl. pólók, nadrágok" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={r.is_active ?? false} onCheckedChange={v => updateRule(i, "is_active", v)} />
              <span className="text-xs text-muted-foreground">Aktív</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminFlashSaleTab;
