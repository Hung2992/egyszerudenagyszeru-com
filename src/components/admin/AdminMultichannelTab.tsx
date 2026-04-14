import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Globe, RefreshCw } from "lucide-react";

interface ChannelConfig {
  name: string;
  enabled: boolean;
  api_key: string;
  store_id: string;
  sync_inventory: boolean;
  sync_orders: boolean;
  sync_prices: boolean;
  last_sync: string;
}

const DEFAULT_CHANNELS: ChannelConfig[] = [
  { name: "Amazon", enabled: false, api_key: "", store_id: "", sync_inventory: true, sync_orders: true, sync_prices: true, last_sync: "" },
  { name: "eBay", enabled: false, api_key: "", store_id: "", sync_inventory: true, sync_orders: true, sync_prices: false, last_sync: "" },
  { name: "Etsy", enabled: false, api_key: "", store_id: "", sync_inventory: true, sync_orders: true, sync_prices: true, last_sync: "" },
  { name: "Facebook Shop", enabled: false, api_key: "", store_id: "", sync_inventory: true, sync_orders: false, sync_prices: true, last_sync: "" },
];

const AdminMultichannelTab = () => {
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
      multichannel_settings: settings.multichannel_settings,
      multichannel_enabled: settings.multichannel_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Többcsatornás értékesítés beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const channels: ChannelConfig[] = Array.isArray(settings.multichannel_settings?.channels)
    ? settings.multichannel_settings.channels : DEFAULT_CHANNELS;

  const updateChannel = (idx: number, field: string, value: any) => {
    const updated = [...channels];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, multichannel_settings: { ...settings.multichannel_settings, channels: updated } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Többcsatornás értékesítés</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Globe className="h-4 w-4 text-accent" /> Többcsatornás mód
          </div>
          <Switch checked={settings.multichannel_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, multichannel_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Termékek szinkronizálása külső piacterekkel (Amazon, eBay, Etsy, Facebook Shop).</p>
      </div>

      {channels.map((ch, i) => (
        <div key={ch.name} className="border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider">{ch.name}</span>
            <Switch checked={ch.enabled} onCheckedChange={v => updateChannel(i, "enabled", v)} />
          </div>
          {ch.enabled && (
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label className="text-xs uppercase tracking-wider">API kulcs</Label><Input value={ch.api_key} onChange={e => updateChannel(i, "api_key", e.target.value)} className="rounded-none mt-1 text-xs" type="password" placeholder="••••••••" /></div>
              <div><Label className="text-xs uppercase tracking-wider">Store / Seller ID</Label><Input value={ch.store_id} onChange={e => updateChannel(i, "store_id", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
              <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Készlet szinkron</Label><Switch checked={ch.sync_inventory} onCheckedChange={v => updateChannel(i, "sync_inventory", v)} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Rendelések szinkron</Label><Switch checked={ch.sync_orders} onCheckedChange={v => updateChannel(i, "sync_orders", v)} /></div>
              <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Árak szinkron</Label><Switch checked={ch.sync_prices} onCheckedChange={v => updateChannel(i, "sync_prices", v)} /></div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Utolsó szinkron: {ch.last_sync ? new Date(ch.last_sync).toLocaleString("hu-HU") : "Még nem"}</p>
                <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => toast({ title: "Szinkron elindítva", description: `${ch.name} szinkronizáció folyamatban.` })}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Szinkron
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminMultichannelTab;
