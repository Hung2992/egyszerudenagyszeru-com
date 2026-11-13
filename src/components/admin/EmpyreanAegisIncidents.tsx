import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Inc = { id: string; agent: string; kind: string; severity: string; action_taken: string; event_count: number; findings: string[]; preserved_events: unknown[]; status: string; opened_at: string; resolved_at: string | null; resolution: string | null };
const kindLabel: Record<string, string> = { leak_isolate: "Adatszivárgás → automatikus elkülönítés", attack_wave: "Támadási hullám → riasztás", stop_storm: "Leállítási vihar" };

export default function EmpyreanAegisIncidents() {
  const [rows, setRows] = useState<Inc[] | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const load = () => supabase.from("aegis_incidents").select("*").order("opened_at", { ascending: false }).limit(30).then(({ data }) => setRows((data ?? []) as Inc[]));
  useEffect(() => { load(); }, []);
  const resolve = async (i: Inc, reactivate: boolean) => {
    const { error } = await supabase.rpc("aegis_resolve_incident", { _id: i.id, _resolution: note[i.id] ?? "", _reactivate: reactivate });
    if (error) return toast.error(error.message);
    toast.success(reactivate ? "Lezárva, a segéd újra aktív" : "Incidens lezárva");
    load();
  };
  const open = (rows ?? []).filter((r) => r.status === "open");
  return (
    <section className="space-y-2" aria-labelledby="aegis-inc">
      <h2 id="aegis-inc" className="text-lg font-medium">AEGIS · incidensek</h2>
      <p className="text-xs text-muted-foreground">Észlelés → elkülönítés → bizonyíték megőrzése. Ha egy AI-segéd válasza 10 percen belül 3-szor kitakarandó adatot tartalmaz, az AEGIS magától elkülöníti. 10+ veszélyes kérés 10 percen belül riasztást ad, de a segédet nem állítja le, hogy egy támadó ne tudja megbénítani a boltot.</p>
      <p className={`text-sm ${open.length ? "text-destructive" : "text-muted-foreground"}`}>{open.length ? `${open.length} nyitott incidens` : "Nincs nyitott incidens"}</p>
      {rows === null ? <p className="text-xs text-muted-foreground">Betöltés…</p> : rows.length === 0 ? <p className="text-xs text-muted-foreground">Még nem volt incidens.</p> : (
        <ul className="border border-border divide-y divide-border text-xs">
          {rows.map((i) => (
            <li key={i.id} className="p-2 space-y-1">
              <div className="flex flex-wrap gap-x-2">
                <span className={i.severity === "critical" ? "text-destructive font-medium" : "font-medium"}>{kindLabel[i.kind] ?? i.kind}</span>
                <span>{i.agent}</span>
                <span className="text-muted-foreground">{new Date(i.opened_at).toLocaleString("hu-HU")}</span>
                <span className="text-muted-foreground">{i.event_count} esemény · {i.findings.join(", ")} · {i.preserved_events.length} megőrzött bejegyzés</span>
              </div>
              {i.status === "open" ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <input value={note[i.id] ?? ""} onChange={(e) => setNote({ ...note, [i.id]: e.target.value })} placeholder="Mit vizsgáltál, mi volt az ok? (min. 20 karakter)" className="flex-1 min-w-[12rem] border border-border bg-background px-2 py-1" />
                  <button type="button" onClick={() => resolve(i, false)} className="border border-border px-2 py-1 hover:bg-muted">Lezárás</button>
                  {i.kind === "leak_isolate" && <button type="button" onClick={() => resolve(i, true)} className="border border-border px-2 py-1 hover:bg-muted">Lezárás + újraindítás</button>}
                </div>
              ) : <p className="text-muted-foreground">Lezárva {i.resolved_at && new Date(i.resolved_at).toLocaleString("hu-HU")}: {i.resolution}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
