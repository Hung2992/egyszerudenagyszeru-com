import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, MousePointerClick, Plus, Trash2 } from "lucide-react";

const AdminAttributionTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [newChannel, setNewChannel] = useState("");

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
      attribution_utm_enabled: settings.attribution_utm_enabled,
      attribution_channels: settings.attribution_channels,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Attribution beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const channels: string[] = Array.isArray(settings.attribution_channels) ? settings.attribution_channels : ["web", "mobile", "social"];

  const addChannel = () => {
    if (!newChannel.trim() || channels.includes(newChannel.trim())) return;
    setSettings({ ...settings, attribution_channels: [...channels, newChannel.trim()] });
    setNewChannel("");
  };

  const removeChannel = (ch: string) => {
    setSettings({ ...settings, attribution_channels: channels.filter(c => c !== ch) });
  };

  const channelLabels: Record<string, string> = {
    web: "Web (böngésző)",
    mobile: "Mobil app",
    social: "Közösségi média",
    email: "E-mail kampány",
    affiliate: "Affiliate",
    organic: "Organikus",
    paid: "Fizetett hirdetés",
    referral: "Ajánlás",
    direct: "Közvetlen",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Rendelési csatornák / Attribution</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <MousePointerClick className="h-4 w-4 text-accent" /> UTM paraméter követés
          </div>
          <Switch checked={settings.attribution_utm_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, attribution_utm_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">UTM paraméterek automatikus rögzítése rendeléseknél (utm_source, utm_medium, utm_campaign).</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Követett csatornák</span>
        <div className="flex flex-wrap gap-2">
          {channels.map(ch => (
            <div key={ch} className="border px-3 py-1.5 flex items-center gap-2 text-xs uppercase tracking-wider">
              {channelLabels[ch] || ch}
              <button onClick={() => removeChannel(ch)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input value={newChannel} onChange={e => setNewChannel(e.target.value)} placeholder="Új csatorna neve" className="rounded-none max-w-[200px] text-xs" />
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addChannel}>
            <Plus className="h-3 w-3 mr-1" /> Hozzáadás
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Rendelések forrásának nyomon követéséhez használt csatornák.</p>
      </div>
    </div>
  );
};

export default AdminAttributionTab;
