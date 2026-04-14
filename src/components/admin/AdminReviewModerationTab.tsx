import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, MessageSquare, Shield, ThumbsUp, ThumbsDown, Flag } from "lucide-react";

const AdminReviewModerationTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_approve: false,
    min_rating_auto_approve: 4,
    profanity_filter: true,
    require_purchase: true,
    max_review_length: 2000,
    notify_on_negative: true,
    negative_threshold: 3,
    auto_flag_keywords: ["spam", "fake", "scam"],
    reply_template: "Köszönjük a visszajelzést! Megvizsgáljuk és hamarosan válaszolunk.",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("review_moderation_enabled, review_moderation_settings").limit(1).single();
      if (data) {
        setEnabled(data.review_moderation_enabled ?? false);
        if (data.review_moderation_settings && typeof data.review_moderation_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.review_moderation_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      review_moderation_enabled: enabled,
      review_moderation_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Vélemény moderáció beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><MessageSquare className="w-5 h-5 text-accent" /> Vélemény moderáció</h2>
          <p className="text-sm text-muted-foreground">Vásárlói vélemények moderálása, szűrése és válaszolás</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Automatikus jóváhagyás</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_approve} onCheckedChange={(v) => setSettings({ ...settings, auto_approve: v })} />
            <Label className="text-sm">Vélemények automatikus jóváhagyása</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Min. értékelés auto-jóváhagyáshoz</Label>
            <Input type="number" min={1} max={5} value={settings.min_rating_auto_approve} onChange={(e) => setSettings({ ...settings, min_rating_auto_approve: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Szűrők</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.profanity_filter} onCheckedChange={(v) => setSettings({ ...settings, profanity_filter: v })} />
            <Label className="text-sm">Trágár szavak szűrése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.require_purchase} onCheckedChange={(v) => setSettings({ ...settings, require_purchase: v })} />
            <Label className="text-sm">Csak vásárlók írhatnak véleményt</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max karakter</Label>
            <Input type="number" value={settings.max_review_length} onChange={(e) => setSettings({ ...settings, max_review_length: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ThumbsDown className="w-4 h-4" /> Negatív vélemények</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_on_negative} onCheckedChange={(v) => setSettings({ ...settings, notify_on_negative: v })} />
            <Label className="text-sm">Értesítés negatív véleménynél</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Negatív küszöb (csillag)</Label>
            <Input type="number" min={1} max={5} value={settings.negative_threshold} onChange={(e) => setSettings({ ...settings, negative_threshold: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Flag className="w-4 h-4" /> Automatikus jelölés</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Jelölő kulcsszavak (vesszővel elválasztva)</Label>
            <Input value={settings.auto_flag_keywords.join(", ")} onChange={(e) => setSettings({ ...settings, auto_flag_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Válasz sablon</Label>
            <Input value={settings.reply_template} onChange={(e) => setSettings({ ...settings, reply_template: e.target.value })} />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminReviewModerationTab;
