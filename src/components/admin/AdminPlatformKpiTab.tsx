import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Timer, ShieldCheck, Wrench, Coins, TrendingUp, Users, RefreshCw } from "lucide-react";
import {
  calcTimeToLive, calcFirstPassQa, calcHumanCorrectionRate, calcAiCostPerProject,
  calcConversionUplift, calcRetention,
  type MetricRow, type PilotRow, type AbRow,
} from "@/lib/platform-metrics";

const RANGES = [
  { key: "7", label: "7 nap" },
  { key: "30", label: "30 nap" },
  { key: "90", label: "90 nap" },
  { key: "all", label: "Teljes" },
];

const fmt = (v: number | null, unit = "", digits = 1) =>
  v === null || Number.isNaN(v) ? "—" : `${v.toFixed(digits)}${unit}`;

export default function AdminPlatformKpiTab() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [pilots, setPilots] = useState<PilotRow[]>([]);
  const [abTests, setAbTests] = useState<AbRow[]>([]);

  const load = async () => {
    setLoading(true);
    const since = range === "all"
      ? null
      : new Date(Date.now() - Number(range) * 86_400_000).toISOString();

    let q = supabase.from("platform_build_metrics").select("*").order("created_at", { ascending: false }).limit(5000);
    if (since) q = q.gte("created_at", since);

    const [mRes, pRes, abRes] = await Promise.all([
      q,
      supabase.from("pilot_partners").select("partner_id,status,joined_at,first_live_at,churned_at"),
      supabase.from("partner_ab_tests").select("variant_a_impressions,variant_b_impressions,variant_a_conversions,variant_b_conversions,status"),
    ]);
    setRows((mRes.data ?? []) as MetricRow[]);
    setPilots((pRes.data ?? []) as PilotRow[]);
    setAbTests((abRes.data ?? []) as AbRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [range]);

  const ttl = useMemo(() => calcTimeToLive(rows, pilots), [rows, pilots]);
  const fpq = useMemo(() => calcFirstPassQa(rows), [rows]);
  const hcr = useMemo(() => calcHumanCorrectionRate(rows), [rows]);
  const cost = useMemo(() => calcAiCostPerProject(rows), [rows]);
  const uplift = useMemo(() => calcConversionUplift(abTests), [abTests]);
  const retention = useMemo(() => calcRetention(pilots), [pilots]);

  const kpis = [
    {
      icon: Timer, label: "Time-to-live",
      value: ttl.avgHours === null ? "—" : ttl.avgHours < 24 ? `${ttl.avgHours.toFixed(1)} óra` : `${(ttl.avgHours / 24).toFixed(1)} nap`,
      sub: `${ttl.samples} élesített projekt`,
      target: "Cél: < 48 óra",
      good: ttl.avgHours !== null && ttl.avgHours <= 48,
    },
    {
      icon: ShieldCheck, label: "First-pass QA (90+)",
      value: fmt(fpq.pct, "%"), sub: `${fpq.pass} / ${fpq.total} első generálás`,
      target: "Cél: > 60%", good: (fpq.pct ?? 0) >= 60,
    },
    {
      icon: Wrench, label: "Kézi javítás aránya",
      value: fmt(hcr.pct, "%"), sub: `${hcr.human} kézi · ${hcr.ai} AI módosítás`,
      target: "Cél: < 30%", good: hcr.pct !== null && hcr.pct < 30,
    },
    {
      icon: Coins, label: "AI költség / projekt",
      value: cost.avgCost === null ? "—" : `${cost.avgCost.toFixed(3)} kredit`,
      sub: `${cost.projects} projekt · ${cost.avgTokens ? Math.round(cost.avgTokens).toLocaleString("hu") : 0} token átlag`,
      target: "Cél: < 1 kredit", good: cost.avgCost !== null && cost.avgCost < 1,
    },
    {
      icon: TrendingUp, label: "Conversion uplift",
      value: uplift.pct === null ? "—" : `${uplift.pct > 0 ? "+" : ""}${uplift.pct.toFixed(1)}%`,
      sub: `${uplift.samples} értékelhető A/B teszt`,
      target: "Cél: > +10%", good: (uplift.pct ?? 0) >= 10,
    },
    {
      icon: Users, label: "Partner retention (3 hó)",
      value: fmt(retention[1]?.pct ?? null, "%"),
      sub: `${retention[1]?.retained ?? 0} / ${retention[1]?.cohort ?? 0} partner`,
      target: "Cél: > 70%", good: (retention[1]?.pct ?? 0) >= 70,
    },
  ];

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl">📊 Platform KPI — bizonyítjuk, hogy működik</h2>
          <p className="text-sm text-muted-foreground">A 6 kulcsmutató valós adatokból, nem becslésből.</p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <Button key={r.key} size="sm" variant={range === r.key ? "default" : "outline"} onClick={() => setRange(r.key)}>
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <k.icon className="h-4 w-4" />{k.label}
              </span>
              <Badge variant={k.good ? "default" : "secondary"}>{k.good ? "OK" : "figyelni"}</Badge>
            </div>
            <p className="text-3xl font-bold">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.sub}</p>
            <p className="text-xs text-muted-foreground">{k.target}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="font-medium">Retention kohorszok</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {retention.map((r) => (
            <div key={r.month} className="border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">{r.month} hónap után</p>
              <p className="text-2xl font-bold">{fmt(r.pct, "%", 0)}</p>
              <p className="text-xs text-muted-foreground">{r.retained} / {r.cohort} partner</p>
            </div>
          ))}
        </div>
      </Card>

      {rows.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Még nincs mérési adat ebben az időszakban. Az adatgyűjtés automatikusan indul, amint egy partner AI generálást
          vagy kézi szerkesztést végez.
        </Card>
      )}
    </div>
  );
}
