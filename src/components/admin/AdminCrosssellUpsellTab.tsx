import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, TrendingUp, ShoppingCart, Eye, Layers } from "lucide-react";

const AdminCrosssellUpsellTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    upsell_enabled: true,
    crosssell_enabled: true,
    show_on_product_page: true,
    show_on_cart_page: true,
    show_on_checkout: false,
    show_after_purchase: true,
    max_recommendations: 4,
    algorithm: "related_category",
    upsell_price_range_percent: 30,
    crosssell_discount_percent: 0,
    bundle_discount_enabled: true,
    bundle_discount_percent: 10,
    frequently_bought_together: true,
    recently_viewed: true,
    personalized: false,
    a_b_test_enabled: false,
    heading_upsell: "Esetleg érdekelhet még",
    heading_crosssell: "Mások ezt is megvették",
    heading_bundle: "Vedd meg együtt és spórolj!",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("crosssell_upsell_enabled, crosssell_upsell_settings").limit(1).single();
      if (data) {
        setEnabled(data.crosssell_upsell_enabled ?? false);
        if (data.crosssell_upsell_settings && typeof data.crosssell_upsell_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.crosssell_upsell_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      crosssell_upsell_enabled: enabled,
      crosssell_upsell_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Cross-sell & upsell beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><TrendingUp className="w-5 h-5 text-accent" /> Cross-sell & Upsell</h2>
          <p className="text-sm text-muted-foreground">Ajánlott termékek, kiegészítők és csomagajánlatok</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Típusok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.upsell_enabled} onCheckedChange={(v) => setSettings({ ...settings, upsell_enabled: v })} />
            <Label className="text-sm">Upsell (drágább alternatíva)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.crosssell_enabled} onCheckedChange={(v) => setSettings({ ...settings, crosssell_enabled: v })} />
            <Label className="text-sm">Cross-sell (kiegészítő termék)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.frequently_bought_together} onCheckedChange={(v) => setSettings({ ...settings, frequently_bought_together: v })} />
            <Label className="text-sm">Gyakran együtt vásárolt</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.recently_viewed} onCheckedChange={(v) => setSettings({ ...settings, recently_viewed: v })} />
            <Label className="text-sm">Nemrég megtekintett</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.personalized} onCheckedChange={(v) => setSettings({ ...settings, personalized: v })} />
            <Label className="text-sm">Személyre szabott ajánlás</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Algoritmus</Label>
            <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={settings.algorithm} onChange={(e) => setSettings({ ...settings, algorithm: e.target.value })}>
              <option value="related_category">Kapcsolódó kategória</option>
              <option value="purchase_history">Vásárlási előzmény</option>
              <option value="collaborative">Kollaboratív szűrés</option>
              <option value="manual">Manuális</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max ajánlott termékek</Label>
            <Input type="number" min={1} max={12} value={settings.max_recommendations} onChange={(e) => setSettings({ ...settings, max_recommendations: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Upsell ár tartomány (%)</Label>
            <Input type="number" min={0} max={100} value={settings.upsell_price_range_percent} onChange={(e) => setSettings({ ...settings, upsell_price_range_percent: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Eye className="w-4 h-4" /> Megjelenítés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_on_product_page} onCheckedChange={(v) => setSettings({ ...settings, show_on_product_page: v })} />
            <Label className="text-sm">Terméklapon</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_on_cart_page} onCheckedChange={(v) => setSettings({ ...settings, show_on_cart_page: v })} />
            <Label className="text-sm">Kosár oldalon</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_on_checkout} onCheckedChange={(v) => setSettings({ ...settings, show_on_checkout: v })} />
            <Label className="text-sm">Pénztárnál</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_after_purchase} onCheckedChange={(v) => setSettings({ ...settings, show_after_purchase: v })} />
            <Label className="text-sm">Vásárlás után</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Upsell címsor</Label>
            <Input value={settings.heading_upsell} onChange={(e) => setSettings({ ...settings, heading_upsell: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cross-sell címsor</Label>
            <Input value={settings.heading_crosssell} onChange={(e) => setSettings({ ...settings, heading_crosssell: e.target.value })} />
          </div>

          <h3 className="font-semibold text-foreground flex items-center gap-2 mt-4"><Layers className="w-4 h-4" /> Csomagajánlat</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.bundle_discount_enabled} onCheckedChange={(v) => setSettings({ ...settings, bundle_discount_enabled: v })} />
            <Label className="text-sm">Csomag kedvezmény</Label>
          </div>
          {settings.bundle_discount_enabled && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Kedvezmény (%)</Label>
                <Input type="number" min={0} max={50} value={settings.bundle_discount_percent} onChange={(e) => setSettings({ ...settings, bundle_discount_percent: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Csomag címsor</Label>
                <Input value={settings.heading_bundle} onChange={(e) => setSettings({ ...settings, heading_bundle: e.target.value })} />
              </div>
            </>
          )}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminCrosssellUpsellTab;
