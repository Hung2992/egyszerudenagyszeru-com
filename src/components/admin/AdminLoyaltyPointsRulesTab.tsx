import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Trophy, Gift, Clock, Zap } from "lucide-react";

const AdminLoyaltyPointsRulesTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    points_per_currency: 1,
    currency_per_point: 10,
    min_redeem_points: 100,
    max_redeem_percent: 50,
    points_expiry_days: 365,
    expiry_enabled: true,
    bonus_events: [
      { event: "Regisztráció", points: 50, enabled: true },
      { event: "Első vásárlás", points: 100, enabled: true },
      { event: "Vélemény írás", points: 20, enabled: true },
      { event: "Születésnap", points: 50, enabled: true },
      { event: "Barát meghívás", points: 30, enabled: false },
    ],
    double_points_enabled: false,
    double_points_categories: "",
    tier_multipliers: [
      { tier: "Bronz", multiplier: 1 },
      { tier: "Ezüst", multiplier: 1.5 },
      { tier: "Arany", multiplier: 2 },
      { tier: "Platina", multiplier: 3 },
    ],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("loyalty_points_rules_enabled, loyalty_points_rules_settings").limit(1).single();
      if (data) {
        setEnabled(data.loyalty_points_rules_enabled ?? false);
        if (data.loyalty_points_rules_settings && typeof data.loyalty_points_rules_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.loyalty_points_rules_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      loyalty_points_rules_enabled: enabled,
      loyalty_points_rules_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Hűségpont szabályok mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-accent" /> Hűségpont szabályok</h2>
          <p className="text-sm text-muted-foreground">Pontgyűjtés, beváltás és bónusz események</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Zap className="w-4 h-4" /> Pontgyűjtés & beváltás</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Pont / 1 Ft vásárlás</Label>
            <Input type="number" min={0} step={0.1} value={settings.points_per_currency} onChange={(e) => setSettings({ ...settings, points_per_currency: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">1 pont értéke (Ft)</Label>
            <Input type="number" min={1} value={settings.currency_per_point} onChange={(e) => setSettings({ ...settings, currency_per_point: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Min. beváltható pont</Label>
            <Input type="number" min={1} value={settings.min_redeem_points} onChange={(e) => setSettings({ ...settings, min_redeem_points: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max beváltás (rendelés %)</Label>
            <Input type="number" min={1} max={100} value={settings.max_redeem_percent} onChange={(e) => setSettings({ ...settings, max_redeem_percent: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.double_points_enabled} onCheckedChange={(v) => setSettings({ ...settings, double_points_enabled: v })} />
            <Label className="text-sm">Dupla pont akció</Label>
          </div>
          {settings.double_points_enabled && (
            <div>
              <Label className="text-xs text-muted-foreground">Dupla pont kategóriák (vesszővel)</Label>
              <Input value={settings.double_points_categories} onChange={(e) => setSettings({ ...settings, double_points_categories: e.target.value })} />
            </div>
          )}
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Lejárat</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.expiry_enabled} onCheckedChange={(v) => setSettings({ ...settings, expiry_enabled: v })} />
            <Label className="text-sm">Pont lejárat engedélyezése</Label>
          </div>
          {settings.expiry_enabled && (
            <div>
              <Label className="text-xs text-muted-foreground">Lejárat (nap)</Label>
              <Input type="number" min={1} value={settings.points_expiry_days} onChange={(e) => setSettings({ ...settings, points_expiry_days: Number(e.target.value) })} />
            </div>
          )}

          <h3 className="font-semibold text-foreground flex items-center gap-2 mt-4"><Gift className="w-4 h-4" /> Bónusz események</h3>
          {settings.bonus_events.map((ev, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Switch checked={ev.enabled} onCheckedChange={(v) => {
                const updated = [...settings.bonus_events];
                updated[idx] = { ...updated[idx], enabled: v };
                setSettings({ ...settings, bonus_events: updated });
              }} />
              <span className="text-sm text-foreground flex-1">{ev.event}</span>
              <Input type="number" min={0} value={ev.points} className="w-20 text-sm" onChange={(e) => {
                const updated = [...settings.bonus_events];
                updated[idx] = { ...updated[idx], points: Number(e.target.value) };
                setSettings({ ...settings, bonus_events: updated });
              }} />
              <span className="text-xs text-muted-foreground">pont</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border rounded p-4 space-y-3">
        <h3 className="font-semibold text-foreground">Szint szorzók</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {settings.tier_multipliers.map((t, idx) => (
            <div key={idx}>
              <Label className="text-xs text-muted-foreground">{t.tier}</Label>
              <Input type="number" min={1} step={0.1} value={t.multiplier} onChange={(e) => {
                const updated = [...settings.tier_multipliers];
                updated[idx] = { ...updated[idx], multiplier: Number(e.target.value) };
                setSettings({ ...settings, tier_multipliers: updated });
              }} />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminLoyaltyPointsRulesTab;
