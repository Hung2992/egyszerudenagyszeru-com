import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Heart, SlidersHorizontal, Eye } from "lucide-react";

const AdminPersonalizedRecommendationsTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    collaborative_filtering: true,
    content_based: true,
    trending_products: true,
    recently_viewed: true,
    frequently_bought_together: true,
    similar_products: true,
    max_recommendations: 8,
    personalize_homepage: true,
    personalize_product_page: true,
    personalize_cart: true,
    personalize_email: true,
    min_interaction_threshold: 3,
    recency_weight: 0.5,
    popularity_weight: 0.3,
    similarity_weight: 0.2,
    exclude_purchased: true,
    exclude_out_of_stock: true,
    price_range_filter: true,
    price_range_tolerance_percent: 30,
    refresh_interval_hours: 4,
    a_b_test_enabled: false,
    track_click_through: true,
    track_conversion: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("personalized_recommendations_enabled, personalized_recommendations_settings").limit(1).single();
      if (data) {
        setEnabled(data.personalized_recommendations_enabled ?? false);
        if (data.personalized_recommendations_settings && typeof data.personalized_recommendations_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.personalized_recommendations_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      personalized_recommendations_enabled: enabled,
      personalized_recommendations_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Személyre szabott ajánlások beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Heart className="w-5 h-5 text-accent" /> Személyre szabott ajánlások</h2>
          <p className="text-sm text-muted-foreground">Ajánló motor szabályok, kollaboratív szűrés, tartalom alapú ajánlások</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Ajánlási algoritmusok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.collaborative_filtering} onCheckedChange={(v) => setSettings({ ...settings, collaborative_filtering: v })} />
            <Label className="text-sm">Kollaboratív szűrés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.content_based} onCheckedChange={(v) => setSettings({ ...settings, content_based: v })} />
            <Label className="text-sm">Tartalom alapú ajánlás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.trending_products} onCheckedChange={(v) => setSettings({ ...settings, trending_products: v })} />
            <Label className="text-sm">Trendi termékek</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.recently_viewed} onCheckedChange={(v) => setSettings({ ...settings, recently_viewed: v })} />
            <Label className="text-sm">Nemrég megtekintett</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.frequently_bought_together} onCheckedChange={(v) => setSettings({ ...settings, frequently_bought_together: v })} />
            <Label className="text-sm">Gyakran együtt vásárolt</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.similar_products} onCheckedChange={(v) => setSettings({ ...settings, similar_products: v })} />
            <Label className="text-sm">Hasonló termékek</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Max ajánlások száma</Label>
            <Input type="number" min={2} max={20} value={settings.max_recommendations} onChange={(e) => setSettings({ ...settings, max_recommendations: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Min interakció küszöb</Label>
            <Input type="number" min={1} max={20} value={settings.min_interaction_threshold} onChange={(e) => setSettings({ ...settings, min_interaction_threshold: Number(e.target.value) })} /></div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Eye className="w-4 h-4" /> Megjelenítés & szűrés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.personalize_homepage} onCheckedChange={(v) => setSettings({ ...settings, personalize_homepage: v })} />
            <Label className="text-sm">Főoldal személyre szabás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.personalize_product_page} onCheckedChange={(v) => setSettings({ ...settings, personalize_product_page: v })} />
            <Label className="text-sm">Termékoldal ajánlások</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.personalize_cart} onCheckedChange={(v) => setSettings({ ...settings, personalize_cart: v })} />
            <Label className="text-sm">Kosár ajánlások</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.personalize_email} onCheckedChange={(v) => setSettings({ ...settings, personalize_email: v })} />
            <Label className="text-sm">E-mail ajánlások</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.exclude_purchased} onCheckedChange={(v) => setSettings({ ...settings, exclude_purchased: v })} />
            <Label className="text-sm">Vásárolt termékek kizárása</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.exclude_out_of_stock} onCheckedChange={(v) => setSettings({ ...settings, exclude_out_of_stock: v })} />
            <Label className="text-sm">Kifogyott termékek kizárása</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.price_range_filter} onCheckedChange={(v) => setSettings({ ...settings, price_range_filter: v })} />
            <Label className="text-sm">Ársáv szűrés</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Frissítés (óra)</Label>
            <Input type="number" min={1} max={48} value={settings.refresh_interval_hours} onChange={(e) => setSettings({ ...settings, refresh_interval_hours: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.track_click_through} onCheckedChange={(v) => setSettings({ ...settings, track_click_through: v })} />
            <Label className="text-sm">Kattintás követés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.track_conversion} onCheckedChange={(v) => setSettings({ ...settings, track_conversion: v })} />
            <Label className="text-sm">Konverzió követés</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminPersonalizedRecommendationsTab;
