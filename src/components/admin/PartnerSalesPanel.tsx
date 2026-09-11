// Partner értékesítési panel: rendelések, jutalék, ügyfélbejövők.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShoppingBag, Users, Wallet } from "lucide-react";

interface Props { partnerId: string; commissionPercent?: number | null }

const huf = (n: number) => `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;

const PartnerSalesPanel = ({ partnerId, commissionPercent }: Props) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [oRes, bRes] = await Promise.all([
      supabase.from("partner_orders")
        .select("id, order_number, customer_name, customer_email, total_huf, partner_payout_huf, platform_fee_huf, status, payment_status, created_at")
        .eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(100),
      supabase.from("partner_appointments")
        .select("id, customer_name, customer_email, starts_at, status")
        .eq("partner_id", partnerId).order("starts_at", { ascending: false }).limit(50),
    ]);
    setOrders(oRes.data || []);
    setBookings(bRes.data || []);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const paid = orders.filter(o => o.payment_status === "paid" || o.status === "completed");
    const revenue = paid.reduce((s, o) => s + Number(o.total_huf || 0), 0);
    const fee = paid.reduce((s, o) => s + Number(o.platform_fee_huf || 0), 0);
    const payout = paid.reduce((s, o) => s + Number(o.partner_payout_huf || 0), 0);
    const customers = new Set(orders.map(o => o.customer_email).filter(Boolean));
    bookings.forEach(b => b.customer_email && customers.add(b.customer_email));
    return { revenue, fee, payout, orders: orders.length, customers: customers.size };
  }, [orders, bookings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm uppercase tracking-widest font-bold">Értékesítés</h3>
        {typeof commissionPercent === "number" && (
          <Badge variant="secondary" className="rounded-none uppercase text-[10px]">Jutalék: {commissionPercent}%</Badge>
        )}
        <Button size="sm" variant="outline" className="rounded-none ml-auto" onClick={() => void load()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="rounded-none border-foreground/20 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> Rendelés</div>
          <div className="text-lg font-bold">{stats.orders}</div>
        </Card>
        <Card className="rounded-none border-foreground/20 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Fizetett bevétel</div>
          <div className="text-lg font-bold">{huf(stats.revenue)}</div>
        </Card>
        <Card className="rounded-none border-foreground/20 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Partner kifizetés</div>
          <div className="text-lg font-bold">{huf(stats.payout)}</div>
        </Card>
        <Card className="rounded-none border-foreground/20 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Ügyfelek</div>
          <div className="text-lg font-bold">{stats.customers}</div>
        </Card>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Betöltés…</p> : (
        <>
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Rendelések</h4>
            {orders.length === 0 ? <p className="text-sm text-muted-foreground">Még nincs rendelés.</p> : orders.slice(0, 20).map(o => (
              <Card key={o.id} className="rounded-none border-foreground/20 p-3 flex flex-wrap items-center gap-2 text-sm">
                <div className="flex-1 min-w-[160px]">
                  <div className="font-medium">#{o.order_number || o.id.slice(0, 8)} · {o.customer_name || o.customer_email || "Ismeretlen"}</div>
                  <div className="text-xs text-muted-foreground">{o.created_at ? new Date(o.created_at).toLocaleString("hu-HU") : ""}</div>
                </div>
                <Badge variant="secondary" className="rounded-none uppercase text-[10px]">{o.payment_status || o.status || "—"}</Badge>
                <div className="font-bold">{huf(Number(o.total_huf || 0))}</div>
                <div className="text-xs text-muted-foreground">kifizetés: {huf(Number(o.partner_payout_huf || 0))}</div>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Ügyfélbejövők (foglalások)</h4>
            {bookings.length === 0 ? <p className="text-sm text-muted-foreground">Még nincs foglalás.</p> : bookings.slice(0, 15).map(b => (
              <Card key={b.id} className="rounded-none border-foreground/20 p-3 flex flex-wrap items-center gap-2 text-sm">
                <div className="flex-1 min-w-[160px]">
                  <div className="font-medium">{b.customer_name || b.customer_email || "Ismeretlen"}</div>
                  <div className="text-xs text-muted-foreground">{b.starts_at ? new Date(b.starts_at).toLocaleString("hu-HU") : ""}</div>
                </div>
                <Badge variant="secondary" className="rounded-none uppercase text-[10px]">{b.status || "—"}</Badge>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PartnerSalesPanel;
