import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, RefreshCw, Database } from "lucide-react";

interface ErpSettings {
  erp_provider: string;
  api_endpoint: string;
  sync_interval_minutes: number;
  sync_orders: boolean;
  sync_inventory: boolean;
  sync_products: boolean;
  sync_customers: boolean;
  last_sync_at: string;
  auto_stock_update: boolean;
  conflict_resolution: "erp_wins" | "shop_wins" | "manual";
}

const defaultErp: ErpSettings = {
  erp_provider: "",
  api_endpoint: "",
  sync_interval_minutes: 60,
  sync_orders: true,
  sync_inventory: true,
  sync_products: false,
  sync_customers: false,
  last_sync_at: "",
  auto_stock_update: true,
  conflict_resolution: "erp_wins",
};

const CONFLICT_OPTIONS: Record<string, string> = { erp_wins: "ERP nyer (felülírja a webshopot)", shop_wins: "Webshop nyer", manual: "Manuális egyeztetés" };

const AdminErpSyncTab = () => {
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
      erp_sync_settings: settings.erp_sync_settings,
      erp_sync_enabled: settings.erp_sync_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "ERP szinkron beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const erp: ErpSettings = { ...defaultErp, ...(typeof settings.erp_sync_settings === "object" && settings.erp_sync_settings !== null ? settings.erp_sync_settings : {}) };

  const updateErp = (field: string, value: any) => {
    setSettings({ ...settings, erp_sync_settings: { ...erp, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">ERP / Raktár szinkron</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Database className="h-4 w-4 text-accent" /> ERP szinkronizáció
          </div>
          <Switch checked={settings.erp_sync_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, erp_sync_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Rendelések és készlet automatikus szinkronizálása külső ERP rendszerrel.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Kapcsolódási adatok</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label className="text-xs uppercase tracking-wider">ERP rendszer neve</Label><Input value={erp.erp_provider} onChange={e => updateErp("erp_provider", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="pl. SAP, Billingo, MiniCRM" /></div>
          <div><Label className="text-xs uppercase tracking-wider">API végpont</Label><Input value={erp.api_endpoint} onChange={e => updateErp("api_endpoint", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="https://api.erp.com/v1" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Szinkron intervallum (perc)</Label><Input type="number" value={erp.sync_interval_minutes} onChange={e => updateErp("sync_interval_minutes", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Ütközés kezelés</Label>
            <select value={erp.conflict_resolution} onChange={e => updateErp("conflict_resolution", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
              {Object.entries(CONFLICT_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Szinkronizálandó adatok</span>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Rendelések szinkron</Label><Switch checked={erp.sync_orders} onCheckedChange={v => updateErp("sync_orders", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Készlet szinkron</Label><Switch checked={erp.sync_inventory} onCheckedChange={v => updateErp("sync_inventory", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Termékek szinkron</Label><Switch checked={erp.sync_products} onCheckedChange={v => updateErp("sync_products", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Vásárlók szinkron</Label><Switch checked={erp.sync_customers} onCheckedChange={v => updateErp("sync_customers", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Auto készletfrissítés</Label><Switch checked={erp.auto_stock_update} onCheckedChange={v => updateErp("auto_stock_update", v)} /></div>
        </div>
      </div>

      <div className="border p-4 space-y-3">
        <span className="text-sm font-bold uppercase tracking-wider">Szinkron állapot</span>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Utolsó szinkron: {erp.last_sync_at ? new Date(erp.last_sync_at).toLocaleString("hu-HU") : "Még nem futott"}
          </p>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => toast({ title: "Szinkron elindítva", description: "A háttérben fut a szinkronizáció." })}>
            <RefreshCw className="h-3 w-3 mr-1" /> Kézi szinkron
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminErpSyncTab;
