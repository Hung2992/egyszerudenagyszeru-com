import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, Pencil, ShieldCheck } from "lucide-react";

interface QaChecklist {
  id: string;
  name: string;
  items: string[];
  required_before_publish: boolean;
  is_active: boolean;
}

const GRADE_OPTIONS: Record<string, string> = { A: "A – Prémium", B: "B – Standard", C: "C – Outlet" };

const emptyChecklist = (): QaChecklist => ({
  id: crypto.randomUUID(), name: "", items: [""], required_before_publish: true, is_active: true,
});

const AdminQualityAssuranceTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

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
      quality_assurance_settings: settings.quality_assurance_settings,
      quality_assurance_enabled: settings.quality_assurance_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Minőségbiztosítás beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const qa = settings.quality_assurance_settings && typeof settings.quality_assurance_settings === "object" ? settings.quality_assurance_settings : {};
  const checklists: QaChecklist[] = Array.isArray(qa.checklists) ? qa.checklists : [];

  const updateQa = (field: string, value: any) => {
    setSettings({ ...settings, quality_assurance_settings: { ...qa, [field]: value } });
  };

  const updateChecklists = (newLists: QaChecklist[]) => updateQa("checklists", newLists);

  const addChecklist = () => {
    const n = emptyChecklist();
    updateChecklists([...checklists, n]);
    setEditIdx(checklists.length);
  };

  const updateChecklist = (idx: number, field: string, value: any) => {
    const updated = [...checklists];
    updated[idx] = { ...updated[idx], [field]: value };
    updateChecklists(updated);
  };

  const removeChecklist = (idx: number) => {
    updateChecklists(checklists.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  };

  const updateItem = (clIdx: number, itemIdx: number, value: string) => {
    const items = [...checklists[clIdx].items];
    items[itemIdx] = value;
    updateChecklist(clIdx, "items", items);
  };

  const addItem = (clIdx: number) => {
    updateChecklist(clIdx, "items", [...checklists[clIdx].items, ""]);
  };

  const removeItem = (clIdx: number, itemIdx: number) => {
    updateChecklist(clIdx, "items", checklists[clIdx].items.filter((_, i) => i !== itemIdx));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Termék minőségbiztosítás</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-accent" /> QA rendszer
          </div>
          <Switch checked={settings.quality_assurance_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, quality_assurance_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Minőségellenőrzési checklist-ek és osztályozás termékek publikálása előtt.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Alapértelmezett minőségi osztály</span>
        <select value={qa.default_grade || "A"} onChange={e => updateQa("default_grade", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
          {Object.entries(GRADE_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex items-center justify-between mt-2">
          <Label className="text-xs uppercase tracking-wider">Selejt auto elrejtés</Label>
          <Switch checked={qa.auto_hide_defective ?? false} onCheckedChange={v => updateQa("auto_hide_defective", v)} />
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Ellenőrzési listák ({checklists.length})</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addChecklist}>
            <Plus className="h-3 w-3 mr-1" /> Új lista
          </Button>
        </div>

        {checklists.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek ellenőrzési listák.</p>}

        {checklists.map((cl, i) => (
          <div key={cl.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{cl.name || "Névtelen lista"}</span>
                <span className="text-xs text-muted-foreground">{cl.items.length} elem</span>
                {cl.required_before_publish && <span className="text-[9px] uppercase tracking-widest border px-1.5 py-0.5 text-yellow-500">Kötelező</span>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeChecklist(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {editIdx === i && (
              <div className="space-y-3">
                <div><Label className="text-xs uppercase tracking-wider">Lista neve</Label><Input value={cl.name} onChange={e => updateChecklist(i, "name", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Kötelező publikálás előtt</Label><Switch checked={cl.required_before_publish} onCheckedChange={v => updateChecklist(i, "required_before_publish", v)} /></div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Ellenőrzési pontok</Label>
                  {cl.items.map((item, ii) => (
                    <div key={ii} className="flex gap-2">
                      <Input value={item} onChange={e => updateItem(i, ii, e.target.value)} className="rounded-none text-xs" placeholder={`${ii + 1}. pont`} />
                      <Button size="sm" variant="ghost" className="h-10 w-10 p-0 shrink-0" onClick={() => removeItem(i, ii)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => addItem(i)}>
                    <Plus className="h-3 w-3 mr-1" /> Pont hozzáadása
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminQualityAssuranceTab;
