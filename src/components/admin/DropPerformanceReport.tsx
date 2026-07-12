import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, ShoppingCart, ShieldAlert, Timer } from "lucide-react";

interface Row {
  drop_id: string;
  name: string;
  slug: string;
  drop_type: string;
  status: string;
  starts_at: string;
  total_units: number;
  sold_count: number;
  view_count: number;
  entry_count: number;
  reservation_count: number;
  purchase_count: number;
  bot_blocks: number;
  view_to_intent_pct: number;
  intent_to_purchase_pct: number;
  sellout_seconds: number | null;
}

function fmtDuration(sec: number | null) {
  if (!sec) return "—";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}p`;
  return `${(sec / 3600).toFixed(1)}h`;
}

export default function DropPerformanceReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("drop_performance_stats" as any)
        .select("*")
        .order("starts_at", { ascending: false })
        .limit(50);
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!rows.length) return <Card className="p-10 text-center text-muted-foreground">Még nincs drop teljesítményadat.</Card>;

  return (
    <div className="space-y-3">
      <h3 className="font-heading text-xl">📈 Drop Performance Report</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-xs uppercase tracking-widest text-muted-foreground">
              <th className="text-left p-2">Drop</th>
              <th className="text-right p-2"><Users className="h-3 w-3 inline" /> Nézés</th>
              <th className="text-right p-2">Jelentkező / Foglalás</th>
              <th className="text-right p-2"><ShoppingCart className="h-3 w-3 inline" /> Vásárlás</th>
              <th className="text-right p-2"><TrendingUp className="h-3 w-3 inline" /> V→I%</th>
              <th className="text-right p-2"><TrendingUp className="h-3 w-3 inline" /> I→V%</th>
              <th className="text-right p-2"><ShieldAlert className="h-3 w-3 inline" /> Bot</th>
              <th className="text-right p-2"><Timer className="h-3 w-3 inline" /> Sellout</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.drop_id} className="border-b hover:bg-muted/30">
                <td className="p-2">
                  <div className="font-bold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">/{r.slug} · {r.drop_type} · {r.status}</div>
                </td>
                <td className="text-right p-2 font-mono">{r.view_count}</td>
                <td className="text-right p-2 font-mono">
                  {r.drop_type === "raffle" ? r.entry_count : r.reservation_count}
                </td>
                <td className="text-right p-2 font-mono">{r.purchase_count} / {r.total_units}</td>
                <td className="text-right p-2 font-mono">{r.view_to_intent_pct}%</td>
                <td className="text-right p-2 font-mono">{r.intent_to_purchase_pct}%</td>
                <td className={`text-right p-2 font-mono ${r.bot_blocks > 0 ? "text-red-500" : ""}`}>{r.bot_blocks}</td>
                <td className="text-right p-2 font-mono">{fmtDuration(r.sellout_seconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-muted-foreground">
        V→I% = nézés-ből érdeklődés (foglalás/jelentkezés) · I→V% = érdeklődésből vásárlás · Sellout = első indulástól utolsó vásárlásig
      </div>
    </div>
  );
}
