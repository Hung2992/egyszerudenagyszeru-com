// Kampányteljesítmény: a kampánytervezőből indított kampányok mért eredménye.
// Ugyanez a kártya jelenik meg a Pénzügy és a Marketing oldalon is.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, TrendingUp } from "lucide-react";

interface Props { partnerId: string; compact?: boolean }

const ft = (n: number) => `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;

const CampaignPerformanceCard = ({ partnerId, compact = false }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("partner_campaign_plans")
        .select("id, name, status, source, page_slug, view_count, click_count, order_count, revenue_huf, forecast, published_at, created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!alive) return;
      setRows(data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [partnerId]);

  const totals = useMemo(() => {
    const published = rows.filter((r) => r.status === "published");
    return {
      count: published.length,
      views: published.reduce((s, r) => s + (r.view_count || 0), 0),
      clicks: published.reduce((s, r) => s + (r.click_count || 0), 0),
      orders: published.reduce((s, r) => s + (r.order_count || 0), 0),
      revenue: published.reduce((s, r) => s + Number(r.revenue_huf || 0), 0),
      forecastRevenue: published.reduce((s, r) => s + Number(r.forecast?.expectedRevenueHuf || 0), 0),
    };
  }, [rows]);

  const rates = useMemo(() => ({
    ctr: totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0,
    conversion: totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0,
    aov: totals.orders > 0 ? totals.revenue / totals.orders : 0,
  }), [totals]);

  if (loading) return <Skeleton className="h-40 w-full rounded-none" />;

  return (
    <Card className="rounded-none p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <Megaphone className="h-3.5 w-3.5" /> Kampányok eredménye
      </div>

      {totals.count === 0 ? (
        <p className="text-sm text-muted-foreground">
          Még nincs publikált kampány. A Partner OS kampánytervezőjével indíthatsz egyet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Kampány", String(totals.count)],
              ["Megtekintés", totals.views.toLocaleString("hu-HU")],
              ["Kattintás", totals.clicks.toLocaleString("hu-HU")],
              ["Rendelés", totals.orders.toLocaleString("hu-HU")],
              ["Bevétel", ft(totals.revenue)],
            ].map(([label, value]) => (
              <div key={label} className="border border-foreground/10 p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["Átkattintás", `${rates.ctr.toFixed(1)}%`],
              ["Vásárlási arány", `${rates.conversion.toFixed(1)}%`],
              ["Átlagos kosár", ft(rates.aov)],
            ].map(([label, value]) => (
              <div key={label} className="border border-foreground/10 p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-1 text-base font-bold">{value}</p>
              </div>
            ))}
          </div>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Előrejelzett bevétel a publikált kampányokból: {ft(totals.forecastRevenue)}
          </p>

          {!compact && (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/10 pb-2 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="text-muted-foreground">
                      {r.view_count || 0} megtekintés · {r.click_count || 0} kattintás · {r.order_count || 0} rendelés · {ft(Number(r.revenue_huf || 0))}
                      {r.click_count > 0 && ` · ${(((r.order_count || 0) / r.click_count) * 100).toFixed(1)}% vásárlási arány`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {r.source === "auto_slow_movers" && <Badge variant="secondary" className="rounded-none text-[10px]">Automatikus</Badge>}
                    <Badge variant={r.status === "published" ? "default" : "secondary"} className="rounded-none text-[10px]">
                      {r.status === "published" ? "Publikált" : r.status === "approved" ? "Jóváhagyott" : "Vázlat"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default CampaignPerformanceCard;
