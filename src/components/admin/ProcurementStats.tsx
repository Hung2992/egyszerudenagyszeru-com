import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ProcurementOrder {
  supplier_name: string;
  total_cost: number;
  currency: string;
  payment_status: string;
  order_status: string;
  created_at: string;
}

const COLORS = ["hsl(45, 100%, 50%)", "hsl(0, 0%, 70%)", "hsl(0, 0%, 50%)", "hsl(45, 80%, 70%)", "hsl(0, 0%, 30%)"];

const ProcurementStats = ({ orders }: { orders: ProcurementOrder[] }) => {
  const supplierData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      map[o.supplier_name] = (map[o.supplier_name] || 0) + Number(o.total_cost);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [orders]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      const label = o.order_status === "draft" ? "Piszkozat" :
        o.order_status === "ordered" ? "Megrendelve" :
        o.order_status === "shipped" ? "Szállítás" :
        o.order_status === "received" ? "Megérkezett" : "Törölve";
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      const month = new Date(o.created_at).toLocaleDateString("hu-HU", { year: "numeric", month: "short" });
      map[month] = (map[month] || 0) + Number(o.total_cost);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .slice(-6);
  }, [orders]);

  if (orders.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Monthly costs */}
      <div className="border rounded-lg p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Havi beszerzési költség</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => `${v.toLocaleString("hu-HU")} Ft`} />
            <Bar dataKey="value" fill="hsl(45, 100%, 50%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By supplier */}
      <div className="border rounded-lg p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Beszállítók szerinti költség</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={supplierData} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
            <Tooltip formatter={(v: number) => `${v.toLocaleString("hu-HU")} Ft`} />
            <Bar dataKey="value" fill="hsl(0, 0%, 60%)" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status pie */}
      <div className="border rounded-lg p-4 md:col-span-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Rendelések státusz szerint</h4>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ProcurementStats;
