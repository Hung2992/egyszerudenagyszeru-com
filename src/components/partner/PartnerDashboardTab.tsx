// Partner irányítópult: saját KPI-ok + teendő lista egy helyen.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, ShoppingBag, Package, AlertTriangle, Store, CheckCircle2, Clock, RefreshCw,
} from "lucide-react";

interface Props {
  partnerId: string;
  onNavigate?: (tab: string) => void;
}

interface Kpis {
  revenue30: number;
  orders30: number;
  avgOrder: number;
  liveProducts: number;
  pendingProducts: number;
  lowStock: number;
  outOfStock: number;
  newOrders: number;
  unshipped: number;
  storefrontPublished: boolean | null;
  storefrontSlug: string | null;
  views30: number;
}

const fmt = (n: number) => `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;

const PartnerDashboardTab = ({ partnerId, onNavigate }: Props) => {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [ordersRes, productsRes, sfRes] = await Promise.all([
      supabase
        .from("partner_orders")
        .select("total_huf,partner_payout_huf,status,shipped_at,created_at")
        .eq("partner_id", partnerId)
        .gte("created_at", since),
      supabase
        .from("partner_products")
        .select("id,status,stock_qty,view_count")
        .eq("partner_id", partnerId),
      supabase
        .from("partner_storefronts")
        .select("is_published,slug")
        .eq("partner_id", partnerId)
        .maybeSingle(),
    ]);

    const orders = (ordersRes.data as any[]) || [];
    const products = (productsRes.data as any[]) || [];
    const revenue30 = orders.reduce((s, o) => s + Number(o.partner_payout_huf || o.total_huf || 0), 0);

    setKpis({
      revenue30,
      orders30: orders.length,
      avgOrder: orders.length ? revenue30 / orders.length : 0,
      liveProducts: products.filter((p) => p.status === "active").length,
      pendingProducts: products.filter((p) => p.status === "pending_review").length,
      lowStock: products.filter((p) => Number(p.stock_qty ?? 0) > 0 && Number(p.stock_qty) <= 3).length,
      outOfStock: products.filter((p) => Number(p.stock_qty ?? 0) === 0).length,
      newOrders: orders.filter((o) => ["new", "pending", "paid"].includes(String(o.status))).length,
      unshipped: orders.filter((o) => !o.shipped_at && String(o.status) !== "cancelled").length,
      storefrontPublished: (sfRes.data as any)?.is_published ?? null,
      storefrontSlug: (sfRes.data as any)?.slug ?? null,
      views30: products.reduce((s, p) => s + Number(p.view_count || 0), 0),
    });
    setLoading(false);
  };

  useEffect(() => {
    if (partnerId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  if (loading || !kpis) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-none" />)}
      </div>
    );
  }

  const cards = [
    { label: "Bevétel (30 nap)", value: fmt(kpis.revenue30), icon: TrendingUp },
    { label: "Rendelés (30 nap)", value: String(kpis.orders30), icon: ShoppingBag },
    { label: "Átlagos kosárérték", value: fmt(kpis.avgOrder), icon: TrendingUp },
    { label: "Megtekintés (össz.)", value: kpis.views30.toLocaleString("hu-HU"), icon: Store },
    { label: "Élő termék", value: String(kpis.liveProducts), icon: Package },
    { label: "Jóváhagyásra vár", value: String(kpis.pendingProducts), icon: Clock },
    { label: "Alacsony készlet", value: String(kpis.lowStock), icon: AlertTriangle },
    { label: "Elfogyott", value: String(kpis.outOfStock), icon: AlertTriangle },
  ];

  const todos: { text: string; tab: string; urgent?: boolean }[] = [];
  if (kpis.newOrders > 0) todos.push({ text: `${kpis.newOrders} új rendelés vár feldolgozásra`, tab: "orders", urgent: true });
  if (kpis.unshipped > 0) todos.push({ text: `${kpis.unshipped} rendelés még nincs feladva`, tab: "orders", urgent: true });
  if (kpis.outOfStock > 0) todos.push({ text: `${kpis.outOfStock} termék elfogyott – töltsd fel a készletet`, tab: "inventory", urgent: true });
  if (kpis.lowStock > 0) todos.push({ text: `${kpis.lowStock} terméknél alacsony a készlet`, tab: "inventory" });
  if (kpis.pendingProducts > 0) todos.push({ text: `${kpis.pendingProducts} termék jóváhagyásra vár`, tab: "products" });
  if (!kpis.storefrontSlug) todos.push({ text: "Még nincs saját webshopod – hozd létre pár perc alatt", tab: "storefront", urgent: true });
  else if (!kpis.storefrontPublished) todos.push({ text: "A webshopod még nincs publikálva", tab: "storefront", urgent: true });
  if (kpis.liveProducts === 0) todos.push({ text: "Nincs élő terméked – tölts fel legalább egyet", tab: "products", urgent: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg">Irányítópult</h3>
        <Button variant="outline" size="sm" className="rounded-none" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Frissítés
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-none border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-none border-border p-5 space-y-3">
        <h4 className="font-heading">Teendők</h4>
        {todos.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-accent" /> Minden rendben, nincs nyitott teendőd.
          </div>
        ) : (
          <ul className="space-y-2">
            {todos.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-3 border border-border p-3">
                <div className="flex items-center gap-2 text-sm">
                  {t.urgent ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                  <span>{t.text}</span>
                  {t.urgent && <Badge variant="destructive" className="rounded-none text-[10px]">sürgős</Badge>}
                </div>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => onNavigate?.(t.tab)}>
                  Megnyitom
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default PartnerDashboardTab;
