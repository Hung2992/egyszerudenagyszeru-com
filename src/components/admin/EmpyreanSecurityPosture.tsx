import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Posture = {
  generated_at: string; public_tables: number; tables_without_rls: string[]; open_read_policies: number;
  open_write_policies: number; definer_without_search_path: number; emergency_paused: boolean; unverified_executions: number;
};

export default function EmpyreanSecurityPosture() {
  const [p, setP] = useState<Posture | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    const { data, error: e } = await supabase.rpc("empyrean_security_posture");
    if (e) setError(e.message); else setP(data as unknown as Posture);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const items = p ? [
    ["Publikus tábla", p.public_tables, false],
    ["RLS nélküli tábla", p.tables_without_rls.length, p.tables_without_rls.length > 0],
    ["Nyitott olvasási szabály", p.open_read_policies, p.open_read_policies > 0],
    ["Nyitott írási szabály", p.open_write_policies, p.open_write_policies > 0],
    ["Védett függvény search_path nélkül", p.definer_without_search_path, p.definer_without_search_path > 0],
    ["Ellenőrzésre váró végrehajtás", p.unverified_executions, p.unverified_executions > 0],
  ] as const : [];
  return (
    <section className="space-y-3" aria-labelledby="empyrean-sec">
      <div className="flex items-center justify-between">
        <h2 id="empyrean-sec" className="text-lg font-medium">AEGIS · biztonsági állapot</h2>
        <Button size="sm" variant="ghost" className="rounded-none" onClick={() => void load()}>Frissítés</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {p && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border border border-border">
            {items.map(([l, v, warn]) => (
              <div key={l} className="bg-background p-3">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className={`text-xl ${warn ? "text-destructive" : ""}`}>{v}</p>
              </div>
            ))}
          </div>
          {p.tables_without_rls.length > 0 && <p className="text-xs text-destructive break-words">RLS nélkül: {p.tables_without_rls.join(", ")}</p>}
          <p className="text-xs text-muted-foreground">FACT · élő adatbázis-katalógus · {new Date(p.generated_at).toLocaleString("hu-HU")}</p>
        </>
      )}
    </section>
  );
}
