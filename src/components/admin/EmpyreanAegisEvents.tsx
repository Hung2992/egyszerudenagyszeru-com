import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ev = { id: string; source: string; stage: string; action: string; findings: string[]; created_at: string };
const label: Record<string, string> = {
  prompt_injection: "Szabály-felülírás", privilege: "Jogosultság-emelés", ssrf: "Belső cím", card_data: "Kártyaszám",
  jwt: "Hozzáférési kulcs", api_key: "API-kulcs", credential: "Titok/jelszó", mass_change: "Tömeges művelet", money: "Pénzmozgás",
};
const actionLabel: Record<string, string> = { blocked: "Blokkolva", redacted: "Kitakarva", flagged: "Jelezve" };
const clean = (f: string) => f.replace(/^(block|warn):/, "");

export default function EmpyreanAegisEvents() {
  const [ev, setEv] = useState<Ev[] | null>(null);
  useEffect(() => {
    supabase.from("aegis_events").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setEv((data ?? []) as Ev[]));
  }, []);
  const since = Date.now() - 30 * 864e5;
  const recent = (ev ?? []).filter((e) => new Date(e.created_at).getTime() >= since);
  const count = (a: string) => recent.filter((e) => e.action === a).length;
  return (
    <section className="space-y-2" aria-labelledby="aegis-ev">
      <h2 id="aegis-ev" className="text-lg font-medium">AEGIS · események</h2>
      <p className="text-xs text-muted-foreground">Az AI-hívások bemenetét jelzi, a kimenetből kitakarja a kártyaszámot és a kulcsokat, a munkatervekben blokkol.</p>
      <div className="grid grid-cols-3 gap-px bg-border border border-border text-center">
        {(["blocked", "redacted", "flagged"] as const).map((a) => (
          <div key={a} className="bg-background p-2"><p className="text-xl">{count(a)}</p><p className="text-xs text-muted-foreground">{actionLabel[a]} · 30 nap</p></div>
        ))}
      </div>
      {ev === null ? <p className="text-xs text-muted-foreground">Betöltés…</p> : ev.length === 0 ? <p className="text-xs text-muted-foreground">Még nincs AEGIS esemény.</p> : (
        <ul className="border border-border divide-y divide-border text-xs">
          {ev.map((e) => (
            <li key={e.id} className="p-2 flex flex-wrap gap-x-2">
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("hu-HU")}</span>
              <span className={e.action === "blocked" ? "text-destructive" : ""}>{actionLabel[e.action]}</span>
              <span>{e.findings.map((f) => label[clean(f)] ?? clean(f)).join(", ")}</span>
              <span className="text-muted-foreground">{e.source}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
