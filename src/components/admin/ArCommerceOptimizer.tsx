// Sprint B.3 — AI AR Commerce Optimizer panel
import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Package, Box, Megaphone, TrendingUp } from "lucide-react";

type Insight = { title: string; reasoning: string; action: string; impact?: "low" | "medium" | "high" };
type Response = {
  ok: boolean;
  insights: { product: Insight[]; asset: Insight[]; marketing: Insight[]; summary: string; generated_at: string };
  context_summary?: any;
  tokens?: number;
};

const impactColor: Record<string, string> = {
  high: "border-emerald-500/40 bg-emerald-500/5",
  medium: "border-amber-500/40 bg-amber-500/5",
  low: "border-border bg-muted/30",
};

function InsightList({ items, icon: Icon, title }: { items: Insight[]; icon: any; title: string }) {
  if (!items || items.length === 0) {
    return (
      <div className="border border-dashed border-border p-4 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 mb-1" />
        {title}: nincs elég adat javaslathoz.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
        <Icon className="h-4 w-4" /> {title} ({items.length})
      </div>
      {items.map((it, i) => (
        <div key={i} className={`border p-3 ${impactColor[it.impact ?? "low"]}`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-bold text-sm">{it.title}</div>
            {it.impact && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 border border-current">
                {it.impact}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mb-2">{it.reasoning}</div>
          <div className="text-xs flex items-start gap-1">
            <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary" />
            <span><b>Teendő:</b> {it.action}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ArCommerceOptimizer() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Response | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("ar-commerce-optimizer", { body: {} });
      if (error) throw error;
      if (!res?.ok) throw new Error(res?.error || "Ismeretlen hiba");
      setData(res as Response);
      toast({ title: "AI elemzés kész ✅" });
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI AR Commerce Optimizer
          </span>
          <Button onClick={run} disabled={loading} size="sm" className="rounded-none uppercase text-xs">
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            {data ? "Újraszámítás" : "Elemzés indítása"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data && !loading && (
          <div className="text-sm text-muted-foreground">
            Kattints az <b>Elemzés indítása</b> gombra — az AI végignézi az utolsó 30 nap AR használati és rendelési adatait, és konkrét,
            számokra épülő optimalizálási javaslatokat ad termékekre, 3D assetekre és marketing kampányokra.
          </div>
        )}

        {data && (
          <>
            <div className="border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs font-bold uppercase tracking-wider mb-1">Vezetői összefoglaló</div>
              <div className="text-sm">{data.insights.summary}</div>
              <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                {new Date(data.insights.generated_at).toLocaleString("hu-HU")} • {data.tokens ?? 0} token
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <InsightList items={data.insights.product ?? []} icon={Package} title="Termék" />
              <InsightList items={data.insights.asset ?? []} icon={Box} title="3D Asset" />
              <InsightList items={data.insights.marketing ?? []} icon={Megaphone} title="Marketing" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
