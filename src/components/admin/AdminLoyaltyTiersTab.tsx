import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Crown, Plus, Trash2 } from "lucide-react";

interface LoyaltyTier {
  name: string;
  badge: string;
  min_points: number;
  discount_percent: number;
}

const AdminLoyaltyTiersTab = () => {
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
      loyalty_tiers: settings.loyalty_tiers,
      loyalty_badge_enabled: settings.loyalty_badge_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Hűségszintek frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const tiers: LoyaltyTier[] = Array.isArray(settings.loyalty_tiers) ? settings.loyalty_tiers : [];

  const updateTier = (idx: number, field: string, value: any) => {
    const updated = [...tiers];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, loyalty_tiers: updated });
  };

  const addTier = () => {
    setSettings({ ...settings, loyalty_tiers: [...tiers, { name: "", badge: "⭐", min_points: 0, discount_percent: 0 }] });
  };

  const removeTier = (idx: number) => {
    setSettings({ ...settings, loyalty_tiers: tiers.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Hűségszint szerkesztő</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Crown className="h-4 w-4 text-accent" /> Badge megjelenítés
          </div>
          <Switch checked={settings.loyalty_badge_enabled ?? true} onCheckedChange={v => setSettings({ ...settings, loyalty_badge_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Hűségszint badge megjelenítése a vásárló profiljánál.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Szintek</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addTier}>
            <Plus className="h-3 w-3 mr-1" /> Új szint
          </Button>
        </div>
        {tiers.map((tier, i) => (
          <div key={i} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg">{tier.badge} {tier.name || "Névtelen"}</span>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeTier(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className="text-xs uppercase tracking-wider">Név</Label>
                <Input value={tier.name} onChange={e => updateTier(i, "name", e.target.value)} className="rounded-none mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Badge (emoji)</Label>
                <Input value={tier.badge} onChange={e => updateTier(i, "badge", e.target.value)} className="rounded-none mt-1 text-xs" maxLength={4} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Min. pontszám</Label>
                <Input type="number" min={0} value={tier.min_points} onChange={e => updateTier(i, "min_points", parseInt(e.target.value) || 0)} className="rounded-none mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Kedvezmény %</Label>
                <Input type="number" min={0} max={100} value={tier.discount_percent} onChange={e => updateTier(i, "discount_percent", parseInt(e.target.value) || 0)} className="rounded-none mt-1 text-xs" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLoyaltyTiersTab;
