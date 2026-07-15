// Sprint B.5.1 — Stylist → Try-On → Kosár → Vásárlás funnel
// Egyetlen üzleti szempontú nézet: mennyien indítanak stylist sessiont, hányan próbálják fel,
// hányan raknak kosárba és hányan vásárolnak ténylegesen. Bevétel + AOV kimutatás.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2, Camera, ShoppingBag, CheckCircle2, TrendingUp } from "lucide-react";

type FunnelStats = {
  sessions: number;
  withTryOn: number;
  withCart: number;
  purchased: number;
  revenue: number;
  aov: number;
  avgSetPrice: number;
};

export default function StylistFunnelPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FunnelStats>({ sessions: 0, withTryOn: 0, withCart: 0, purchased: 0, revenue: 0, aov: 0, avgSetPrice: 0 });
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const [sessRes, tryRes, orderRes] = await Promise.all([
        supabase.from("ai_stylist_sessions")
          .select("id, added_to_cart, purchased, total_price, created_at")
          .gte("created_at", since),
        supabase.from("tryon_generations")
          .select("stylist_session_id")
          .not("stylist_session_id", "is", null)
          .gte("created_at", since),
        supabase.from("orders")
          .select("id, total_amount, stylist_session_id, status")
          .not("stylist_session_id", "is", null)
          .gte("created_at", since),
      ]);

      const sessions = (sessRes.data ?? []) as any[];
      const tryons = (tryRes.data ?? []) as any[];
      const orders = (orderRes.data ?? []) as any[];

      const tryOnSet = new Set(tryons.map(t => t.stylist_session_id).filter(Boolean));
      const purchasedOrders = orders.filter(o => o.status !== "cancelled");
      const revenue = purchasedOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const aov = purchasedOrders.length ? Math.round(revenue / purchasedOrders.length) : 0;
      const setPrices = sessions.map(s => Number(s.total_price || 0)).filter(n => n > 0);
      const avgSetPrice = setPrices.length ? Math.round(setPrices.reduce((a, b) => a + b, 0) / setPrices.length) : 0;

      setStats({
        sessions: sessions.length,
        withTryOn: sessions.filter(s => tryOnSet.has(s.id)).length,
        withCart: sessions.filter(s => s.added_to_cart).length,
        purchased: sessions.filter(s => s.purchased).length,
        revenue,
        aov,
        avgSetPrice,
      });
      setLoading(false);
    })();
  }, [days]);

  if (loading) return <div className="flex items-center gap-2 py-8"><Loader2 className="h-4 w-4 animate-spin" />Betöltés…</div>;

  const pct = (n: number) => stats.sessions > 0 ? Math.round((n / stats.sessions) * 100) : 0;
  const stages = [
    { key: "sessions", label: "Stylist szessziók", val: stats.sessions, icon: Wand2, color: "bg-foreground" },
    { key: "tryOn", label: "→ Try-On indítva", val: stats.withTryOn, icon: Camera, color: "bg-blue-500" },
    { key: "cart", label: "→ Kosárba", val: stats.withCart, icon: ShoppingBag, color: "bg-amber-500" },
    { key: "purchased", label: "→ Vásárolt", val: stats.purchased, icon: CheckCircle2, color: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground">Időszak:</span>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`text-xs px-2 py-1 border ${days === d ? "bg-foreground text-background" : "border-border"}`}>
            {d} nap
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const p = i === 0 ? 100 : pct(s.val);
          return (
            <Card key={s.key}><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="text-[10px] uppercase text-muted-foreground">{s.label}</div>
              </div>
              <div className="text-2xl font-bold">{s.val}</div>
              <div className="text-xs text-muted-foreground">{p}%</div>
              <div className="h-1 mt-2 bg-muted">
                <div className={`h-1 ${s.color}`} style={{ width: `${p}%` }} />
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Üzleti eredmény</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">AI attribúált bevétel</div>
            <div className="text-2xl font-bold">{stats.revenue.toLocaleString("hu-HU")} Ft</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">AI AOV</div>
            <div className="text-2xl font-bold">{stats.aov.toLocaleString("hu-HU")} Ft</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Átlag szett ár</div>
            <div className="text-2xl font-bold">{stats.avgSetPrice.toLocaleString("hu-HU")} Ft</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Konverzió (session → vásárlás)</div>
            <div className="text-2xl font-bold">{pct(stats.purchased)}%</div>
          </div>
        </CardContent>
      </Card>

      <div className="text-[10px] text-muted-foreground">
        A funnel csak azokat a rendeléseket számolja, amelyek egy Fashion Stylist szettből kerültek kosárba (stylist_session_id kapcsolat).
      </div>
    </div>
  );
}
