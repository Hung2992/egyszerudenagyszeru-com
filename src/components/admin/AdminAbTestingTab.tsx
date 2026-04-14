import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, FlaskConical, BarChart3 } from "lucide-react";

const AdminAbTestingTab = () => {
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
      ab_testing_enabled: settings.ab_testing_enabled,
      ab_tests: settings.ab_tests,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "A/B tesztelés beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const tests = Array.isArray(settings.ab_tests) ? settings.ab_tests : [];

  const addTest = () => {
    setSettings({ ...settings, ab_tests: [...tests, { name: "", variant_a: "", variant_b: "", traffic_split: 50, is_active: false }] });
  };

  const updateTest = (idx: number, field: string, value: any) => {
    const updated = [...tests];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, ab_tests: updated });
  };

  const removeTest = (idx: number) => {
    setSettings({ ...settings, ab_tests: tests.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">A/B Tesztelés</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <FlaskConical className="h-4 w-4 text-accent" /> A/B tesztelés engedélyezése
          </div>
          <Switch checked={settings.ab_testing_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, ab_testing_enabled: v })} />
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <BarChart3 className="h-4 w-4 text-accent" /> Tesztek
          </div>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addTest}>+ Új teszt</Button>
        </div>
        {tests.length === 0 && <p className="text-xs text-muted-foreground">Nincs aktív teszt.</p>}
        {tests.map((t: any, i: number) => (
          <div key={i} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <Input placeholder="Teszt neve" value={t.name || ""} onChange={e => updateTest(i, "name", e.target.value)} className="rounded-none text-xs max-w-xs" />
              <button onClick={() => removeTest(i)} className="text-xs text-muted-foreground hover:text-foreground">Törlés</button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs uppercase tracking-wider">A variáns</Label>
                <Input value={t.variant_a || ""} onChange={e => updateTest(i, "variant_a", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="pl. Kék gomb" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">B variáns</Label>
                <Input value={t.variant_b || ""} onChange={e => updateTest(i, "variant_b", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="pl. Zöld gomb" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Forgalom % (A)</Label>
                <Input type="number" min={0} max={100} value={t.traffic_split ?? 50} onChange={e => updateTest(i, "traffic_split", parseInt(e.target.value) || 50)} className="rounded-none mt-1 text-xs" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={t.is_active ?? false} onCheckedChange={v => updateTest(i, "is_active", v)} />
              <span className="text-xs text-muted-foreground">Aktív</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAbTestingTab;
