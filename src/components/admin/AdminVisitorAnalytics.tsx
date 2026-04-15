import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { Eye, Users, Monitor, Smartphone, Tablet, Globe, MousePointerClick, Clock, ArrowUpRight, ShoppingCart, TrendingUp, Activity, Zap, Target, UserCheck, UserPlus, Timer } from "lucide-react";

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
const FUNNEL_COLORS = ["#22c55e", "#3b82f6", "#eab308", "#ef4444"];

const AdminVisitorAnalytics = () => {
  const [views, setViews] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7" | "14" | "30">("14");
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, [range]);

  // Live visitor count (last 5 min)
  useEffect(() => {
    const fetchLive = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("page_views")
        .select("visitor_id")
        .gte("created_at", fiveMinAgo);
      if (data) {
        setLiveCount(new Set(data.map((d: any) => d.visitor_id).filter(Boolean)).size);
      }
    };
    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const uniqueVisitors = new Set(views.map(v => v.visitor_id).filter(Boolean)).size;
    const uniqueSessions = new Set(views.map(v => v.session_id).filter(Boolean)).size;
    const totalPageViews = views.length;
    const pagesPerSession = uniqueSessions > 0 ? (totalPageViews / uniqueSessions).toFixed(1) : "0";

    // Today
    const today = new Date().toDateString();
    const todayViews = views.filter(v => new Date(v.created_at).toDateString() === today);
    const todayVisitors = new Set(todayViews.map(v => v.visitor_id).filter(Boolean)).size;

    // New vs Returning visitors
    const visitorFirstSeen: Record<string, string> = {};
    const allViews = [...views].reverse();
    allViews.forEach(v => {
      if (v.visitor_id && !visitorFirstSeen[v.visitor_id]) {
        visitorFirstSeen[v.visitor_id] = v.created_at;
      }
    });
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - parseInt(range));
    const allVisitorIds = new Set(views.map(v => v.visitor_id).filter(Boolean));
    let newVisitors = 0, returningVisitors = 0;
    allVisitorIds.forEach(vid => {
      const first = visitorFirstSeen[vid!];
      if (first && new Date(first) >= rangeStart) newVisitors++;
      else returningVisitors++;
    });

    // Daily breakdown
    const dayMap: Record<string, { visitors: Set<string>; views: number; newV: Set<string> }> = {};
    const now = new Date();
    for (let i = parseInt(range) - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { visitors: new Set(), views: 0, newV: new Set() };
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
    views.forEach(v => { deviceMap[v.device_type || "desktop"] = (deviceMap[v.device_type || "desktop"] || 0) + 1; });
    const deviceData = Object.entries(deviceMap).map(([name, value]) => ({
      name: name === "mobile" ? "Mobil" : name === "tablet" ? "Tablet" : "Asztali",
      value,
    }));

    // Top pages
    const pageMap: Record<string, number> = {};
    views.forEach(v => { pageMap[v.page] = (pageMap[v.page] || 0) + 1; });
    const topPages = Object.entries(pageMap)
      .map(([page, count]) => ({ page: pageLabel(page), raw: page, count }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    // Referrers
    const refMap: Record<string, number> = {};
    views.forEach(v => {
      let ref = "Közvetlen";
      if (v.referrer) { try { ref = new URL(v.referrer).hostname || "Közvetlen"; } catch { ref = v.referrer.slice(0, 30); } }
      refMap[ref] = (refMap[ref] || 0) + 1;
    });
    const referrers = Object.entries(refMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

    // Hourly heatmap
    const hourMap = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, látogatók: 0 }));
    views.forEach(v => { hourMap[new Date(v.created_at).getHours()].látogatók += 1; });

    // Conversion funnel
    const funnelSessions = new Set(views.map(v => v.session_id).filter(Boolean));
    const sessionPages: Record<string, Set<string>> = {};
    views.forEach(v => {
      if (!v.session_id) return;
      if (!sessionPages[v.session_id]) sessionPages[v.session_id] = new Set();
      sessionPages[v.session_id].add(v.page);
    });
    const visitedHome = Object.values(sessionPages).filter(s => s.has("/")).length;
    const visitedShop = Object.values(sessionPages).filter(s => s.has("/shop") || [...s].some(p => p.startsWith("/product/"))).length;
    const visitedCheckout = Object.values(sessionPages).filter(s => s.has("/checkout")).length;
    const visitedAuth = Object.values(sessionPages).filter(s => s.has("/auth")).length;
    const funnelData = [
      { name: "Főoldal", value: visitedHome },
      { name: "Termékek", value: visitedShop },
      { name: "Fizetés", value: visitedCheckout },
      { name: "Regisztráció", value: visitedAuth },
    ];

    // Bounce rate (sessions with only 1 page view)
    const sessionViewCounts: Record<string, number> = {};
    views.forEach(v => {
      if (!v.session_id) return;
      sessionViewCounts[v.session_id] = (sessionViewCounts[v.session_id] || 0) + 1;
    });
    const totalSess = Object.keys(sessionViewCounts).length;
    const bouncedSessions = Object.values(sessionViewCounts).filter(c => c === 1).length;
    const bounceRate = totalSess > 0 ? ((bouncedSessions / totalSess) * 100).toFixed(0) : "0";

    // Avg session depth
    const avgDepth = totalSess > 0 ? (Object.values(sessionViewCounts).reduce((a, b) => a + b, 0) / totalSess).toFixed(1) : "0";

    // Peak hour
    const peakHour = hourMap.reduce((max, h) => h.látogatók > max.látogatók ? h : max, hourMap[0]);

    return {
      uniqueVisitors, uniqueSessions, totalPageViews, pagesPerSession,
      todayVisitors, todayViews: todayViews.length,
      newVisitors, returningVisitors,
      dailyData, deviceData, topPages, referrers, hourMap,
      funnelData, bounceRate, avgDepth, peakHour,
    };
  }, [views, range]);

  if (loading) {
    return (
      <div className="space-y-4 mt-6">
        <div className="h-8 bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-8">
      {/* Header + Range */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
          <Eye className="h-5 w-5 text-accent" />
          Látogató analitika
        </h3>
        <div className="flex gap-1 items-center">
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-green-400 mr-3 animate-pulse">
              <Activity className="h-3 w-3" />
              {liveCount} élő
            </span>
          )}
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

      {/* Main KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Egyedi látogatók" value={String(stats.uniqueVisitors)} accent />
        <StatCard icon={Eye} label="Oldalmegtekintés" value={String(stats.totalPageViews)} />
        <StatCard icon={MousePointerClick} label="Oldal/munkamenet" value={stats.pagesPerSession} />
        <StatCard icon={ArrowUpRight} label="Ma látogatók" value={String(stats.todayVisitors)} subtitle={`${stats.todayViews} megtekintés`} />
      </div>

      {/* Engagement KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={UserPlus} label="Új látogatók" value={String(stats.newVisitors)} subtitle={`${stats.uniqueVisitors > 0 ? ((stats.newVisitors / stats.uniqueVisitors) * 100).toFixed(0) : 0}%`} />
        <StatCard icon={UserCheck} label="Visszatérő" value={String(stats.returningVisitors)} subtitle={`${stats.uniqueVisitors > 0 ? ((stats.returningVisitors / stats.uniqueVisitors) * 100).toFixed(0) : 0}%`} />
        <StatCard icon={Target} label="Visszaford. arány" value={`${stats.bounceRate}%`} subtitle={stats.bounceRate === "0" ? "" : Number(stats.bounceRate) > 70 ? "⚠️ Magas" : "✅ Jó"} />
        <StatCard icon={Zap} label="Csúcsidő" value={stats.peakHour.name} subtitle={`${stats.peakHour.látogatók} megtekintés`} />
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

      {/* Conversion Funnel */}
      <div className="border bg-card p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <ShoppingCart className="h-3.5 w-3.5 text-accent" />
          Konverziós tölcsér (munkamenetek)
        </h4>
        <div className="flex items-end gap-2 h-32">
          {stats.funnelData.map((step, i) => {
            const maxVal = Math.max(...stats.funnelData.map(f => f.value), 1);
            const pct = (step.value / maxVal) * 100;
            const convRate = i > 0 && stats.funnelData[i - 1].value > 0
              ? ((step.value / stats.funnelData[i - 1].value) * 100).toFixed(0)
              : "100";
            return (
              <div key={step.name} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{i > 0 ? `${convRate}%` : ""}</span>
                <div className="w-full relative" style={{ height: `${Math.max(pct, 8)}%` }}>
                  <div className="absolute inset-0" style={{ backgroundColor: FUNNEL_COLORS[i], opacity: 0.8 }} />
                </div>
                <span className="text-xs font-bold text-foreground">{step.value}</span>
                <span className="text-[9px] text-muted-foreground text-center">{step.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Device + Top Pages + Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device */}
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

      {/* Hourly + New vs Returning */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* New vs Returning Pie */}
        <div className="border bg-card p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Új vs visszatérő látogatók</h4>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={120}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Új", value: stats.newVisitors },
                    { name: "Visszatérő", value: stats.returningVisitors },
                  ]}
                  cx="50%" cy="50%" outerRadius={45} innerRadius={25} dataKey="value" strokeWidth={0}
                >
                  <Cell fill="hsl(var(--accent))" />
                  <Cell fill="hsl(var(--muted-foreground))" />
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-accent" />
                <div>
                  <p className="text-sm font-bold text-foreground">{stats.newVisitors}</p>
                  <p className="text-[10px] text-muted-foreground">Új látogató</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-muted-foreground" />
                <div>
                  <p className="text-sm font-bold text-foreground">{stats.returningVisitors}</p>
                  <p className="text-[10px] text-muted-foreground">Visszatérő</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session depth distribution */}
      <div className="border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-accent" />
            Összesítés
          </h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 border">
            <p className="text-2xl font-bold text-accent">{stats.uniqueSessions}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Munkamenet</p>
          </div>
          <div className="text-center p-3 border">
            <p className="text-2xl font-bold text-foreground">{stats.avgDepth}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Átl. mélység</p>
          </div>
          <div className="text-center p-3 border">
            <p className="text-2xl font-bold text-foreground">{stats.bounceRate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Visszaford.</p>
          </div>
          <div className="text-center p-3 border">
            <p className="text-2xl font-bold text-foreground">{stats.totalPageViews}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Össz. megtekintés</p>
          </div>
        </div>
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
    "/": "Főoldal", "/shop": "Bolt", "/checkout": "Fizetés", "/auth": "Bejelentkezés",
    "/profile": "Profil", "/orders": "Rendelések", "/contact": "Kapcsolat",
    "/wishlist": "Kívánságlista", "/loyalty": "Hűségprogram", "/gift-cards": "Ajándékkártya",
    "/community": "Közösség", "/shipping": "Szállítás", "/size-guide": "Mérettáblázat",
    "/nyeremenyjatek": "Nyereményjáték",
  };
  if (map[path]) return map[path];
  if (path.startsWith("/product/")) return `Termék #${path.split("/")[2]?.slice(0, 6) || ""}`;
  return path;
}

export default AdminVisitorAnalytics;
