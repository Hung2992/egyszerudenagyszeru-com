import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { Eye, Users, Monitor, Smartphone, Tablet, Globe, MousePointerClick, Clock, TrendingUp, ArrowUpRight } from "lucide-react";

interface PageView {
  id: string;
  page: string;
  referrer: string | null;
  device_type: string;
  session_id: string | null;
  visitor_id: string | null;
  created_at: string;
}

const DEVICE_COLORS = ["hsl(var(--accent))", "hsl(var(--muted-foreground))", "#8b5cf6"];

const AdminVisitorAnalytics = () => {
  const [views, setViews] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7" | "14" | "30">("14");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - parseInt(range));
      const { data } = await supabase
        .from("page_views")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      if (data) setViews(data);
      setLoading(false);
    };
    fetch();
  }, [range]);

  const stats = useMemo(() => {
    const uniqueVisitors = new Set(views.map(v => v.visitor_id).filter(Boolean)).size;
    const uniqueSessions = new Set(views.map(v => v.session_id).filter(Boolean)).size;
    const totalPageViews = views.length;
    const pagesPerSession = uniqueSessions > 0 ? (totalPageViews / uniqueSessions).toFixed(1) : "0";

    // Today stats
    const today = new Date().toDateString();
    const todayViews = views.filter(v => new Date(v.created_at).toDateString() === today);
    const todayVisitors = new Set(todayViews.map(v => v.visitor_id).filter(Boolean)).size;

    // Daily breakdown
    const dayMap: Record<string, { visitors: Set<string>; views: number }> = {};
    const now = new Date();
    for (let i = parseInt(range) - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { visitors: new Set(), views: 0 };
    }
    views.forEach(v => {
      const key = new Date(v.created_at).toISOString().slice(0, 10);
      if (dayMap[key]) {
        dayMap[key].views += 1;
        if (v.visitor_id) dayMap[key].visitors.add(v.visitor_id);
      }
    });
    const dailyData = Object.entries(dayMap).map(([date, d]) => ({
      name: new Date(date).toLocaleDateString("hu-HU", { month: "short", day: "numeric" }),
      látogatók: d.visitors.size,
      oldalmegtekintés: d.views,
    }));

    // Device breakdown
    const deviceMap: Record<string, number> = {};
    views.forEach(v => {
      const dt = v.device_type || "desktop";
      deviceMap[dt] = (deviceMap[dt] || 0) + 1;
    });
    const deviceData = Object.entries(deviceMap).map(([name, value]) => ({
      name: name === "mobile" ? "Mobil" : name === "tablet" ? "Tablet" : "Asztali",
      value,
    }));

    // Top pages
    const pageMap: Record<string, number> = {};
    views.forEach(v => { pageMap[v.page] = (pageMap[v.page] || 0) + 1; });
    const topPages = Object.entries(pageMap)
      .map(([page, count]) => ({ page: pageLabel(page), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Referrer breakdown
    const refMap: Record<string, number> = {};
    views.forEach(v => {
      let ref = "Közvetlen";
      if (v.referrer) {
        try {
          ref = new URL(v.referrer).hostname || "Közvetlen";
        } catch {
          ref = v.referrer.slice(0, 30);
        }
      }
      refMap[ref] = (refMap[ref] || 0) + 1;
    });
    const referrers = Object.entries(refMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Hourly heatmap
    const hourMap = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, látogatók: 0 }));
    views.forEach(v => {
      const h = new Date(v.created_at).getHours();
      hourMap[h].látogatók += 1;
    });

    return {
      uniqueVisitors, uniqueSessions, totalPageViews, pagesPerSession,
      todayVisitors, todayViews: todayViews.length,
      dailyData, deviceData, topPages, referrers, hourMap,
    };
  }, [views, range]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Eye className="h-4 w-4 text-accent" />
          Látogató analitika
        </h3>
        <div className="flex gap-1">
          {(["7", "14", "30"] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-[10px] uppercase tracking-wider font-bold border transition-colors ${
                range === r ? "bg-accent text-accent-foreground border-accent" : "text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {r} nap
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Egyedi látogatók" value={String(stats.uniqueVisitors)} accent />
        <StatCard icon={Eye} label="Oldalmegtekintés" value={String(stats.totalPageViews)} />
        <StatCard icon={MousePointerClick} label="Oldal/munkamenet" value={stats.pagesPerSession} />
        <StatCard icon={ArrowUpRight} label="Ma látogatók" value={String(stats.todayVisitors)} subtitle={`${stats.todayViews} megtekintés`} />
      </div>

      {/* Daily visitors chart */}
      <div className="border bg-card p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Napi látogatók és oldalmegtekintések</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stats.dailyData}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={Math.max(1, Math.floor(stats.dailyData.length / 7))} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }} />
            <Area type="monotone" dataKey="oldalmegtekintés" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeWidth={1.5} />
            <Area type="monotone" dataKey="látogatók" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Device + Top Pages + Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device breakdown */}
        <div className="border bg-card p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Eszköz típus</h4>
          {stats.deviceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={stats.deviceData} cx="50%" cy="50%" outerRadius={50} innerRadius={30} dataKey="value" strokeWidth={0}>
                    {stats.deviceData.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-1 justify-center">
                {stats.deviceData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                    {d.name === "Mobil" ? <Smartphone className="h-3 w-3" /> : d.name === "Tablet" ? <Tablet className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Nincs adat</p>
          )}
        </div>

        {/* Top Pages */}
        <div className="border bg-card p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Top oldalak</h4>
          <div className="space-y-2">
            {stats.topPages.map((p, i) => {
              const max = stats.topPages[0]?.count || 1;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-foreground truncate">{p.page}</span>
                    <span className="text-muted-foreground ml-2 flex-shrink-0">{p.count}</span>
                  </div>
                  <div className="h-1 bg-muted overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${(p.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {stats.topPages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nincs adat</p>}
          </div>
        </div>

        {/* Referrers */}
        <div className="border bg-card p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-accent" />
            Forgalom forrása
          </h4>
          <div className="space-y-2">
            {stats.referrers.map((r, i) => {
              const max = stats.referrers[0]?.value || 1;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-foreground truncate">{r.name}</span>
                    <span className="text-muted-foreground ml-2 flex-shrink-0">{r.value}</span>
                  </div>
                  <div className="h-1 bg-muted overflow-hidden">
                    <div className="h-full bg-muted-foreground/50 transition-all" style={{ width: `${(r.value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {stats.referrers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nincs adat</p>}
          </div>
        </div>
      </div>

      {/* Hourly heatmap */}
      <div className="border bg-card p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-accent" />
          Forgalom óránként
        </h4>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={stats.hourMap}>
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={20} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }} />
            <Bar dataKey="látogatók" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value, accent, subtitle }: {
  icon: any; label: string; value: string; accent?: boolean; subtitle?: string;
}) {
  return (
    <div className="border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent ? "text-accent" : "text-muted-foreground"}`} />
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function pageLabel(path: string): string {
  const map: Record<string, string> = {
    "/": "Főoldal",
    "/shop": "Bolt",
    "/checkout": "Fizetés",
    "/auth": "Bejelentkezés",
    "/profile": "Profil",
    "/orders": "Rendelések",
    "/contact": "Kapcsolat",
    "/wishlist": "Kívánságlista",
    "/loyalty": "Hűségprogram",
    "/gift-cards": "Ajándékkártya",
    "/community": "Közösség",
    "/shipping": "Szállítás",
    "/size-guide": "Mérettáblázat",
    "/nyeremenyjatek": "Nyereményjáték",
  };
  return map[path] || path;
}

export default AdminVisitorAnalytics;
