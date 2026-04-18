import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Truck, MapPin, Zap, AlertCircle, History } from "lucide-react";
import SheinQuickOrderButton from "./SheinQuickOrderButton";

const AdminAutoProcurementTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [procurementOrders, setProcurementOrders] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    const [{ data: s }, { data: l }] = await Promise.all([
      supabase.from("store_settings").select("*").limit(1).maybeSingle(),
      supabase.from("auto_procurement_log").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (s) setSettings(s);
    if (l) {
      setLogs(l);
      const ids = l.map((x: any) => x.procurement_order_id).filter(Boolean);
      if (ids.length) {
        const { data: orders } = await supabase
          .from("admin_procurement_orders")
          .select("id,supplier_url,product_name")
          .in("id", ids);
        const map: Record<string, any> = {};
        (orders || []).forEach((o: any) => { map[o.id] = o; });
        setProcurementOrders(map);
      }
    }
  };

  useEffect(() => { loadAll(); }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      auto_procurement_enabled: settings.auto_procurement_enabled,
      auto_procurement_threshold: settings.auto_procurement_threshold,
      auto_procurement_use_velocity: settings.auto_procurement_use_velocity,
      auto_procurement_velocity_days: settings.auto_procurement_velocity_days,
      auto_procurement_min_qty: settings.auto_procurement_min_qty,
      auto_procurement_max_qty: settings.auto_procurement_max_qty,
      auto_procurement_default_supplier: settings.auto_procurement_default_supplier,
      auto_procurement_default_supplier_url: settings.auto_procurement_default_supplier_url,
      auto_procurement_notify_email: settings.auto_procurement_notify_email,
      auto_procurement_notify_enabled: settings.auto_procurement_notify_enabled,
      procurement_address_country: settings.procurement_address_country,
      procurement_address_zip: settings.procurement_address_zip,
      procurement_address_city: settings.procurement_address_city,
      procurement_address_street: settings.procurement_address_street,
      procurement_address_name: settings.procurement_address_name,
      procurement_address_phone: settings.procurement_address_phone,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Automatikus beszerzés beállításai frissítve." });
  };

  const update = (field: string, value: any) => setSettings({ ...settings, [field]: value });

  if (!settings) return <div className="text-muted-foreground text-sm p-4">Betöltés...</div>;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider">Automatikus beszerzés</h2>
          <p className="text-xs text-muted-foreground mt-1">Eladási sebesség alapú, intelligens készletfeltöltés</p>
        </div>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs w-full sm:w-auto" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      {/* Master switch */}
      <div className="border p-4 space-y-3 bg-accent/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Zap className="h-4 w-4 text-accent" /> Rendszer aktiválva
          </div>
          <Switch
            checked={settings.auto_procurement_enabled ?? false}
            onCheckedChange={v => update("auto_procurement_enabled", v)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Ha aktív, a rendszer automatikusan létrehoz egy beszerzési rendelést, ha egy termék készlete eléri vagy alulmúlja a küszöbértéket.
        </p>
      </div>

      {/* Trigger settings */}
      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <AlertCircle className="h-4 w-4" /> Kiváltó feltétel
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Készlet küszöb (≤ ennél)</Label>
            <Input type="number" min={0} value={settings.auto_procurement_threshold ?? 1}
              onChange={e => update("auto_procurement_threshold", Number(e.target.value))}
              className="rounded-none mt-1 text-xs" />
            <p className="text-[10px] text-muted-foreground mt-1">Pl. 1 = ha 1-re vagy 0-ra esik</p>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Eladási sebesség alapú mennyiség</Label>
            <Switch checked={settings.auto_procurement_use_velocity ?? true}
              onCheckedChange={v => update("auto_procurement_use_velocity", v)} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Számítási időszak (nap)</Label>
            <Input type="number" min={7} value={settings.auto_procurement_velocity_days ?? 30}
              onChange={e => update("auto_procurement_velocity_days", Number(e.target.value))}
              className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Min. rendelhető db</Label>
            <Input type="number" min={1} value={settings.auto_procurement_min_qty ?? 1}
              onChange={e => update("auto_procurement_min_qty", Number(e.target.value))}
              className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Max. rendelhető db</Label>
            <Input type="number" min={1} value={settings.auto_procurement_max_qty ?? 100}
              onChange={e => update("auto_procurement_max_qty", Number(e.target.value))}
              className="rounded-none mt-1 text-xs" />
          </div>
        </div>
      </div>

      {/* Supplier */}
      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Truck className="h-4 w-4" /> Alapértelmezett beszállító
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Beszállító neve</Label>
            <Input value={settings.auto_procurement_default_supplier ?? ""}
              onChange={e => update("auto_procurement_default_supplier", e.target.value)}
              placeholder="AliExpress / Shein"
              className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Beszállító URL (opc.)</Label>
            <Input value={settings.auto_procurement_default_supplier_url ?? ""}
              onChange={e => update("auto_procurement_default_supplier_url", e.target.value)}
              placeholder="https://..."
              className="rounded-none mt-1 text-xs" />
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <MapPin className="h-4 w-4" /> Szállítási cím (beszerzéshez)
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider">Ország</Label>
            <Input value={settings.procurement_address_country ?? ""}
              onChange={e => update("procurement_address_country", e.target.value)}
              className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Irányítószám</Label>
            <Input value={settings.procurement_address_zip ?? ""}
              onChange={e => update("procurement_address_zip", e.target.value)}
              className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Város</Label>
            <Input value={settings.procurement_address_city ?? ""}
              onChange={e => update("procurement_address_city", e.target.value)}
              className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Utca, házszám</Label>
            <Input value={settings.procurement_address_street ?? ""}
              onChange={e => update("procurement_address_street", e.target.value)}
              className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Címzett neve</Label>
            <Input value={settings.procurement_address_name ?? ""}
              onChange={e => update("procurement_address_name", e.target.value)}
              className="rounded-none mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Telefon</Label>
            <Input value={settings.procurement_address_phone ?? ""}
              onChange={e => update("procurement_address_phone", e.target.value)}
              className="rounded-none mt-1 text-xs" />
          </div>
        </div>
      </div>

      {/* Notification */}
      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <AlertCircle className="h-4 w-4" /> Email értesítés
          </div>
          <Switch checked={settings.auto_procurement_notify_enabled ?? true}
            onCheckedChange={v => update("auto_procurement_notify_enabled", v)} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Értesítési email cím</Label>
          <Input type="email" value={settings.auto_procurement_notify_email ?? ""}
            onChange={e => update("auto_procurement_notify_email", e.target.value)}
            placeholder={settings.contact_email || "admin@..."}
            className="rounded-none mt-1 text-xs" />
          <p className="text-[10px] text-muted-foreground mt-1">Üres = a kapcsolati email-re küldi</p>
        </div>
      </div>

      {/* Recent log */}
      <div className="border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <History className="h-4 w-4" /> Legutóbbi automatikus rendelések
        </div>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Még nincs automatikus rendelés.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map(l => {
              const po = l.procurement_order_id ? procurementOrders[l.procurement_order_id] : null;
              return (
                <div key={l.id} className="text-xs border p-2 flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <div className="font-bold">{l.product_name}</div>
                      <div className="text-muted-foreground">
                        Készlet: {l.trigger_stock} → rendelve: {l.ordered_quantity} db
                        {l.velocity_per_day != null && ` · ${Number(l.velocity_per_day).toFixed(2)}/nap`}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("hu-HU")}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SheinQuickOrderButton
                      compact
                      product={{
                        productName: l.product_name,
                        quantity: l.ordered_quantity,
                        supplierUrl: po?.supplier_url ?? null,
                      }}
                      address={{
                        name: settings.procurement_address_name,
                        phone: settings.procurement_address_phone,
                        street: settings.procurement_address_street,
                        city: settings.procurement_address_city,
                        zip: settings.procurement_address_zip,
                        country: settings.procurement_address_country,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAutoProcurementTab;
