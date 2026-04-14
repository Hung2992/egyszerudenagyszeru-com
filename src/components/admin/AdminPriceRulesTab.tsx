import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, Pencil, Clock, TrendingDown } from "lucide-react";

interface PriceRule {
  id: string;
  name: string;
  type: "scheduled" | "seasonal" | "competitor";
  adjustment_type: "percent" | "fixed";
  adjustment_value: number;
  category: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const RULE_TYPES: Record<string, string> = { scheduled: "Időzített", seasonal: "Szezonális", competitor: "Versenytárs-alapú" };

const emptyRule = (): PriceRule => ({
  id: crypto.randomUUID(),
  name: "",
  type: "scheduled",
  adjustment_type: "percent",
  adjustment_value: 0,
  category: "",
  start_date: "",
  end_date: "",
  is_active: true,
});

const AdminPriceRulesTab = () => {
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
      price_rules_scheduled: settings.price_rules_scheduled,
      price_rules_seasonal_enabled: settings.price_rules_seasonal_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Árszabály időzítés beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const rules: PriceRule[] = Array.isArray(settings.price_rules_scheduled) ? settings.price_rules_scheduled : [];

  const addRule = () => {
    const n = emptyRule();
    setSettings({ ...settings, price_rules_scheduled: [...rules, n] });
    setEditIdx(rules.length);
  };

  const updateRule = (idx: number, field: string, value: any) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, price_rules_scheduled: updated });
  };

  const removeRule = (idx: number) => {
    setSettings({ ...settings, price_rules_scheduled: rules.filter((_, i) => i !== idx) });
    if (editIdx === idx) setEditIdx(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Árszabály időzítés</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <TrendingDown className="h-4 w-4 text-accent" /> Szezonális árazás
          </div>
          <Switch checked={settings.price_rules_seasonal_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, price_rules_seasonal_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Automatikus szezonális árcsökkentés/emelés engedélyezése.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" /> Árszabályok ({rules.length})
          </span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addRule}>
            <Plus className="h-3 w-3 mr-1" /> Új szabály
          </Button>
        </div>

        {rules.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek időzített árszabályok.</p>}

        {rules.map((r, i) => (
          <div key={r.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.name || "Névtelen szabály"}</span>
                <span className="text-[9px] uppercase tracking-widest border px-1.5 py-0.5">{RULE_TYPES[r.type]}</span>
                <span className="text-xs font-mono text-accent">
                  {r.adjustment_type === "percent" ? `${r.adjustment_value}%` : `${r.adjustment_value} Ft`}
                </span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeRule(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {editIdx === i && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Szabály neve</Label>
                  <Input value={r.name} onChange={e => updateRule(i, "name", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Típus</Label>
                  <select value={r.type} onChange={e => updateRule(i, "type", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    {Object.entries(RULE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Módosítás típusa</Label>
                  <select value={r.adjustment_type} onChange={e => updateRule(i, "adjustment_type", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    <option value="percent">Százalék (%)</option>
                    <option value="fixed">Fix összeg (Ft)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Érték (negatív = csökkentés)</Label>
                  <Input type="number" value={r.adjustment_value} onChange={e => updateRule(i, "adjustment_value", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Kategória (üres = összes)</Label>
                  <Input value={r.category} onChange={e => updateRule(i, "category", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="pl. Pólók" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider">Aktív</Label>
                  <Switch checked={r.is_active} onCheckedChange={v => updateRule(i, "is_active", v)} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Kezdő dátum</Label>
                  <Input type="date" value={r.start_date} onChange={e => updateRule(i, "start_date", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Záró dátum</Label>
                  <Input type="date" value={r.end_date} onChange={e => updateRule(i, "end_date", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPriceRulesTab;
