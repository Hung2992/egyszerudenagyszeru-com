import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Sparkles } from "lucide-react";

const ALGO_OPTIONS: Record<string, string> = {
  collaborative: "Kollaboratív szűrés",
  content_based: "Tartalom alapú",
  hybrid: "Hibrid",
  trending: "Trendi termékek",
  manual: "Manuális szabályok",
};

const WIDGET_POSITIONS: Record<string, string> = {
  product_page: "Termékoldal",
  cart: "Kosár oldal",
  checkout: "Checkout",
  homepage: "Főoldal",
  category: "Kategória oldal",
};

const AdminRecommendationEngineTab = () => {
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
      recommendation_engine_settings: settings.recommendation_engine_settings,
      recommendation_engine_enabled: settings.recommendation_engine_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Termékajánló beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const rec = settings.recommendation_engine_settings && typeof settings.recommendation_engine_settings === "object" ? settings.recommendation_engine_settings : {};
  const updateRec = (field: string, value: any) => {
    setSettings({ ...settings, recommendation_engine_settings: { ...rec, [field]: value } });
  };

  const widgets = rec.widgets && typeof rec.widgets === "object" ? rec.widgets : {};
  const updateWidget = (pos: string, value: boolean) => {
    updateRec("widgets", { ...widgets, [pos]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Termékajánló motor</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-accent" /> Ajánló rendszer
          </div>
          <Switch checked={settings.recommendation_engine_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, recommendation_engine_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Automatikus termékajánlások cross-sell, upsell és "mások is vásárolták" algoritmusokkal.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Algoritmus</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Ajánlási algoritmus</Label>
            <select value={rec.algorithm ?? "hybrid"} onChange={e => updateRec("algorithm", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
              {Object.entries(ALGO_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><Label className="text-xs uppercase tracking-wider">Max ajánlott termékek</Label><Input type="number" value={rec.max_items ?? 6} onChange={e => updateRec("max_items", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Cross-sell engedélyezés</Label><Switch checked={rec.cross_sell ?? true} onCheckedChange={v => updateRec("cross_sell", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Upsell engedélyezés</Label><Switch checked={rec.upsell ?? true} onCheckedChange={v => updateRec("upsell", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">"Mások is nézték"</Label><Switch checked={rec.also_viewed ?? true} onCheckedChange={v => updateRec("also_viewed", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Személyre szabott</Label><Switch checked={rec.personalized ?? false} onCheckedChange={v => updateRec("personalized", v)} /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Widget pozíciók</span>
        <div className="space-y-3">
          {Object.entries(WIDGET_POSITIONS).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider">{label}</Label>
              <Switch checked={widgets[key] ?? key === "product_page"} onCheckedChange={v => updateWidget(key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Megjelenés</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label className="text-xs uppercase tracking-wider">Szekció címe</Label><Input value={rec.section_title ?? "Neked ajánljuk"} onChange={e => updateRec("section_title", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Cross-sell címe</Label><Input value={rec.cross_sell_title ?? "Illik hozzá"} onChange={e => updateRec("cross_sell_title", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Ár megjelenítés</Label><Switch checked={rec.show_price ?? true} onCheckedChange={v => updateRec("show_price", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Értékelés megjelenítés</Label><Switch checked={rec.show_rating ?? true} onCheckedChange={v => updateRec("show_rating", v)} /></div>
        </div>
      </div>
    </div>
  );
};

export default AdminRecommendationEngineTab;
