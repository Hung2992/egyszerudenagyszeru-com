import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SEO_ISSUE_LABELS } from "@/lib/empyrean-bi";

type Row = { product_id: string; title: string; issues: string[]; score: number };

export default function EmpyreanAutomation({ onPick }: { onPick: (productId: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const { data, error: e } = await supabase.rpc("empyrean_seo_audit", { _limit: 50 });
    if (e) setError(e.message); else setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <section className="space-y-3" aria-labelledby="empyrean-auto">
      <div className="flex items-center justify-between gap-2">
        <h2 id="empyrean-auto" className="text-lg font-medium">Automatikus SEO-felderítés</h2>
        <Button size="sm" variant="ghost" className="rounded-none" disabled={loading} onClick={() => void load()}>Újrafuttatás</Button>
      </div>
      <p className="text-xs text-muted-foreground">Az ügynök csak felderít és javaslatot készít elő. Mentés kizárólag jóváhagyás után, a MISSIONS láncon fut.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!error && rows.length === 0 && !loading && <p className="text-sm text-muted-foreground">Minden aktív termék megfelel a szabályoknak.</p>}
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <li key={r.product_id} className="py-3 flex flex-wrap items-center gap-2 justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{r.title || "(cím nélkül)"}</p>
              <p className="text-xs text-muted-foreground">{r.issues.map((i) => SEO_ISSUE_LABELS[i] ?? i).join(" · ")}</p>
            </div>
            <span className="text-xs w-12 text-right">{r.score}/100</span>
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => onPick(r.product_id)}>Javaslat</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
