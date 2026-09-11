// Partner foglalások listája a Partner Kezelőben: ki, mikor, mivel foglalt.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarClock, Mail, Phone } from "lucide-react";

interface Booking {
  id: string;
  partner_id: string;
  product_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  starts_at: string | null;
  duration_min: number | null;
  location: string | null;
  status: string | null;
  notes: string | null;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const PartnerBookingsPanel = ({ partnerNames }: { partnerNames: Record<string, string> }) => {
  const [rows, setRows] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_appointments")
      .select("id, partner_id, product_id, customer_name, customer_email, starts_at, duration_min, location, status, notes")
      .order("starts_at", { ascending: false })
      .limit(200);
    const list = (data as Booking[]) || [];
    setRows(list);
    const ids = Array.from(new Set(list.map(r => r.product_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: prods } = await supabase.from("partner_products").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      ((prods as any[]) || []).forEach(p => { map[p.id] = p.name; });
      setProducts(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      [r.customer_name, r.customer_email, r.location, r.status, partnerNames[r.partner_id], products[r.product_id || ""]]
        .some(v => (v || "").toLowerCase().includes(t))
    );
  }, [rows, q, partnerNames, products]);

  return (
    <Card className="rounded-none p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <CalendarClock className="h-4 w-4 text-primary" />
        <div className="font-bold">Partner foglalások ({rows.length})</div>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés ügyfél, partner vagy szolgáltatás szerint" className="rounded-none flex-1 min-w-[200px]" />
        <Button variant="outline" className="rounded-none" onClick={() => void load()}>Frissítés</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Betöltés...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Még nincs foglalás.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="border border-border p-3 flex flex-col lg:flex-row lg:items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">
                  {fmt(r.starts_at)} · {r.customer_name || r.customer_email || "Ismeretlen ügyfél"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {partnerNames[r.partner_id] || "Ismeretlen partner"} · {products[r.product_id || ""] || "Szolgáltatás megadás nélkül"}
                  {r.duration_min ? ` · ${r.duration_min} perc` : ""}{r.location ? ` · ${r.location}` : ""}
                </div>
                {r.notes && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.notes}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-none">{r.status || "foglalt"}</Badge>
                {r.customer_email && (
                  <a href={`mailto:${r.customer_email}`} className="border border-border p-2 hover:border-primary" aria-label="E-mail az ügyfélnek">
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                )}
                {r.location?.startsWith("+") && (
                  <a href={`tel:${r.location}`} className="border border-border p-2 hover:border-primary" aria-label="Hívás">
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default PartnerBookingsPanel;
