import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Star, Camera, Gift } from "lucide-react";

const AdminReviewRewardsTab = () => {
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
      review_reward_enabled: settings.review_reward_enabled,
      review_reward_points: settings.review_reward_points,
      review_reward_photo_bonus: settings.review_reward_photo_bonus,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Vélemény jutalmazás beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Vélemény jutalmazás</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Gift className="h-4 w-4 text-accent" /> Vélemény jutalmazás engedélyezése
          </div>
          <Switch checked={settings.review_reward_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, review_reward_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Vásárlók hűségpontot kapnak vélemény írásáért.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Star className="h-4 w-4 text-accent" /> Szöveges vélemény jutalom
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Jutalom pontok (szöveges vélemény)</Label>
            <Input type="number" min={0} value={settings.review_reward_points ?? 50} onChange={e => setSettings({ ...settings, review_reward_points: parseInt(e.target.value) || 0 })} className="rounded-none mt-1 max-w-xs" />
          </div>
        </div>

        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Camera className="h-4 w-4 text-accent" /> Fotós vélemény bónusz
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Extra pontok fotó feltöltésért</Label>
            <Input type="number" min={0} value={settings.review_reward_photo_bonus ?? 25} onChange={e => setSettings({ ...settings, review_reward_photo_bonus: parseInt(e.target.value) || 0 })} className="rounded-none mt-1 max-w-xs" />
          </div>
        </div>
      </div>

      <div className="border p-4">
        <p className="text-xs text-muted-foreground">
          Összesen egy fotós véleményért: <span className="font-bold text-foreground">{(settings.review_reward_points ?? 50) + (settings.review_reward_photo_bonus ?? 25)} pont</span>
        </p>
      </div>
    </div>
  );
};

export default AdminReviewRewardsTab;
