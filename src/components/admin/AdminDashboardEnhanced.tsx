import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, Users, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Repeat, Star, CreditCard, MapPin, Clock } from "lucide-react";

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_name: string | null;
  customer_email?: string;
  items: any;
  payment_method: string | null;
  shipping_city?: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  image_url: string | null;
}

interface Props {
  orders: Order[];
  products: Product[];
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProfit: number;
  profitMargin: string;
  onViewOrder?: (orderId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#eab308",
  processing: "#3b82f6",
  packed: "#8b5cf6",
  shipped: "#06b6d4",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

const AdminDashboardEnhanced = ({
  orders, products, totalRevenue, totalOrders, totalUsers, totalProfit, profitMargin, onViewOrder
}: Props) => {
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const activeProducts = products.filter(p => p.is_active).length;
  const lowStockProducts = products.filter(p => p.stock <= 5 && p.is_active);

  // Customer analytics
  const customerAnalytics = useMemo(() => {
    const customerMap: Record<string, { orders: number; totalSpent: number; lastOrder: string; name: string | null; city: string | null }> = {};
    orders.forEach(o => {
      const email = (o as any).customer_email?.toLowerCase() || "unknown";
      if (!customerMap[email]) {
        customerMap[email] = { orders: 0, totalSpent: 0, lastOrder: o.created_at, name: o.shipping_name, city: (o as any).shipping_city };
      }
      customerMap[email].orders += 1;
      customerMap[email].totalSpent += o.total_amount;
      if (o.created_at > customerMap[email].lastOrder) {
        customerMap[email].lastOrder = o.created_at;
        customerMap[email].name = o.shipping_name || customerMap[email].name;
      }
    });

    const customers = Object.entries(customerMap).map(([email, data]) => ({ email, ...data }));
    const returning = customers.filter(c => c.orders > 1).length;
    const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
    const avgLifetimeValue = customers.length > 0 ? Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length) : 0;
    const newThisMonth = customers.filter(c => {
      const d = new Date(c.lastOrder);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // City distribution
    const cityMap: Record<string, number> = {};
    orders.forEach(o => {
      const city = (o as any).shipping_city || "Ismeretlen";
      cityMap[city] = (cityMap[city] || 0) + 1;
    });
    const topCities = Object.entries(cityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Payment method distribution
    const payMap: Record<string, number> = {};
    orders.forEach(o => {
      const method = o.payment_method || "Ismeretlen";
      payMap[method] = (payMap[method] || 0) + 1;
    });
    const paymentMethods = Object.entries(payMap).map(([name, value]) => ({ name: paymentLabel(name), value }));

    return { returning, topCustomers, avgLifetimeValue, newThisMonth, topCities, paymentMethods, totalCustomers: customers.length };
  }, [orders]);

  // Monthly revenue data for chart
  const monthlyData = useMemo(() => {
    const months: Record<string, { name: string; bevétel: number; rendelések: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("hu-HU", { month: "short" });
      months[key] = { name: label, bevétel: 0, rendelések: 0 };
    }
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) {
        months[key].bevétel += o.total_amount;
        months[key].rendelések += 1;
      }
    });
    return Object.values(months);
  }, [orders]);

  // Daily orders for last 14 days
  const dailyData = useMemo(() => {
    const days: Record<string, { name: string; rendelések: number; bevétel: number }> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
      days[key] = { name: label, rendelések: 0, bevétel: 0 };
    }
    orders.forEach(o => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      if (days[key]) {
        days[key].rendelések += 1;
        days[key].bevétel += o.total_amount;
      }
    });
    return Object.values(days);
  }, [orders]);

  // Order status pie data
  const statusData = useMemo(() => {
    const acc: Record<string, number> = {};
    orders.forEach(o => { acc[o.status] = (acc[o.status] || 0) + 1; });
    return Object.entries(acc).map(([name, value]) => ({ name: statusLabel(name), value, fill: STATUS_COLORS[name] || "#888" }));
  }, [orders]);

  // Top selling products
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; count: number; revenue: number; image: string | null }> = {};
    orders.forEach(o => {
      if (!o.items || !Array.isArray(o.items)) return;
      (o.items as any[]).forEach((item: any) => {
        const id = item.id || item.name;
        if (!counts[id]) counts[id] = { name: item.name || "?", count: 0, revenue: 0, image: item.image_url || null };
        counts[id].count += item.quantity || 1;
        counts[id].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  // This week vs last week
  const weekComparison = useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const thisWeek = orders.filter(o => now - new Date(o.created_at).getTime() < week);
    const lastWeek = orders.filter(o => {
      const diff = now - new Date(o.created_at).getTime();
      return diff >= week && diff < week * 2;
    });
    const thisRevenue = thisWeek.reduce((s, o) => s + o.total_amount, 0);
    const lastRevenue = lastWeek.reduce((s, o) => s + o.total_amount, 0);
    const change = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue * 100) : 0;
    return { thisWeek: thisRevenue, lastWeek: lastRevenue, change, thisCount: thisWeek.length, lastCount: lastWeek.length };
  }, [orders]);

  // Hourly order distribution
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, rendelések: 0 }));
    orders.forEach(o => {
      const h = new Date(o.created_at).getHours();
      hours[h].rendelések += 1;
    });
    return hours;
  }, [orders]);

  const returningRate = customerAnalytics.totalCustomers > 0
    ? ((customerAnalytics.returning / customerAnalytics.totalCustomers) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold uppercase tracking-wider">Áttekintés</h2>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={DollarSign} label="Bevétel" value={`${totalRevenue.toLocaleString()} Ft`} accent />
        <KpiCard icon={ShoppingCart} label="Rendelések" value={String(totalOrders)} />
        <KpiCard icon={TrendingUp} label="Átlagos kosár" value={`${avgOrderValue.toLocaleString()} Ft`} />
        <KpiCard icon={Users} label="Vásárlók" value={String(totalUsers)} subtitle={`${customerAnalytics.newThisMonth} új e hónapban`} />
        <KpiCard icon={TrendingUp} label="Profit" value={`${totalProfit.toLocaleString()} Ft`} positive={totalProfit >= 0} />
        <KpiCard icon={TrendingUp} label="Profit %" value={`${profitMargin}%`} />
        <KpiCard icon={Package} label="Aktív termékek" value={String(activeProducts)} />
        <WeekCompareCard data={weekComparison} />
      </div>

      {/* Customer Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Repeat} label="Visszatérő vásárlók" value={`${customerAnalytics.returning}`} subtitle={`${returningRate}% arány`} />
        <KpiCard icon={Star} label="Átl. ügyfélérték" value={`${customerAnalytics.avgLifetimeValue.toLocaleString()} Ft`} />
        <KpiCard icon={ShoppingCart} label="Rendelés/vásárló" value={customerAnalytics.totalCustomers > 0 ? (totalOrders / customerAnalytics.totalCustomers).toFixed(1) : "0"} />
        <KpiCard icon={Clock} label="Mai rendelések" value={String(orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length)} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Havi bevétel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }}
                formatter={(value: number) => [`${value.toLocaleString()} Ft`, "Bevétel"]}
              />
              <Bar dataKey="bevétel" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Rendelés státusz</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={60} innerRadius={35} dataKey="value" strokeWidth={0}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {statusData.map(s => (
                  <span key={s.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                    {s.name} ({s.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Nincs adat</p>
          )}
        </div>
      </div>

      {/* Daily Orders + Hourly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Napi rendelések (14 nap)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dailyData}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }} />
              <Area type="monotone" dataKey="rendelések" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Rendelések óránként</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={20} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }} />
              <Bar dataKey="rendelések" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Customers + Payment Methods + Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Customers */}
        <div className="border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-accent" />
            Top vásárlók
          </h3>
          {customerAnalytics.topCustomers.length > 0 ? (
            <div className="space-y-2">
              {customerAnalytics.topCustomers.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-accent w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name || c.email}</p>
                    <p className="text-[10px] text-muted-foreground">{c.orders} rendelés · {c.totalSpent.toLocaleString()} Ft</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Nincs vásárló adat</p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-accent" />
            Fizetési módok
          </h3>
          {customerAnalytics.paymentMethods.length > 0 ? (
            <div className="space-y-2">
              {customerAnalytics.paymentMethods.map((pm, i) => {
                const total = customerAnalytics.paymentMethods.reduce((s, p) => s + p.value, 0);
                const pct = total > 0 ? ((pm.value / total) * 100).toFixed(0) : "0";
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{pm.name}</span>
                      <span className="text-muted-foreground">{pm.value} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted overflow-hidden">
                      <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Nincs adat</p>
          )}
        </div>

        {/* Top Cities */}
        <div className="border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-accent" />
            Top városok
          </h3>
          {customerAnalytics.topCities.length > 0 ? (
            <div className="space-y-2">
              {customerAnalytics.topCities.map((city, i) => {
                const total = customerAnalytics.topCities.reduce((s, c) => s + c.value, 0);
                const pct = total > 0 ? ((city.value / total) * 100).toFixed(0) : "0";
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-accent w-5">{i + 1}.</span>
                      <span className="text-sm text-foreground">{city.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{city.value} rendelés ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Nincs adat</p>
          )}
        </div>
      </div>

      {/* Top Products & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Top termékek (eladás szerint)</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-accent w-5">{i + 1}.</span>
                  {p.image && <img src={p.image} alt="" className="h-8 w-8 object-cover border" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.count} db eladva · {p.revenue.toLocaleString()} Ft</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Nincs eladási adat</p>
          )}
        </div>

        <div className="border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
            Alacsony készlet
          </h3>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-2">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {p.image_url && <img src={p.image_url} alt="" className="h-7 w-7 object-cover border" />}
                    <span className="text-sm text-foreground truncate">{p.name}</span>
                  </div>
                  <span className={`text-xs font-bold ${p.stock === 0 ? "text-destructive" : "text-yellow-500"}`}>
                    {p.stock} db
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Minden termék rendben 👍</p>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="border bg-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Legutóbbi rendelések</h3>
        <div className="space-y-2">
          {orders.slice(0, 8).map(o => (
            <div
              key={o.id}
              className="flex items-center justify-between p-2 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onViewOrder?.(o.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">#{o.id.slice(0, 8)}</span>
                <span className="text-sm text-foreground">{o.shipping_name || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-accent">{o.total_amount.toLocaleString()} Ft</span>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border ${
                  o.status === "delivered" ? "text-green-400 border-green-400/30" :
                  o.status === "cancelled" ? "text-destructive border-destructive/30" :
                  "text-accent border-accent/30"
                }`}>
                  {statusLabel(o.status)}
                </span>
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Még nincsenek rendelések.</p>}
        </div>
      </div>
    </div>
  );
};

function KpiCard({ icon: Icon, label, value, accent, positive, subtitle }: {
  icon: any; label: string; value: string; accent?: boolean; positive?: boolean; subtitle?: string;
}) {
  return (
    <div className="border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent ? "text-accent" : positive === false ? "text-destructive" : positive === true ? "text-green-500" : "text-muted-foreground"}`} />
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-bold ${accent ? "text-accent" : positive === false ? "text-destructive" : "text-foreground"}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function WeekCompareCard({ data }: { data: { thisWeek: number; change: number; thisCount: number } }) {
  const up = data.change >= 0;
  return (
    <div className="border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {up ? <ArrowUpRight className="h-4 w-4 text-green-500" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">E hét</span>
      </div>
      <p className="text-xl font-bold text-foreground">{data.thisWeek.toLocaleString()} Ft</p>
      <p className={`text-[10px] mt-1 ${up ? "text-green-500" : "text-destructive"}`}>
        {up ? "+" : ""}{data.change.toFixed(1)}% az előző héthez
      </p>
    </div>
  );
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: "Függőben", processing: "Feldolgozás", packed: "Csomagolva",
    shipped: "Elküldve", delivered: "Kézbesítve", cancelled: "Törölve",
  };
  return map[s] || s;
}

function paymentLabel(s: string) {
  const map: Record<string, string> = {
    card: "Bankkártya", cash: "Készpénz", transfer: "Átutalás", cod: "Utánvét",
    bank_card: "Bankkártya", bank_transfer: "Átutalás",
  };
  return map[s] || s;
}

export default AdminDashboardEnhanced;
