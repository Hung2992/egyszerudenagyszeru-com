import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Truck, MapPin, CheckCircle2, Clock, AlertCircle, Loader2, ExternalLink } from "lucide-react";

interface Event { status: string; message: string | null; event_time: string; location: string | null; }
interface Shipment {
  tracking_number: string | null;
  tracking_url: string | null;
  carrier_code: string;
  status: string;
  service_type: string | null;
  recipient_name: string | null;
  created_at: string;
  estimated_delivery: string | null;
}

const STATUS_STEPS = [
  { key: "label_created", label: "Csomag létrehozva", icon: Package },
  { key: "picked_up", label: "Futár átvette", icon: Truck },
  { key: "in_transit", label: "Elosztóközpont", icon: MapPin },
  { key: "out_for_delivery", label: "Kiszállítás alatt", icon: Truck },
  { key: "delivered", label: "Kézbesítve", icon: CheckCircle2 },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "Függőben", label_created: "Címke kész", picked_up: "Átvéve",
  in_transit: "Úton", out_for_delivery: "Kiszállítás alatt",
  delivered: "Kézbesítve", returned: "Visszaküldve", failed: "Sikertelen",
};

const TrackShipment = () => {
  const [params, setParams] = useSearchParams();
  const [tracking, setTracking] = useState(params.get("tracking") || "");
  const [orderId, setOrderId] = useState(params.get("order_id") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ shipment: Shipment; events: Event[] } | null>(null);

  const lookup = async (opts?: { tracking?: string; order_id?: string; email?: string }) => {
    setLoading(true); setError(null); setData(null);
    const q = new URLSearchParams();
    const t = opts?.tracking ?? tracking; const o = opts?.order_id ?? orderId; const e = opts?.email ?? email;
    if (t.trim()) q.set("tracking", t.trim());
    else if (o.trim() && e.trim()) { q.set("order_id", o.trim()); q.set("email", e.trim()); }
    else { setError("Add meg a követési számot VAGY a rendelés ID + emailt."); setLoading(false); return; }

    // supabase-js nem támogatja query params-t GET-hez, közvetlen fetch:
    try {
      const url = `${(supabase as any).functionsUrl || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`}/track-shipment?${q.toString()}`;
      const r = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message || json.error || "Nem található");
      setData(json);
      setParams(q);
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (params.get("tracking") || (params.get("order_id") && params.get("email"))) {
      lookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStep = data ? STATUS_STEPS.findIndex(s => s.key === data.shipment.status) : -1;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Csomagkövetés</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Add meg a követési számot, vagy a rendelés azonosítóját és emailedet.
        </p>

        <div className="border border-border bg-card p-5 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider">Követési szám</Label>
            <Input value={tracking} onChange={e => setTracking(e.target.value)}
              placeholder="pl. GL1234567890" className="rounded-none mt-1" />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> VAGY <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider">Rendelés ID</Label>
              <Input value={orderId} onChange={e => setOrderId(e.target.value)}
                placeholder="UUID" className="rounded-none mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="pl. nev@email.hu" className="rounded-none mt-1" />
            </div>
          </div>
          <Button onClick={() => lookup()} disabled={loading} className="w-full rounded-none">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Csomag keresése"}
          </Button>
        </div>

        {error && (
          <div className="mt-6 border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive" /> {error}
          </div>
        )}

        {data && (
          <div className="mt-8 space-y-6">
            <div className="border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Futár</p>
                  <p className="text-lg font-bold">{data.shipment.carrier_code.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Követési szám</p>
                  <p className="text-lg font-mono">{data.shipment.tracking_number}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Státusz</p>
                  <p className="text-lg font-bold">{STATUS_LABEL[data.shipment.status] || data.shipment.status}</p>
                </div>
                {data.shipment.tracking_url && (
                  <a href={data.shipment.tracking_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm underline">
                    Futár oldalán <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-2 overflow-x-auto">
                {STATUS_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const active = i <= currentStep;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center min-w-[70px] text-center">
                      <div className={`w-10 h-10 flex items-center justify-center border ${active ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className={`text-[10px] uppercase tracking-wider mt-2 ${active ? "font-bold" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Events timeline */}
            <div>
              <h2 className="text-sm uppercase tracking-wider font-bold mb-3">Események</h2>
              <div className="border border-border bg-card divide-y divide-border">
                {data.events.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Még nincs esemény.</p>
                ) : [...data.events].reverse().map((e, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    <Clock className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">{STATUS_LABEL[e.status] || e.status}</p>
                      {e.message && <p className="text-xs text-muted-foreground mt-0.5">{e.message}</p>}
                      {e.location && <p className="text-xs text-muted-foreground">📍 {e.location}</p>}
                    </div>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(e.event_time).toLocaleString("hu-HU")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default TrackShipment;
