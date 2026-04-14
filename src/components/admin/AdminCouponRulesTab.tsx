import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Ticket, Shield, Users, Percent } from "lucide-react";

const AdminCouponRulesTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    allow_stacking: false,
    max_stacked_coupons: 1,
    auto_apply_best: true,
    min_order_value: 0,
    max_discount_percent: 100,
    max_discount_amount: 0,
    first_purchase_only: false,
    one_per_customer: true,
    exclude_sale_items: false,
    exclude_categories: "",
    usage_limit_per_coupon: 0,
    usage_limit_per_user: 1,
    require_login: true,
    show_coupon_field: true,
    auto_suggest_coupons: false,
    expiry_warning_days: 3,
    coupon_code_format: "XXXXX-XXXXX",
    case_sensitive: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("coupon_rules_enabled, coupon_rules_settings").limit(1).single();
      if (data) {
        setEnabled(data.coupon_rules_enabled ?? false);
        if (data.coupon_rules_settings && typeof data.coupon_rules_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.coupon_rules_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      coupon_rules_enabled: enabled,
      coupon_rules_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Kupon szabályok mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Ticket className="w-5 h-5 text-accent" /> Kupon szabályrendszer</h2>
          <p className="text-sm text-muted-foreground">Kuponkódok részletes szabályai és korlátozások</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Percent className="w-4 h-4" /> Kedvezmény szabályok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.allow_stacking} onCheckedChange={(v) => setSettings({ ...settings, allow_stacking: v })} />
            <Label className="text-sm">Kuponok kombinálása</Label>
          </div>
          {settings.allow_stacking && (
            <div>
              <Label className="text-xs text-muted-foreground">Max kombinálható kuponok</Label>
              <Input type="number" min={1} value={settings.max_stacked_coupons} onChange={(e) => setSettings({ ...settings, max_stacked_coupons: Number(e.target.value) })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_apply_best} onCheckedChange={(v) => setSettings({ ...settings, auto_apply_best: v })} />
            <Label className="text-sm">Legjobb kupon auto alkalmazás</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Min. rendelésérték (Ft)</Label>
            <Input type="number" min={0} value={settings.min_order_value} onChange={(e) => setSettings({ ...settings, min_order_value: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max kedvezmény (%)</Label>
            <Input type="number" min={1} max={100} value={settings.max_discount_percent} onChange={(e) => setSettings({ ...settings, max_discount_percent: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max kedvezmény összeg (Ft, 0=korlátlan)</Label>
            <Input type="number" min={0} value={settings.max_discount_amount} onChange={(e) => setSettings({ ...settings, max_discount_amount: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.exclude_sale_items} onCheckedChange={(v) => setSettings({ ...settings, exclude_sale_items: v })} />
            <Label className="text-sm">Akciós termékek kizárása</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Kizárt kategóriák (vesszővel)</Label>
            <Input value={settings.exclude_categories} onChange={(e) => setSettings({ ...settings, exclude_categories: e.target.value })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Korlátozások</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.first_purchase_only} onCheckedChange={(v) => setSettings({ ...settings, first_purchase_only: v })} />
            <Label className="text-sm">Csak első vásárlásra</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.one_per_customer} onCheckedChange={(v) => setSettings({ ...settings, one_per_customer: v })} />
            <Label className="text-sm">Egy felhasználó / kupon</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Össz. felhasználási limit (0=korlátlan)</Label>
            <Input type="number" min={0} value={settings.usage_limit_per_coupon} onChange={(e) => setSettings({ ...settings, usage_limit_per_coupon: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.require_login} onCheckedChange={(v) => setSettings({ ...settings, require_login: v })} />
            <Label className="text-sm">Bejelentkezés szükséges</Label>
          </div>

          <h3 className="font-semibold text-foreground flex items-center gap-2 mt-4"><Users className="w-4 h-4" /> Megjelenítés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.show_coupon_field} onCheckedChange={(v) => setSettings({ ...settings, show_coupon_field: v })} />
            <Label className="text-sm">Kupon mező megjelenítése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_suggest_coupons} onCheckedChange={(v) => setSettings({ ...settings, auto_suggest_coupons: v })} />
            <Label className="text-sm">Auto kupon javaslat</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Lejárat figyelmeztetés (nap)</Label>
            <Input type="number" min={1} value={settings.expiry_warning_days} onChange={(e) => setSettings({ ...settings, expiry_warning_days: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Kuponkód formátum</Label>
            <Input value={settings.coupon_code_format} onChange={(e) => setSettings({ ...settings, coupon_code_format: e.target.value })} />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminCouponRulesTab;
