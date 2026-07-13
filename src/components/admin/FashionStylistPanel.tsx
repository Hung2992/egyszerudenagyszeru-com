// Sprint B.5 — Fashion Stylist admin analytics
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2 } from "lucide-react";

export default function FashionStylistPanel() {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [added, setAdded] = useState(0);
  const [purchased, setPurchased] = useState(0);
  const [avgPrice, setAvgPrice] = useState(0);
  const [byOccasion, setByOccasion] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("ai_stylist_sessions")
        .select("id, occasion, style, total_price, added_to_cart, purchased, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as any[];
      setTotal(rows.length);
      setAdded(rows.filter(r => r.added_to_cart).length);
      setPurchased(rows.filter(r => r.purchased).length);
      const prices = rows.map(r => Number(r.total_price || 0)).filter(n => n > 0);
      setAvgPrice(prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0);
      const occ: Record<string, number> = {};
      rows.forEach(r => { const k = r.occasion || "n/a"; occ[k] = (occ[k] || 0) + 1; });
      setByOccasion(occ);
      setRecent(rows.slice(0, 10));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center gap-2 py-8"><Loader2 className="h-4 w-4 animate-spin" />Betöltés…</div>;

  const cartRate = total > 0 ? Math.round((added / total) * 100) : 0;
  const buyRate = total > 0 ? Math.round((purchased / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Stylist szessziók (30n)</div>
          <div className="text-2xl font-bold">{total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">→ Kosárba</div>
          <div className="text-2xl font-bold">{cartRate}%</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">→ Vásárlás</div>
          <div className="text-2xl font-bold">{buyRate}%</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Átlag szett ár</div>
          <div className="text-2xl font-bold">{avgPrice.toLocaleString("hu-HU")} Ft</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="h-4 w-4" />Alkalmak megoszlása</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byOccasion).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="border border-border p-2 min-w-[100px]">
                <div className="text-[10px] uppercase text-muted-foreground">{k}</div>
                <div className="text-lg font-bold">{v}</div>
              </div>
            ))}
            {Object.keys(byOccasion).length === 0 && <div className="text-sm text-muted-foreground">Még nincs adat.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Legutóbbi kérések</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {recent.map(r => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 border-b border-border py-1">
                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("hu-HU")}</span>
                <span className="text-xs px-1 border border-border">{r.occasion || "-"}</span>
                <span className="text-xs px-1 border border-border">{r.style || "-"}</span>
                <span className="text-xs">{Number(r.total_price || 0).toLocaleString("hu-HU")} Ft</span>
                {r.added_to_cart && <span className="text-[10px] px-1 bg-foreground text-background">KOSÁR</span>}
                {r.purchased && <span className="text-[10px] px-1 bg-foreground text-background">VÁSÁRLÁS</span>}
              </div>
            ))}
            {recent.length === 0 && <div className="text-muted-foreground">Nincs bejegyzés.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
