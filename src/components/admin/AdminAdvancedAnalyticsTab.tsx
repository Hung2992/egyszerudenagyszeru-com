import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart3, ShoppingCart, TrendingUp, Users, Eye } from "lucide-react";

const AdminAdvancedAnalyticsTab = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [oRes, pRes, rRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("shop_products").select("*"),
      supabase.from("product_reviews").select("*"),
    ]);
    if (oRes.data) setOrders(oRes.data);
    if (pRes.data) setProducts(pRes.data);
    if (rRes.data) setReviews(rRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  // Konverziós tölcsér
  const totalVisitors = orders.length * 3; // becsült
  const cartAdded = Math.round(orders.length * 1.8);
  const checkoutStarted = Math.round(orders.length * 1.2);
  const completed = orders.filter(o => o.status === "completed" || o.status === "delivered").length;
  const conversionRate = totalVisitors > 0 ? ((completed / totalVisitors) * 100).toFixed(1) : "0";

  // Legnépszerűbb termékek rendelésekből
  const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
  orders.forEach(o => {
    const items = o.items || [];
    items.forEach((item: any) => {
      const key = item.product_id || item.name;
      if (!productSales[key]) productSales[key] = { name: item.name || "Ismeretlen", count: 0, revenue: 0 };
      productSales[key].count += item.quantity || 1;
      productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Rendelések időszakonként (utolsó 7 nap)
  const last7days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const dailyOrders = last7days.map(day => ({
    day, count: orders.filter(o => o.created_at?.slice(0, 10) === day).length,
    revenue: orders.filter(o => o.created_at?.slice(0, 10) === day).reduce((s, o) => s + (o.total || 0), 0),
  }));

  // Átlagos értékelés
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : "–";

  // Átlagos kosárérték
  const avgCart = orders.length > 0 ? Math.round(orders.reduce((s, o) => s + (o.total || 0), 0) / orders.length) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /><h2 className="font-bold text-lg">Haladó analitika</h2></div>

      {/* KPI kártyák */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Konverziós ráta", value: `${conversionRate}%`, icon: TrendingUp },
          { label: "Átl. kosárérték", value: `${avgCart.toLocaleString("hu")} Ft`, icon: ShoppingCart },
          { label: "Átl. értékelés", value: `${avgRating} ⭐`, icon: Eye },
          { label: "Össz. rendelés", value: orders.length.toString(), icon: Users },
        ].map(kpi => (
          <div key={kpi.label} className="border rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><kpi.icon className="w-3 h-3" />{kpi.label}</div>
            <p className="text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Konverziós tölcsér */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-medium">Konverziós tölcsér (becsült)</h3>
        <div className="space-y-2">
          {[
            { label: "Látogatók", value: totalVisitors, pct: 100 },
            { label: "Kosárba tette", value: cartAdded, pct: totalVisitors > 0 ? (cartAdded / totalVisitors * 100) : 0 },
            { label: "Pénztárhoz ment", value: checkoutStarted, pct: totalVisitors > 0 ? (checkoutStarted / totalVisitors * 100) : 0 },
            { label: "Vásárolt", value: completed, pct: totalVisitors > 0 ? (completed / totalVisitors * 100) : 0 },
          ].map(step => (
            <div key={step.label} className="flex items-center gap-3">
              <span className="text-sm w-36">{step.label}</span>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${step.pct}%` }} />
              </div>
              <span className="text-sm font-medium w-20 text-right">{step.value} ({step.pct.toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Napi trend */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-medium">Utolsó 7 nap</h3>
        <div className="grid grid-cols-7 gap-1">
          {dailyOrders.map(d => (
            <div key={d.day} className="text-center space-y-1">
              <div className="bg-muted rounded-lg overflow-hidden h-20 flex items-end">
                <div className="bg-primary w-full transition-all rounded-t"
                  style={{ height: `${Math.max(8, (d.count / Math.max(...dailyOrders.map(x => x.count), 1)) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">{d.day.slice(5)}</p>
              <p className="text-xs font-medium">{d.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top termékek */}
      <div className="space-y-3">
        <h3 className="font-medium">Legnépszerűbb termékek</h3>
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Termék</TableHead><TableHead>Eladva</TableHead><TableHead>Bevétel</TableHead></TableRow></TableHeader>
          <TableBody>
            {topProducts.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="font-bold">{i + 1}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.count} db</TableCell>
                <TableCell>{p.revenue.toLocaleString("hu")} Ft</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {topProducts.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek eladási adatok.</p>}
      </div>
    </div>
  );
};

export default AdminAdvancedAnalyticsTab;
