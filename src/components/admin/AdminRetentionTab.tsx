import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Users, Heart, Mail, Plus, Trash2 } from "lucide-react";

interface WinBackCampaign {
  id: string;
  name: string;
  inactive_days: number;
  discount_pct: number;
  email_subject: string;
  is_active: boolean;
}

const emptyCampaign = (): WinBackCampaign => ({
  id: crypto.randomUUID(), name: "", inactive_days: 60, discount_pct: 10, email_subject: "", is_active: true,
});

const AdminRetentionTab = () => {
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
      retention_enabled: settings.retention_enabled,
      retention_settings: settings.retention_settings,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Visszatérő vásárlók beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const rt = settings.retention_settings && typeof settings.retention_settings === "object" ? settings.retention_settings : {};
  const update = (field: string, value: any) => {
    setSettings({ ...settings, retention_settings: { ...rt, [field]: value } });
  };
  const campaigns: WinBackCampaign[] = Array.isArray(rt.campaigns) ? rt.campaigns : [];

  const updateCampaigns = (newC: WinBackCampaign[]) => {
    setSettings({ ...settings, retention_settings: { ...rt, campaigns: newC } });
  };
  const addCampaign = () => updateCampaigns([...campaigns, emptyCampaign()]);
  const updateCampaign = (idx: number, field: string, value: any) => {
    const updated = [...campaigns]; updated[idx] = { ...updated[idx], [field]: value }; updateCampaigns(updated);
  };
  const removeCampaign = (idx: number) => updateCampaigns(campaigns.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Visszatérő vásárlók</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Users className="h-4 w-4 text-accent" /> Retention rendszer
          </div>
          <Switch checked={settings.retention_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, retention_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">RFM analitika, churn előrejelzés és win-back kampányok kezelése.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Heart className="h-4 w-4 text-accent" /> RFM beállítások
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Churn küszöb (nap)</Label>
            <Input type="number" value={rt.churn_threshold_days ?? 90} onChange={e => update("churn_threshold_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">VIP küszöb (rendelés)</Label>
            <Input type="number" value={rt.vip_order_threshold ?? 5} onChange={e => update("vip_order_threshold", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Inaktivitás figyelmeztetés (nap)</Label>
            <Input type="number" value={rt.inactivity_warning_days ?? 30} onChange={e => update("inactivity_warning_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Auto churn jelölés</Label>
            <Switch checked={rt.auto_churn_flag ?? true} onCheckedChange={v => update("auto_churn_flag", v)} />
          </div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Mail className="h-4 w-4 text-accent" /> Win-back kampányok ({campaigns.length})
          </div>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addCampaign}><Plus className="h-3 w-3 mr-1" /> Új kampány</Button>
        </div>
        {campaigns.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek win-back kampányok.</p>}
        {campaigns.map((c, i) => (
          <div key={c.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <Input placeholder="Kampány neve" value={c.name} onChange={e => updateCampaign(i, "name", e.target.value)} className="rounded-none text-xs max-w-xs" />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeCampaign(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs uppercase tracking-wider">Inaktív napok</Label>
                <Input type="number" value={c.inactive_days} onChange={e => updateCampaign(i, "inactive_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Kedvezmény (%)</Label>
                <Input type="number" value={c.discount_pct} onChange={e => updateCampaign(i, "discount_pct", Number(e.target.value))} className="rounded-none mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">E-mail tárgy</Label>
                <Input value={c.email_subject} onChange={e => updateCampaign(i, "email_subject", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="Hiányoztál!" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={c.is_active} onCheckedChange={v => updateCampaign(i, "is_active", v)} />
              <span className="text-xs text-muted-foreground">Aktív</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRetentionTab;
