import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Star } from "lucide-react";

interface ReviewSettings {
  id: string;
  auto_approve: boolean;
  min_word_count: number;
  require_purchase: boolean;
  spam_filter_enabled: boolean;
  banned_words: string[];
  max_reviews_per_product: number;
  allow_anonymous: boolean;
}

const AdminReviewSettingsTab = () => {
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannedWordsText, setBannedWordsText] = useState("");

  const fetchSettings = async () => {
    const { data } = await supabase.from("review_settings").select("*").limit(1).maybeSingle();
    if (data) {
      setSettings(data as ReviewSettings);
      setBannedWordsText((data.banned_words || []).join(", "));
    } else {
      const { data: newData } = await supabase.from("review_settings").insert({}).select().single();
      if (newData) {
        setSettings(newData as ReviewSettings);
        setBannedWordsText("");
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    const banned = bannedWordsText.split(",").map(w => w.trim()).filter(Boolean);
    const { error } = await supabase.from("review_settings").update({
      auto_approve: settings.auto_approve,
      min_word_count: settings.min_word_count,
      require_purchase: settings.require_purchase,
      spam_filter_enabled: settings.spam_filter_enabled,
      banned_words: banned,
      max_reviews_per_product: settings.max_reviews_per_product,
      allow_anonymous: settings.allow_anonymous,
    }).eq("id", settings.id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Beállítások mentve" });
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;
  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2"><Star className="w-5 h-5" /><h2 className="font-bold text-lg">Vélemény moderáció</h2></div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border rounded-lg p-3">
          <div><p className="font-medium">Automatikus jóváhagyás</p><p className="text-xs text-muted-foreground">Új vélemények automatikusan megjelennek</p></div>
          <Switch checked={settings.auto_approve} onCheckedChange={v => setSettings({ ...settings, auto_approve: v })} />
        </div>

        <div className="flex items-center justify-between border rounded-lg p-3">
          <div><p className="font-medium">Vásárlás szükséges</p><p className="text-xs text-muted-foreground">Csak vásárlók írhatnak véleményt</p></div>
          <Switch checked={settings.require_purchase} onCheckedChange={v => setSettings({ ...settings, require_purchase: v })} />
        </div>

        <div className="flex items-center justify-between border rounded-lg p-3">
          <div><p className="font-medium">Spam szűrő</p><p className="text-xs text-muted-foreground">Automatikus spam felismerés</p></div>
          <Switch checked={settings.spam_filter_enabled} onCheckedChange={v => setSettings({ ...settings, spam_filter_enabled: v })} />
        </div>

        <div className="flex items-center justify-between border rounded-lg p-3">
          <div><p className="font-medium">Anonim vélemények engedélyezése</p><p className="text-xs text-muted-foreground">Bejelentkezés nélkül is írható vélemény</p></div>
          <Switch checked={settings.allow_anonymous} onCheckedChange={v => setSettings({ ...settings, allow_anonymous: v })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Minimum szószám</Label>
            <Input type="number" value={settings.min_word_count} onChange={e => setSettings({ ...settings, min_word_count: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Max vélemény / termék / felhasználó</Label>
            <Input type="number" value={settings.max_reviews_per_product} onChange={e => setSettings({ ...settings, max_reviews_per_product: parseInt(e.target.value) || 1 })} />
          </div>
        </div>

        <div>
          <Label>Tiltott szavak (vesszővel elválasztva)</Label>
          <Textarea value={bannedWordsText} onChange={e => setBannedWordsText(e.target.value)} placeholder="spam, reklám, ..." rows={3} />
        </div>
      </div>

      <Button onClick={saveSettings}><Save className="w-4 h-4 mr-1" /> Mentés</Button>
    </div>
  );
};

export default AdminReviewSettingsTab;
