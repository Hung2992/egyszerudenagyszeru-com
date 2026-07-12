// Sprint B.4 — Try-On Conversion Funnel dashboard
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, ArrowRight, Sparkles } from "lucide-react";

const STAGES = [
  { key: "tryon_open", label: "Try-On megnyitva" },
  { key: "tryon_photo_upload", label: "Fotó feltöltve" },
  { key: "tryon_generated", label: "AI kép generálva" },
  { key: "tryon_share", label: "Megosztás" },
  { key: "tryon_add_to_cart", label: "Kosárba" },
] as const;

export default function TryOnFunnel() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [genCount, setGenCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: events }, { data: gens }] = await Promise.all([
        supabase.from("tryon_events").select("event_type").gte("created_at", since),
        supabase.from("tryon_generations").select("status").gte("created_at", since),
      ]);
      const c: Record<string, number> = {};
      (events ?? []).forEach((r: any) => { c[r.event_type] = (c[r.event_type] || 0) + 1; });
      setCounts(c);
      setGenCount((gens ?? []).filter((g: any) => g.status === "completed").length);
      setFailCount((gens ?? []).filter((g: any) => g.status === "failed").length);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center gap-2 py-8"><Loader2 className="h-4 w-4 animate-spin" />Betöltés…</div>;

  const first = counts[STAGES[0].key] || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Sikeres generálás (30n)</div>
          <div className="text-2xl font-bold">{genCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Hibás</div>
          <div className="text-2xl font-bold">{failCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Try-On → Kosár</div>
          <div className="text-2xl font-bold">
            {first > 0 ? Math.round(((counts["tryon_add_to_cart"] || 0) / first) * 100) : 0}%
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Foto→Gen rate</div>
          <div className="text-2xl font-bold">
            {(counts["tryon_photo_upload"] || 0) > 0
              ? Math.round(((counts["tryon_generated"] || 0) / (counts["tryon_photo_upload"] || 1)) * 100)
              : 0}%
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Try-On tölcsér (30 nap)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {STAGES.map((s, i) => {
              const n = counts[s.key] || 0;
              const pct = first > 0 ? Math.round((n / first) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className="border p-3 min-w-[130px]">
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    <div className="text-lg font-bold">{n}</div>
                    <div className="text-[10px]">{pct}%</div>
                  </div>
                  {i < STAGES.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
