import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Trash2, Pencil, Trophy, Award, Target } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: "purchase_count" | "total_spent" | "review_count" | "referral_count";
  requirement_value: number;
  reward_points: number;
  is_active: boolean;
}

interface GamificationSettings {
  points_per_purchase: number;
  points_per_review: number;
  points_per_referral: number;
  point_value_huf: number;
  daily_login_bonus: number;
  streak_multiplier: number;
  badges: Badge[];
}

const REQ_TYPES: Record<string, string> = {
  purchase_count: "Vásárlások száma",
  total_spent: "Összes költés (Ft)",
  review_count: "Vélemények száma",
  referral_count: "Ajánlások száma",
};

const BADGE_ICONS = ["🏆", "⭐", "🔥", "💎", "👑", "🎯", "🚀", "💫", "🎖️", "🏅"];

const defaultGamification: GamificationSettings = {
  points_per_purchase: 100,
  points_per_review: 50,
  points_per_referral: 200,
  point_value_huf: 1,
  daily_login_bonus: 10,
  streak_multiplier: 1.5,
  badges: [],
};

const emptyBadge = (): Badge => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  icon: "🏆",
  requirement_type: "purchase_count",
  requirement_value: 5,
  reward_points: 500,
  is_active: true,
});

const AdminLoyaltyGamificationTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

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
      loyalty_gamification: settings.loyalty_gamification,
      loyalty_badges_enabled: settings.loyalty_badges_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Gamifikáció beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const gamification: GamificationSettings = {
    ...defaultGamification,
    ...(typeof settings.loyalty_gamification === "object" && settings.loyalty_gamification !== null ? settings.loyalty_gamification : {}),
  };

  const updateGamification = (field: string, value: any) => {
    setSettings({ ...settings, loyalty_gamification: { ...gamification, [field]: value } });
  };

  const badges = Array.isArray(gamification.badges) ? gamification.badges : [];

  const addBadge = () => {
    const n = emptyBadge();
    updateGamification("badges", [...badges, n]);
    setEditIdx(badges.length);
  };

  const updateBadge = (idx: number, field: string, value: any) => {
    const updated = [...badges];
    updated[idx] = { ...updated[idx], [field]: value };
    updateGamification("badges", updated);
  };

  const removeBadge = (idx: number) => {
    updateGamification("badges", badges.filter((_, i: number) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Hűségprogram gamifikáció</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Award className="h-4 w-4 text-accent" /> Badge rendszer
          </div>
          <Switch checked={settings.loyalty_badges_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, loyalty_badges_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Jelvények és kitüntetések a vásárlói tevékenység alapján.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Target className="h-4 w-4 text-accent" /> Pontrendszer beállítások
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs uppercase tracking-wider">Pont / vásárlás</Label>
            <Input type="number" value={gamification.points_per_purchase} onChange={e => updateGamification("points_per_purchase", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Pont / vélemény</Label>
            <Input type="number" value={gamification.points_per_review} onChange={e => updateGamification("points_per_review", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Pont / ajánlás</Label>
            <Input type="number" value={gamification.points_per_referral} onChange={e => updateGamification("points_per_referral", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">1 pont = Ft</Label>
            <Input type="number" value={gamification.point_value_huf} onChange={e => updateGamification("point_value_huf", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Napi bejelentkezés bónusz</Label>
            <Input type="number" value={gamification.daily_login_bonus} onChange={e => updateGamification("daily_login_bonus", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Streak szorzó (×)</Label>
            <Input type="number" step="0.1" value={gamification.streak_multiplier} onChange={e => updateGamification("streak_multiplier", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Jelvények ({badges.length})
          </span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addBadge}>
            <Plus className="h-3 w-3 mr-1" /> Új jelvény
          </Button>
        </div>

        {badges.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek jelvények. Adj hozzá egyet!</p>}

        {badges.map((b: Badge, i: number) => (
          <div key={b.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">{b.icon}</span>
                <span className="text-sm font-medium">{b.name || "Névtelen jelvény"}</span>
                <span className="text-xs text-muted-foreground">{REQ_TYPES[b.requirement_type]}: {b.requirement_value}</span>
                <span className="text-xs text-accent font-mono">+{b.reward_points} pt</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeBadge(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {editIdx === i && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Jelvény neve</Label>
                  <Input value={b.name} onChange={e => updateBadge(i, "name", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Ikon</Label>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {BADGE_ICONS.map(icon => (
                      <button key={icon} onClick={() => updateBadge(i, "icon", icon)} className={`text-xl p-1 border ${b.icon === icon ? "border-accent" : "border-transparent"}`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Feltétel típusa</Label>
                  <select value={b.requirement_type} onChange={e => updateBadge(i, "requirement_type", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    {Object.entries(REQ_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Feltétel érték</Label>
                  <Input type="number" value={b.requirement_value} onChange={e => updateBadge(i, "requirement_value", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Jutalom pontok</Label>
                  <Input type="number" value={b.reward_points} onChange={e => updateBadge(i, "reward_points", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider">Aktív</Label>
                  <Switch checked={b.is_active} onCheckedChange={v => updateBadge(i, "is_active", v)} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-wider">Leírás</Label>
                  <Textarea value={b.description} onChange={e => updateBadge(i, "description", e.target.value)} className="rounded-none mt-1 text-xs min-h-[50px]" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLoyaltyGamificationTab;
