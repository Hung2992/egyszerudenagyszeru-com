import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Gift, Star, Trophy } from "lucide-react";

const AdminLoyaltyRewardsTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    points_per_purchase: 1,
    points_currency_ratio: 100,
    welcome_bonus: 0,
    birthday_bonus: 0,
    referral_bonus: 0,
    review_bonus: 0,
    social_share_bonus: 0,
    double_points_enabled: false,
    double_points_day: "friday",
    multiplier_vip: 2,
    multiplier_gold: 1.5,
    min_redeem_points: 100,
    max_redeem_percent: 50,
    points_expiry_months: 12,
    points_expiry_enabled: true,
    vip_free_shipping: true,
    vip_early_access: true,
    vip_exclusive_products: false,
    gold_threshold: 500,
    vip_threshold: 1000,
    heading: "Hűségprogram jutalmak",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("loyalty_rewards_enabled, loyalty_rewards_settings").limit(1).single();
      if (data) {
        setEnabled(data.loyalty_rewards_enabled ?? false);
        if (data.loyalty_rewards_settings && typeof data.loyalty_rewards_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.loyalty_rewards_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      loyalty_rewards_enabled: enabled,
      loyalty_rewards_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Hűségprogram jutalmak mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-accent" /> Hűségprogram jutalmak</h2>
          <p className="text-sm text-muted-foreground">Pontszorzók, jutalmak, VIP előnyök kezelése</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Star className="w-4 h-4" /> Pont rendszer</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Pont / 1000 Ft vásárlás</Label>
            <Input type="number" min={1} max={100} value={settings.points_per_purchase} onChange={(e) => setSettings({ ...settings, points_per_purchase: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pontérték (Ft/pont)</Label>
            <Input type="number" min={1} max={1000} value={settings.points_currency_ratio} onChange={(e) => setSettings({ ...settings, points_currency_ratio: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Üdvözlő bónusz pont</Label>
            <Input type="number" min={0} value={settings.welcome_bonus} onChange={(e) => setSettings({ ...settings, welcome_bonus: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Születésnapi bónusz pont</Label>
            <Input type="number" min={0} value={settings.birthday_bonus} onChange={(e) => setSettings({ ...settings, birthday_bonus: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ajánlási bónusz pont</Label>
            <Input type="number" min={0} value={settings.referral_bonus} onChange={(e) => setSettings({ ...settings, referral_bonus: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Értékelés bónusz pont</Label>
            <Input type="number" min={0} value={settings.review_bonus} onChange={(e) => setSettings({ ...settings, review_bonus: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Közösségi megosztás bónusz</Label>
            <Input type="number" min={0} value={settings.social_share_bonus} onChange={(e) => setSettings({ ...settings, social_share_bonus: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.double_points_enabled} onCheckedChange={(v) => setSettings({ ...settings, double_points_enabled: v })} />
            <Label className="text-sm">Dupla pont nap</Label>
          </div>
          {settings.double_points_enabled && (
            <div>
              <Label className="text-xs text-muted-foreground">Dupla pont napja</Label>
              <select className="w-full border border-border bg-background text-foreground p-2 rounded text-xs" value={settings.double_points_day} onChange={(e) => setSettings({ ...settings, double_points_day: e.target.value })}>
                <option value="monday">Hétfő</option>
                <option value="tuesday">Kedd</option>
                <option value="wednesday">Szerda</option>
                <option value="thursday">Csütörtök</option>
                <option value="friday">Péntek</option>
                <option value="saturday">Szombat</option>
                <option value="sunday">Vasárnap</option>
              </select>
            </div>
          )}
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Gift className="w-4 h-4" /> VIP előnyök & beváltás</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Min beváltható pont</Label>
            <Input type="number" min={1} value={settings.min_redeem_points} onChange={(e) => setSettings({ ...settings, min_redeem_points: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max beváltás (% rendelésből)</Label>
            <Input type="number" min={1} max={100} value={settings.max_redeem_percent} onChange={(e) => setSettings({ ...settings, max_redeem_percent: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.points_expiry_enabled} onCheckedChange={(v) => setSettings({ ...settings, points_expiry_enabled: v })} />
            <Label className="text-sm">Pontok lejárata</Label>
          </div>
          {settings.points_expiry_enabled && (
            <div>
              <Label className="text-xs text-muted-foreground">Lejárat (hónap)</Label>
              <Input type="number" min={1} max={60} value={settings.points_expiry_months} onChange={(e) => setSettings({ ...settings, points_expiry_months: Number(e.target.value) })} />
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Gold szint küszöb (pont)</Label>
            <Input type="number" min={0} value={settings.gold_threshold} onChange={(e) => setSettings({ ...settings, gold_threshold: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">VIP szint küszöb (pont)</Label>
            <Input type="number" min={0} value={settings.vip_threshold} onChange={(e) => setSettings({ ...settings, vip_threshold: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">VIP szorzó</Label>
            <Input type="number" min={1} max={10} step={0.5} value={settings.multiplier_vip} onChange={(e) => setSettings({ ...settings, multiplier_vip: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Gold szorzó</Label>
            <Input type="number" min={1} max={10} step={0.5} value={settings.multiplier_gold} onChange={(e) => setSettings({ ...settings, multiplier_gold: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.vip_free_shipping} onCheckedChange={(v) => setSettings({ ...settings, vip_free_shipping: v })} />
            <Label className="text-sm">VIP ingyenes szállítás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.vip_early_access} onCheckedChange={(v) => setSettings({ ...settings, vip_early_access: v })} />
            <Label className="text-sm">VIP korai hozzáférés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.vip_exclusive_products} onCheckedChange={(v) => setSettings({ ...settings, vip_exclusive_products: v })} />
            <Label className="text-sm">VIP exkluzív termékek</Label>
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminLoyaltyRewardsTab;
