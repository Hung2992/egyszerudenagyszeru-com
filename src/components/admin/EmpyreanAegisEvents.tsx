import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ev = { id: string; source: string; stage: string; action: string; findings: string[]; created_at: string };
const label: Record<string, string> = {
  prompt_injection: "Szabály-felülírás", privilege: "Jogosultság-emelés", ssrf: "Belső cím", card_data: "Kártyaszám",
  jwt: "Hozzáférési kulcs", api_key: "API-kulcs", replay: "Ismételt webhook", paused: "Szüneteltetett ügynök", isolated: "Elkülönített ügynök", revoked: "Visszavont ügynök", killed: "Leállított ügynök", credential: "Titok/jelszó", mass_change: "Tömeges művelet", money: "Pénzmozgás", prompt_exfiltration: "Rendszerprompt-kicsalás", destructive_sql: "Romboló adatbázis-parancs", obfuscation: "Álcázott támadás", self_permission: "Saját jogosultság módosítása", audit_tamper: "Napló törlése / kikapcsolása", security_bypass: "Biztonsági védelem kikapcsolása", external_comm: "Külső kommunikáció", permanent_delete: "Végleges törlés", payload_tamper: "Jóváhagyás utáni átírás", prompt_leak: "Rejtett utasítás szivárgása (kanári)", history_smuggling: "Csempészett korábbi üzenet", indirect_injection: "Közvetett támadás (beolvasott tartalom)", private_key: "Privát kulcs",
};
const actionLabel: Record<string, string> = { blocked: "Blokkolva", redacted: "Kitakarva", flagged: "Jelezve" };
const clean = (f: string) => f.replace(/^(block|warn|global):/, "");

const THREATS: { name: string; control: string; codes: string[] }[] = [
  { name: "Prompt injection", control: "Minden AI-bemenet AEGIS-szűrése, munkatervben blokk", codes: ["prompt_injection", "prompt_exfiltration"] },
  { name: "Jogosultság-emelés", control: "Szerveroldali admin-ellenőrzés minden műveletnél, emelési kérés blokkolva", codes: ["privilege"] },
  { name: "Adatszivárgás", control: "Kártyaszám kitakarása minden AI-válaszból, tenant-szintű hozzáférés", codes: ["card_data"] },
  { name: "Rosszindulatú ügynök", control: "Csak jóváhagyott lépés; 3 blokk után zárolás; ismételt szivárgásnál automatikus elkülönítés; vészleállítás", codes: ["mass_change", "money", "destructive_sql"] },
  { name: "SSRF / belső cím", control: "Belső hálózati címek blokkolva bemenetben", codes: ["ssrf"] },
  { name: "Kulcs- és jelszószivárgás", control: "Kulcsok kitakarása a válaszokból, titkot tartalmazó eredmény blokkolva", codes: ["credential", "jwt", "api_key", "private_key"] },
];
const CONTROLS = [
  "Szerveroldali jogosultság", "Képesség alapú engedély", "Legkisebb jogosultság", "Tenant-elkülönítés", "Titkok védelme",
  "Rátakorlát (20/perc, zárolás)", "Bemenet-ellenőrzés", "Kimenet-ellenőrzés", "Ismétlés elleni védelem", "Jóváhagyás lejárata (72 óra)", "Napló védelme (csak bővíthető, hash-lánc)", "Webhook-aláírás + ismétlésszűrés", "Webhook-cél SSRF-szűrés", "Ügynökönkénti vészleállítás + GLOBAL STOP", "Automatikus incidenskezelés (elkülönítés + bizonyíték)", "Képtárak listázása lezárva",
];

export default function EmpyreanAegisEvents() {
  const [ev, setEv] = useState<Ev[] | null>(null);
  const [ledger, setLedger] = useState<{ checked: number; broken: number; legacy: number; ok: boolean } | null>(null);
  const verify = async () => { const { data } = await supabase.rpc("aegis_verify_ledger"); setLedger(data as never); };
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
      <div className="border border-border">
        <p className="p-2 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">Fenyegetés-modell · 30 nap</p>
        <ul className="divide-y divide-border text-xs">
          {THREATS.map((t) => {
            const n = recent.filter((e) => e.findings.some((f) => t.codes.includes(clean(f)))).length;
            return <li key={t.name} className="p-2"><span className="font-medium">{t.name}</span> · <span className={n ? "text-destructive" : "text-muted-foreground"}>{n} esemény</span><div className="text-muted-foreground">{t.control}</div></li>;
          })}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">Aktív védelmek: {CONTROLS.join(" · ")}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={verify} className="border border-border px-2 py-1 hover:bg-muted">Napló sértetlenségének ellenőrzése</button>
        {ledger && <span className={ledger.ok ? "" : "text-destructive"}>{ledger.ok ? "Sértetlen" : `${ledger.broken} sérült bejegyzés!`} · {ledger.checked} ellenőrizve{ledger.legacy ? ` · ${ledger.legacy} régebbi, lánc előtti` : ""}</span>}
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
