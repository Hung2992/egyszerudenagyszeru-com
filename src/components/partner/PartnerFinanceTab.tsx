// Partner pénzügyi központ: forgalom, jutalék, árrés, profitbecslés, legjobb/leggyengébb termékek.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Banknote, Percent, Wallet } from "lucide-react";

interface Props { partnerId: string }

const fmt = (n: number) => `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;
const RANGES = [
  { key: "7", label: "7 nap" },
  { key: "30", label: "30 nap" },
  { key: "90", label: "90 nap" },
];

const PartnerFinanceTab = ({ partnerId }: Props) => {
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [prevOrders, setPrevOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const days = Number(range);
      const from = new Date(Date.now() - days * 864e5).toISOString();
      const prevFrom = new Date(Date.now() - days * 2 * 864e5).toISOString();
      const [curRes, prevRes, prodRes] = await Promise.all([
        supabase.from("partner_orders").select("total_huf,partner_payout_huf,platform_fee_huf,status,created_at")
          .eq("partner_id", partnerId).gte("created_at", from).limit(1000),
        supabase.from("partner_orders").select("total_huf,partner_payout_huf,created_at")
          .eq("partner_id", partnerId).gte("created_at", prevFrom).lt("created_at", from).limit(1000),
        supabase.from("partner_products").select("title,price_huf,cost_huf,compare_price_huf,stock_qty,sales_count,view_count,status")
          .eq("partner_id", partnerId).limit(300),
      ]);
      if (cancelled) return;
      setOrders(curRes.data || []);
      setPrevOrders(prevRes.data || []);
      setProducts(prodRes.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [partnerId, range]);

  const m = useMemo(() => {
    const gross = orders.reduce((s, o) => s + Number(o.total_huf || 0), 0);
    const payout = orders.reduce((s, o) => s + Number(o.partner_payout_huf || 0), 0);
    const fee = orders.reduce((s, o) => s + Number(o.platform_fee_huf || Math.max(0, Number(o.total_huf || 0) - Number(o.partner_payout_huf || 0))), 0);
    const prevGross = prevOrders.reduce((s, o) => s + Number(o.total_huf || 0), 0);
    const growth = prevGross > 0 ? ((gross - prevGross) / prevGross) * 100 : null;
    const avg = orders.length ? gross / orders.length : 0;
    return { gross, payout, fee, prevGross, growth, avg, count: orders.length };
  }, [orders, prevOrders]);

  const ranked = useMemo(() => {
    return products
      .map((p) => {
        const price = Number(p.price_huf || 0);
        const cost = Number(p.cost_huf || 0);
        const margin = cost > 0 ? ((price - cost) / price) * 100 : null;
        const profit = cost > 0 ? (price - cost) * Number(p.sales_count || 0) : null;
        return { ...p, price, cost, margin, profit, revenue: price * Number(p.sales_count || 0) };
      })
      .sort((a, b) => (b.profit ?? b.revenue) - (a.profit ?? a.revenue));
  }, [products]);

  const worst = useMemo(
    () => [...ranked].filter((p) => p.status === "active").sort((a, b) => (a.profit ?? a.revenue) - (b.profit ?? b.revenue)).slice(0, 5),
    [ranked],
  );

  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-none" />)}</div>;

  return (
    <div className="space-y-6">
      <Tabs value={range} onValueChange={setRange}>
        <TabsList className="rounded-none">
          {RANGES.map((r) => <TabsTrigger key={r.key} value={r.key} className="rounded-none">{r.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-none p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3" /> Bruttó forgalom</p>
          <p className="text-xl font-bold mt-1">{fmt(m.gross)}</p>
          {m.growth !== null && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${m.growth >= 0 ? "text-primary" : "text-destructive"}`}>
              {m.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {m.growth >= 0 ? "+" : ""}{m.growth.toFixed(1)}% az előző időszakhoz
            </p>
          )}
        </Card>
        <Card className="rounded-none p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Neked járó (payout)</p>
          <p className="text-xl font-bold mt-1">{fmt(m.payout)}</p>
        </Card>
        <Card className="rounded-none p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" /> Platformjutalék</p>
          <p className="text-xl font-bold mt-1">{fmt(m.fee)}</p>
          <p className="text-xs text-muted-foreground mt-1">{m.gross > 0 ? ((m.fee / m.gross) * 100).toFixed(1) : "0"}% a forgalomból</p>
        </Card>
        <Card className="rounded-none p-4">
          <p className="text-xs text-muted-foreground">Átlagos kosárérték</p>
          <p className="text-xl font-bold mt-1">{fmt(m.avg)}</p>
          <p className="text-xs text-muted-foreground mt-1">{m.count} rendelés</p>
        </Card>
      </div>

      <Card className="rounded-none p-4">
        <h3 className="font-semibold mb-3">💰 Legjövedelmezőbb termékek</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Termék</TableHead>
                <TableHead className="text-right">Ár</TableHead>
                <TableHead className="text-right">Beszerzés</TableHead>
                <TableHead className="text-right">Árrés</TableHead>
                <TableHead className="text-right">Eladás</TableHead>
                <TableHead className="text-right">Becsült profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.slice(0, 10).map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[220px] truncate">{p.title}</TableCell>
                  <TableCell className="text-right">{fmt(p.price)}</TableCell>
                  <TableCell className="text-right">{p.cost ? fmt(p.cost) : "—"}</TableCell>
                  <TableCell className="text-right">
                    {p.margin === null ? <Badge variant="outline" className="rounded-none text-[10px]">nincs adat</Badge> : `${p.margin.toFixed(0)}%`}
                  </TableCell>
                  <TableCell className="text-right">{p.sales_count || 0}</TableCell>
                  <TableCell className="text-right font-medium">{p.profit === null ? fmt(p.revenue) + "*" : fmt(p.profit)}</TableCell>
                </TableRow>
              ))}
              {ranked.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Még nincs termékadat.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">* Beszerzési ár hiányában forgalom szerepel. Add meg a beszerzési árat a pontos profithoz.</p>
      </Card>

      <Card className="rounded-none p-4">
        <h3 className="font-semibold mb-3">📉 Leggyengébben teljesítő élő termékek</h3>
        <ul className="space-y-2 text-sm">
          {worst.map((p, i) => (
            <li key={i} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0">
              <span className="truncate">{p.title}</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {p.sales_count || 0} eladás · {p.view_count || 0} megtekintés
              </span>
            </li>
          ))}
          {worst.length === 0 && <li className="text-muted-foreground">Nincs élő termék.</li>}
        </ul>
      </Card>
    </div>
  );
};

export default PartnerFinanceTab;
