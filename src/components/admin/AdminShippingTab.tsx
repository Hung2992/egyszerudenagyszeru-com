// Logisztika admin - futárok kezelése, csomagok listája, címke generálás
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, RefreshCw, Loader2, ExternalLink, Plus, ToggleLeft, ToggleRight, Download, MapPin, RotateCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Carrier {
  id: string; code: string; name: string; active: boolean; test_mode: boolean;
  base_price: number; delivery_days_min: number; delivery_days_max: number;
  supports_pickup_points: boolean; supports_home_delivery: boolean; supports_cod: boolean;
}
interface Shipment {
  id: string; order_id: string; carrier_code: string; tracking_number: string | null;
  tracking_url: string | null; status: string; service_type: string | null;
  created_at: string; recipient_name: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Függő",
  label_created: "Címke kész",
  picked_up: "Átvéve",
  in_transit: "Úton",
  out_for_delivery: "Kiszállítás alatt",
  delivered: "Kézbesítve",
  returned: "Visszaküldve",
  failed: "Sikertelen",
};

const AdminShippingTab = () => {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [carrierCode, setCarrierCode] = useState("gls");
  const [serviceType, setServiceType] = useState<"home" | "pickup">("home");
  const [weight, setWeight] = useState("1");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, s] = await Promise.all([
      (supabase.from("shipping_carriers" as any) as any).select("*").order("sort_order"),
      (supabase.from("shipments" as any) as any).select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setCarriers(c.data || []);
    setShipments(s.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleCarrier = async (c: Carrier) => {
    await (supabase.from("shipping_carriers" as any) as any)
      .update({ active: !c.active }).eq("id", c.id);
    toast({ title: c.active ? "Kikapcsolva" : "Bekapcsolva", description: c.name });
    load();
  };

  const createShipment = async () => {
    if (!orderId.trim()) {
      toast({ title: "Rendelés azonosító hiányzik", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-shipment", {
      body: {
        order_id: orderId.trim(),
        carrier_code: carrierCode,
        service_type: serviceType,
        weight_kg: Number(weight) || 1,
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast({ title: "Hiba", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Csomag létrehozva ✓", description: (data as any)?.shipment?.tracking_number });
    setShowCreate(false); setOrderId("");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Logisztika & Futárok</h2>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => setShowCreate(v => !v)} className="rounded-none h-7 text-[10px]">
            <Plus className="w-3 h-3 mr-1" /> Új címke
          </Button>
          <Button size="icon" variant="ghost" onClick={load} className="h-7 w-7">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Új címke */}
      {showCreate && (
        <div className="border border-accent p-3 bg-card space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-bold">Új csomagcímke</p>
          <Input placeholder="Rendelés UUID" value={orderId} onChange={e => setOrderId(e.target.value)}
            className="rounded-none text-xs h-8" />
          <div className="grid grid-cols-3 gap-2">
            <Select value={carrierCode} onValueChange={setCarrierCode}>
              <SelectTrigger className="rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {carriers.filter(c => c.active).map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serviceType} onValueChange={(v: any) => setServiceType(v)}>
              <SelectTrigger className="rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Házhoz</SelectItem>
                <SelectItem value="pickup">Átvevőpont</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" step="0.1" min="0.1" placeholder="Súly (kg)"
              value={weight} onChange={e => setWeight(e.target.value)} className="rounded-none text-xs h-8" />
          </div>
          <Button onClick={createShipment} disabled={creating} className="w-full rounded-none h-8 text-[10px]">
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Címke generálás"}
          </Button>
        </div>
      )}

      {/* Futárok */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Futárszolgáltatók</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {carriers.map(c => (
            <div key={c.id} className={`border p-3 bg-card ${c.active ? "border-border" : "border-border/50 opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.code}</p>
                </div>
                <button onClick={() => toggleCarrier(c)} title={c.active ? "Kikapcsol" : "Bekapcsol"}>
                  {c.active ? <ToggleRight className="w-5 h-5 text-accent" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                </button>
              </div>
              <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
                <p>💰 Alapdíj: {c.base_price.toLocaleString()} Ft</p>
                <p>⏱ Kézbesítés: {c.delivery_days_min}-{c.delivery_days_max} nap</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {c.supports_home_delivery && <span className="text-[9px] px-1 border border-border">Házhoz</span>}
                  {c.supports_pickup_points && <span className="text-[9px] px-1 border border-border">Átvevőpont</span>}
                  {c.supports_cod && <span className="text-[9px] px-1 border border-border">Utánvét</span>}
                  {c.test_mode && <span className="text-[9px] px-1 border border-yellow-500 text-yellow-500">TESZT</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Csomagok */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Package className="w-3 h-3" /> Csomagok ({shipments.length})
        </p>
        <div className="border border-border bg-card divide-y divide-border max-h-[500px] overflow-y-auto">
          {shipments.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">Nincs csomag még.</p>
          ) : shipments.map(s => (
            <div key={s.id} className="p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-bold">{s.carrier_code}</span>
                  <span className="text-xs font-mono">{s.tracking_number || "—"}</span>
                  <span className="text-[10px] px-1.5 border border-border">{STATUS_LABELS[s.status] || s.status}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {s.recipient_name || "N/A"} • {new Date(s.created_at).toLocaleString("hu-HU")}
                </p>
              </div>
              {s.tracking_url && (
                <a href={s.tracking_url} target="_blank" rel="noopener noreferrer"
                  className="text-accent hover:opacity-70" title="Nyomkövetés">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminShippingTab;
