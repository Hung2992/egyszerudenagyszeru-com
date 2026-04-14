import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Package, Leaf } from "lucide-react";

const MATERIAL_OPTIONS: Record<string, string> = {
  standard: "Standard karton",
  premium: "Prémium doboz",
  eco: "Környezetbarát",
  luxury: "Luxus csomagolás",
};

const AdminPackagingCustomTab = () => {
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
      packaging_custom_settings: settings.packaging_custom_settings,
      packaging_custom_enabled: settings.packaging_custom_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Csomagolás beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const pkg = settings.packaging_custom_settings && typeof settings.packaging_custom_settings === "object" ? settings.packaging_custom_settings : {};
  const updatePkg = (field: string, value: any) => {
    setSettings({ ...settings, packaging_custom_settings: { ...pkg, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Csomagolás testreszabás</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Package className="h-4 w-4 text-accent" /> Egyedi csomagolás
          </div>
          <Switch checked={settings.packaging_custom_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, packaging_custom_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Egyedi csomagolási anyagok, branding és környezetbarát opciók kezelése.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Alapértelmezett csomagolás</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Csomagolási anyag</Label>
            <select value={pkg.default_material ?? "standard"} onChange={e => updatePkg("default_material", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
              {Object.entries(MATERIAL_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Branding matrica</Label><Switch checked={pkg.branding_sticker ?? true} onCheckedChange={v => updatePkg("branding_sticker", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Köszönőkártya</Label><Switch checked={pkg.thank_you_card ?? false} onCheckedChange={v => updatePkg("thank_you_card", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Köszönőkártya szöveg</Label><Input value={pkg.thank_you_text ?? ""} onChange={e => updatePkg("thank_you_text", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="Köszönjük a vásárlást!" /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Leaf className="h-4 w-4" /> Környezetbarát opciók</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Eco csomagolás felajánlás</Label><Switch checked={pkg.eco_option_enabled ?? false} onCheckedChange={v => updatePkg("eco_option_enabled", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Műanyagmentes</Label><Switch checked={pkg.plastic_free ?? false} onCheckedChange={v => updatePkg("plastic_free", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Újrahasznosított anyag</Label><Switch checked={pkg.recycled_material ?? false} onCheckedChange={v => updatePkg("recycled_material", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Eco felár (Ft)</Label><Input type="number" value={pkg.eco_surcharge ?? 0} onChange={e => updatePkg("eco_surcharge", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Branding</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Logó a dobozon</Label><Switch checked={pkg.logo_on_box ?? true} onCheckedChange={v => updatePkg("logo_on_box", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Egyedi ragasztószalag</Label><Switch checked={pkg.custom_tape ?? false} onCheckedChange={v => updatePkg("custom_tape", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Selyempapír</Label><Switch checked={pkg.tissue_paper ?? false} onCheckedChange={v => updatePkg("tissue_paper", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Szalag szín</Label><Input value={pkg.ribbon_color ?? ""} onChange={e => updatePkg("ribbon_color", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="pl. fekete, arany" /></div>
        </div>
      </div>
    </div>
  );
};

export default AdminPackagingCustomTab;
