import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, TrendingUp, BarChart3, Star } from "lucide-react";

const AdminProductRankingTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_ranking: true,
    ranking_factors: {
      sales_weight: 40,
      reviews_weight: 25,
      views_weight: 15,
      conversion_weight: 20,
    },
    trending_enabled: true,
    trending_window_days: 7,
    trending_min_sales: 3,
    new_product_boost: true,
    new_product_boost_days: 14,
    new_product_boost_percent: 20,
    seasonal_adjustment: true,
    low_stock_boost: false,
    low_stock_threshold: 5,
    manual_pin_allowed: true,
    max_pinned_products: 10,
    recalculate_interval_hours: 6,
    show_trending_badge: true,
    show_bestseller_badge: true,
    bestseller_min_sales: 20,
    category_ranking_separate: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("product_ranking_enabled, product_ranking_settings").limit(1).single();
      if (data) {
        setEnabled(data.product_ranking_enabled ?? false);
        if (data.product_ranking_settings && typeof data.product_ranking_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.product_ranking_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      product_ranking_enabled: enabled,
      product_ranking_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Termék rangsorolás beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><TrendingUp className="w-5 h-5 text-accent" /> Termék rangsorolás</h2>
          <p className="text-sm text-muted-foreground">Automatikus rangsorolás, trending lista, bestseller badge-ek</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Rangsorolási súlyok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_ranking} onCheckedChange={(v) => setSettings({ ...settings, auto_ranking: v })} />
            <Label className="text-sm">Automatikus rangsorolás</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Eladás súly (%)</Label>
            <Input type="number" min={0} max={100} value={settings.ranking_factors.sales_weight} onChange={(e) => setSettings({ ...settings, ranking_factors: { ...settings.ranking_factors, sales_weight: Number(e.target.value) } })} /></div>
          <div><Label className="text-xs text-muted-foreground">Értékelés súly (%)</Label>
            <Input type="number" min={0} max={100} value={settings.ranking_factors.reviews_weight} onChange={(e) => setSettings({ ...settings, ranking_factors: { ...settings.ranking_factors, reviews_weight: Number(e.target.value) } })} /></div>
          <div><Label className="text-xs text-muted-foreground">Megtekintés súly (%)</Label>
            <Input type="number" min={0} max={100} value={settings.ranking_factors.views_weight} onChange={(e) => setSettings({ ...settings, ranking_factors: { ...settings.ranking_factors, views_weight: Number(e.target.value) } })} /></div>
          <div><Label className="text-xs text-muted-foreground">Konverzió súly (%)</Label>
            <Input type="number" min={0} max={100} value={settings.ranking_factors.conversion_weight} onChange={(e) => setSettings({ ...settings, ranking_factors: { ...settings.ranking_factors, conversion_weight: Number(e.target.value) } })} /></div>
          <div><Label className="text-xs text-muted-foreground">Újraszámolás (óra)</Label>
            <Input type="number" min={1} max={72} value={settings.recalculate_interval_hours} onChange={(e) => setSettings({ ...settings, recalculate_interval_hours: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.category_ranking_separate} onCheckedChange={(v) => setSettings({ ...settings, category_ranking_separate: v })} />
            <Label className="text-sm">Kategóriánkénti rangsor</Label>
          </div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Star className="w-4 h-4" /> Trending & badge-ek</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.trending_enabled} onCheckedChange={(v) => setSettings({ ...settings, trending_enabled: v })} />
            <Label className="text-sm">Trending lista</Label>
          </div>
          {settings.trending_enabled && (
            <>
              <div><Label className="text-xs text-muted-foreground">Trending ablak (nap)</Label>
                <Input type="number" min={1} max={30} value={settings.trending_window_days} onChange={(e) => setSettings({ ...settings, trending_window_days: Number(e.target.value) })} /></div>
              <div><Label className="text-xs text-muted-foreground">Min. eladás a trendinghez</Label>
                <Input type="number" min={1} max={100} value={settings.trending_min_sales} onChange={(e) => setSettings({ ...settings, trending_min_sales: Number(e.target.value) })} /></div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.new_product_boost} onCheckedChange={(v) => setSettings({ ...settings, new_product_boost: v })} />
            <Label className="text-sm">Új termék kiemelés</Label>
          </div>
          {settings.new_product_boost && (
            <div><Label className="text-xs text-muted-foreground">Kiemelés időtartam (nap)</Label>
              <Input type="number" min={1} max={30} value={settings.new_product_boost_days} onChange={(e) => setSettings({ ...settings, new_product_boost_days: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_trending_badge} onCheckedChange={(v) => setSettings({ ...settings, show_trending_badge: v })} />
            <Label className="text-sm">Trending badge megjelenítése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_bestseller_badge} onCheckedChange={(v) => setSettings({ ...settings, show_bestseller_badge: v })} />
            <Label className="text-sm">Bestseller badge</Label>
          </div>
          {settings.show_bestseller_badge && (
            <div><Label className="text-xs text-muted-foreground">Bestseller min. eladás</Label>
              <Input type="number" min={1} max={1000} value={settings.bestseller_min_sales} onChange={(e) => setSettings({ ...settings, bestseller_min_sales: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.manual_pin_allowed} onCheckedChange={(v) => setSettings({ ...settings, manual_pin_allowed: v })} />
            <Label className="text-sm">Manuális rögzítés engedélyezése</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminProductRankingTab;
