import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Users, Crown, BarChart3 } from "lucide-react";

const AdminCustomerSegmentationTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data);
    };
    fetch();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      segment_vip_min_orders: settings.segment_vip_min_orders,
      segment_vip_min_spend: settings.segment_vip_min_spend,
      segment_rfm_enabled: settings.segment_rfm_enabled,
      segment_custom_rules: settings.segment_custom_rules,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mentve", description: "Ügyfélszegmentáció beállítások frissítve." });
    }
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Ügyfélszegmentáció</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Crown className="h-4 w-4 text-accent" />
            VIP szegmens szabályok
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Minimum rendelésszám VIP-hez</Label>
            <Input type="number" value={settings.segment_vip_min_orders ?? 10} onChange={e => setSettings({ ...settings, segment_vip_min_orders: parseInt(e.target.value) || 0 })} className="rounded-none mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Minimum költés VIP-hez (Ft)</Label>
            <Input type="number" value={settings.segment_vip_min_spend ?? 50000} onChange={e => setSettings({ ...settings, segment_vip_min_spend: parseFloat(e.target.value) || 0 })} className="rounded-none mt-1" />
          </div>
        </div>

        <div className="border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <BarChart3 className="h-4 w-4 text-accent" />
            RFM Analitika
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">RFM elemzés engedélyezése</Label>
            <Switch checked={settings.segment_rfm_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, segment_rfm_enabled: v })} />
          </div>
          <p className="text-xs text-muted-foreground">
            A Recency-Frequency-Monetary elemzés automatikusan kategorizálja a vásárlókat vásárlási szokásaik alapján.
          </p>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Users className="h-4 w-4 text-accent" />
          Szegmens áttekintés
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {[
            { label: "VIP vásárlók", desc: `${settings.segment_vip_min_orders}+ rendelés VAGY ${settings.segment_vip_min_spend} Ft+ költés`, color: "text-yellow-500" },
            { label: "Visszatérő vásárlók", desc: "2+ rendelés, de nem VIP", color: "text-green-500" },
            { label: "Új vásárlók", desc: "1 rendelés vagy regisztráció után", color: "text-blue-500" },
          ].map(s => (
            <div key={s.label} className="border p-3 space-y-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${s.color}`}>{s.label}</span>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerSegmentationTab;
