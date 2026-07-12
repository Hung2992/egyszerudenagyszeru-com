// Admin AI Dashboard - KPI-k, konverziós arányok, cache hit, kvóta, kérdések
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Sparkles, MessageCircle, ShoppingCart, TrendingUp, Zap, DollarSign, RefreshCw, Loader2, Clock, AlertOctagon, Megaphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Kpis {
  assistantOpens: number;
  assistantMessages: number;
  suggestionsShown: number;
  suggestionsClicked: number;
  suggestionsAdded: number;
  suggestionsPurchased: number;
  cacheHitRate: number;
  cacheEntries: number;
  totalQuotaRequests: number;
  totalCost: number;
  segmentsGenerated: number;
  avgLatencyMs: number;
  failedCalls: number;
  aiRevenue: number;
  aiConversionRate: number;
}
interface TopCampaign { name: string; sent: number; opens: number; clicks: number }

const RANGES = [
  { key: "24h", label: "24 óra", ms: 24 * 3600_000 },
  { key: "7d", label: "7 nap", ms: 7 * 24 * 3600_000 },
  { key: "30d", label: "30 nap", ms: 30 * 24 * 3600_000 },
];

const AdminAiDashboard = () => {
  const [range, setRange] = useState("7d");
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [topQuestions, setTopQuestions] = useState<{ q: string; count: number }[]>([]);

  const load = async () => {
    setLoading(true);
    const rangeMs = RANGES.find(r => r.key === range)?.ms || 7 * 24 * 3600_000;
    const from = new Date(Date.now() - rangeMs).toISOString();

    // Events aggregation
    const { data: events } = await (supabase.from("ai_events" as any) as any)
      .select("event_type").gte("created_at", from);
    const count = (t: string) => (events || []).filter((e: any) => e.event_type === t).length;

    // Cache stats
    const { data: cache } = await (supabase.from("ai_response_cache" as any) as any)
      .select("hit_count", { count: "exact" });
    const totalHits = (cache || []).reduce((s: number, c: any) => s + (c.hit_count || 0), 0);
    const cacheEntries = (cache || []).length;
    const totalRequests = totalHits + cacheEntries;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    // Quota / cost
    const { data: quota } = await (supabase.from("ai_usage_quota" as any) as any)
      .select("request_count, estimated_cost_credits").gte("usage_date", from.slice(0, 10));
    const quotaTotal = (quota || []).reduce((s: number, q: any) => s + (q.request_count || 0), 0);
    const costTotal = (quota || []).reduce((s: number, q: any) => s + Number(q.estimated_cost_credits || 0), 0);

    // Top questions from conversations
    const { data: convos } = await (supabase.from("ai_shopping_conversations" as any) as any)
      .select("user_message").gte("created_at", from).limit(500);
    const freq: Record<string, number> = {};
    (convos || []).forEach((c: any) => {
      const q = String(c.user_message || "").toLowerCase().trim().slice(0, 80);
      if (q.length > 3) freq[q] = (freq[q] || 0) + 1;
    });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([q, count]) => ({ q, count }));
    setTopQuestions(top);

    setKpis({
      assistantOpens: count("assistant_open"),
      assistantMessages: count("assistant_message"),
      suggestionsShown: count("cart_suggestion_shown"),
      suggestionsClicked: count("cart_suggestion_click"),
      suggestionsAdded: count("cart_suggestion_added"),
      suggestionsPurchased: count("cart_suggestion_purchased"),
      cacheHitRate: hitRate,
      cacheEntries,
      totalQuotaRequests: quotaTotal,
      totalCost: costTotal,
      segmentsGenerated: count("marketing_segment_generated"),
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [range]);

  const clickRate = kpis && kpis.suggestionsShown > 0 ? (kpis.suggestionsClicked / kpis.suggestionsShown) * 100 : 0;
  const addRate = kpis && kpis.suggestionsShown > 0 ? (kpis.suggestionsAdded / kpis.suggestionsShown) * 100 : 0;
  const purchaseRate = kpis && kpis.suggestionsAdded > 0 ? (kpis.suggestionsPurchased / kpis.suggestionsAdded) * 100 : 0;
  const msgPerOpen = kpis && kpis.assistantOpens > 0 ? kpis.assistantMessages / kpis.assistantOpens : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wider">AI Dashboard</h2>
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`text-[10px] px-2 py-1 border ${range === r.key ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground"}`}>
              {r.label}
            </button>
          ))}
          <Button onClick={load} size="icon" variant="ghost" className="h-7 w-7">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* KPI kártyák */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard icon={MessageCircle} label="Widget megnyitás" value={kpis?.assistantOpens ?? "-"} />
        <KpiCard icon={MessageCircle} label="AI üzenetek" value={kpis?.assistantMessages ?? "-"}
          sub={`${msgPerOpen.toFixed(1)} / megnyitás`} />
        <KpiCard icon={ShoppingCart} label="Ajánlás megjelenítés" value={kpis?.suggestionsShown ?? "-"} />
        <KpiCard icon={TrendingUp} label="Ajánlás → kosár" value={kpis?.suggestionsAdded ?? "-"}
          sub={`${addRate.toFixed(1)}% konv.`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard icon={TrendingUp} label="Vásárlás ajánlásból" value={kpis?.suggestionsPurchased ?? "-"}
          sub={`${purchaseRate.toFixed(1)}% vásárlás`} highlight />
        <KpiCard icon={Zap} label="Cache találati arány" value={`${kpis?.cacheHitRate.toFixed(1) ?? "-"}%`}
          sub={`${kpis?.cacheEntries ?? 0} bejegyzés`} />
        <KpiCard icon={DollarSign} label="AI kérések (időszak)" value={kpis?.totalQuotaRequests ?? "-"} />
        <KpiCard icon={DollarSign} label="Becs. költség (kredit)"
          value={kpis ? kpis.totalCost.toFixed(2) : "-"} sub="tokenalapú becslés" />
      </div>

      {/* Konverziós tölcsér */}
      {kpis && kpis.suggestionsShown > 0 && (
        <div className="border border-border p-4 bg-card space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Smart Cart konverziós tölcsér</p>
          <FunnelBar label="Megjelenítés" value={kpis.suggestionsShown} max={kpis.suggestionsShown} />
          <FunnelBar label="Kattintás" value={kpis.suggestionsClicked} max={kpis.suggestionsShown}
            rate={`${clickRate.toFixed(1)}%`} />
          <FunnelBar label="Kosárba" value={kpis.suggestionsAdded} max={kpis.suggestionsShown}
            rate={`${addRate.toFixed(1)}%`} />
          <FunnelBar label="Vásárlás" value={kpis.suggestionsPurchased} max={kpis.suggestionsShown}
            rate={`${((kpis.suggestionsPurchased / kpis.suggestionsShown) * 100).toFixed(1)}%`} highlight />
        </div>
      )}

      {/* Top kérdések */}
      <div className="border border-border p-4 bg-card space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Leggyakoribb AI kérdések</p>
        {topQuestions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Még nincs elég adat.</p>
        ) : (
          <div className="space-y-1">
            {topQuestions.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="text-foreground truncate mr-2">{t.q}</span>
                <span className="text-accent font-bold">{t.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, sub, highlight }: any) => (
  <div className={`border p-3 bg-card ${highlight ? "border-accent" : "border-border"}`}>
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={`w-3 h-3 ${highlight ? "text-accent" : "text-muted-foreground"}`} />
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
    </div>
    <p className={`text-2xl font-bold ${highlight ? "text-accent" : ""}`}>{value}</p>
    {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const FunnelBar = ({ label, value, max, rate, highlight }: any) => (
  <div className="space-y-0.5">
    <div className="flex justify-between text-[10px]">
      <span>{label}</span>
      <span className={highlight ? "text-accent font-bold" : ""}>{value}{rate ? ` • ${rate}` : ""}</span>
    </div>
    <div className="h-1.5 bg-muted overflow-hidden">
      <div className={`h-full transition-all ${highlight ? "bg-accent" : "bg-foreground"}`}
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
  </div>
);

export default AdminAiDashboard;
