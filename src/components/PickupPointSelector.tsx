// Átvevőpont választó – kereshető, csoportosított futáronként, publikusan olvasható.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2, Search } from "lucide-react";

interface PickupPoint {
  id: string;
  carrier_code: string;
  code: string;
  name: string;
  address: string;
  city: string | null;
  zip: string | null;
}

interface Props {
  carrierCode?: string;
  value?: { code: string; name: string } | null;
  onChange: (p: { carrier_code: string; code: string; name: string; address: string } | null) => void;
}

const PickupPointSelector = ({ carrierCode, value, onChange }: Props) => {
  const [carriers, setCarriers] = useState<{ code: string; name: string }[]>([]);
  const [carrier, setCarrier] = useState<string>(carrierCode || "");
  const [q, setQ] = useState("");
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("shipping_carriers")
        .select("code,name,supports_pickup_points,active")
        .eq("active", true).eq("supports_pickup_points", true);
      const cs = (data || []).map((c: any) => ({ code: c.code, name: c.name }));
      setCarriers(cs);
      if (!carrier && cs.length > 0) setCarrier(cs[0].code);
    })();
  }, []);

  useEffect(() => {
    if (!carrier) return;
    setLoading(true);
    const t = setTimeout(async () => {
      let query = supabase.from("pickup_points")
        .select("id,carrier_code,code,name,address,city,zip")
        .eq("active", true).eq("carrier_code", carrier)
        .limit(50);
      if (q.trim()) {
        const term = `%${q.trim()}%`;
        query = query.or(`name.ilike.${term},city.ilike.${term},zip.ilike.${term},address.ilike.${term}`);
      }
      const { data } = await query;
      setPoints((data || []) as PickupPoint[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [carrier, q]);

  const grouped = useMemo(() => {
    const g: Record<string, PickupPoint[]> = {};
    for (const p of points) {
      const k = p.city || "Egyéb";
      (g[k] = g[k] || []).push(p);
    }
    return g;
  }, [points]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-accent" />
        <span className="text-sm font-bold uppercase tracking-wider">Átvevőpont választása</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select value={carrier} onValueChange={setCarrier}>
          <SelectTrigger className="rounded-none"><SelectValue placeholder="Futár" /></SelectTrigger>
          <SelectContent>
            {carriers.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Város, irányítószám..." value={q} onChange={(e) => setQ(e.target.value)} className="rounded-none pl-8" />
        </div>
      </div>

      {value?.code && (
        <div className="border border-accent p-2 flex items-center justify-between gap-2 bg-accent/5">
          <div className="text-xs">
            <p className="font-bold">{value.name}</p>
            <p className="text-muted-foreground">Kód: {value.code}</p>
          </div>
          <button className="text-[10px] underline" onClick={() => onChange(null)}>Törlés</button>
        </div>
      )}

      <div className="border border-border max-h-72 overflow-y-auto divide-y divide-border">
        {loading ? (
          <div className="p-4 text-center text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin inline mr-1" /> Töltés…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground text-center">
            Nincs találat. {q ? "Próbálj más keresést." : "A pontokat még nem szinkronizáltuk — admin szinkronizálhat a Logisztika fülön."}
          </div>
        ) : Object.entries(grouped).map(([city, list]) => (
          <div key={city}>
            <div className="px-2 py-1 bg-muted text-[10px] uppercase tracking-wider font-bold">{city}</div>
            {list.map((p) => {
              const selected = value?.code === p.code;
              return (
                <button key={p.id} onClick={() => onChange({ carrier_code: p.carrier_code, code: p.code, name: p.name, address: p.address })}
                  className={`w-full text-left p-2 hover:bg-muted/50 ${selected ? "bg-accent/10" : ""}`}>
                  <p className="text-xs font-bold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{[p.zip, p.city, p.address].filter(Boolean).join(", ")}</p>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PickupPointSelector;
