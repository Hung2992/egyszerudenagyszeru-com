import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Package, TrendingUp, ShoppingCart } from "lucide-react";

const AdminProductBundlesTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
      upsell_enabled: settings.upsell_enabled,
      crosssell_enabled: settings.crosssell_enabled,
      bundle_discount_percent: settings.bundle_discount_percent,
      bundle_rules: settings.bundle_rules,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mentve", description: "Termékcsomagok beállítások frissítve." });
    }
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Termékcsomagok / Upsell</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-accent" />
            Upsell beállítások
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Upsell engedélyezése</Label>
            <Switch checked={settings.upsell_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, upsell_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">
            Drágább alternatívák ajánlása a termékoldalakon.
          </p>
        </div>

        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <ShoppingCart className="h-4 w-4 text-accent" />
            Cross-sell beállítások
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Cross-sell engedélyezése</Label>
            <Switch checked={settings.crosssell_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, crosssell_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">
            Kiegészítő termékek ajánlása a kosárban.
          </p>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Package className="h-4 w-4 text-accent" />
          Csomag kedvezmény
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Csomag kedvezmény (%)</Label>
          <Input type="number" min={0} max={100} value={settings.bundle_discount_percent ?? 10} onChange={e => setSettings({ ...settings, bundle_discount_percent: parseFloat(e.target.value) || 0 })} className="rounded-none mt-1 max-w-xs" />
          <p className="text-xs text-muted-foreground mt-1">
            Több termék együttes vásárlásakor automatikusan alkalmazott kedvezmény.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminProductBundlesTab;
