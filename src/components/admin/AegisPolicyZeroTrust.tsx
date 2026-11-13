import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Policy = { code: string; title: string; rule: string; effect: string; enabled: boolean; locked: boolean; params: Record<string, number> };
type Decision = { id: string; created_at: string; what: string; why: string | null; resource: string; permission: string; risk: string | null; data_findings: string[]; consequence: string | null; decision: string; policy_hits: string[] };
const PARAM_LABEL: Record<string, string> = { limit_huf: "limit (Ft)", from: "kezdete (óra)", to: "vége (óra)", max: "max. lépés / nap" };
const HIT_LABEL: Record<string, string> = { high_risk_human: "Nincs időablak", financial_limit: "Pénzügyi limit", red_hours: "Munkaidőn kívül", daily_step_limit: "Napi limit", evidence_required: "Gyenge bizonyíték", output_scan: "Tiltott tartalom", payload_tamper: "Átírt terv" };

/** MAXIMUM AI OS 15. POLICY-AS-CODE + 16. ZERO-TRUST (KI? MIT? MIÉRT? MIN? MILYEN JOGGAL? KOCKÁZAT? ADAT? KÖVETKEZMÉNY?) */
export default function AegisPolicyZeroTrust() {
  const [pol, setPol] = useState<Policy[]>([]);
  const [dec, setDec] = useState<Decision[]>([]);
  const [edit, setEdit] = useState<Record<string, Record<string, number>>>({});
  const [reason, setReason] = useState("");
  const load = () => Promise.all([
    supabase.from("aegis_policies").select("*").order("locked", { ascending: false }),
    supabase.from("aegis_decisions").select("*").order("created_at", { ascending: false }).limit(40),
  ]).then(([p, d]) => { setPol((p.data ?? []) as never); setDec((d.data ?? []) as never); });
  useEffect(() => { load(); }, []);
  const save = async (p: Policy, enabled: boolean) => {
    const { error } = await supabase.rpc("aegis_set_policy", { _code: p.code, _enabled: enabled, _params: { ...p.params, ...(edit[p.code] ?? {}) }, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("Szabály mentve, naplózva"); setEdit((e) => ({ ...e, [p.code]: {} })); load();
  };
  const allow = dec.filter((d) => d.decision === "allow").length;
  return (
    <div className="space-y-8">
      <section className="space-y-2" aria-labelledby="pac">
        <h2 id="pac" className="text-lg font-medium">Policy-as-code · géppel ellenőrzött szabályok</h2>
        <p className="text-xs text-muted-foreground">Minden lépés-végrehajtás előtt a szerver lefuttatja ezeket. A lakatos alapszabályok nem kapcsolhatók ki. Minden módosítás indoklással, naplózva.</p>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Indoklás a módosításhoz (min. 20 karakter)" className="rounded-none h-8 text-xs" />
        <div className="space-y-px bg-border border border-border">
          {pol.map((p) => (
            <div key={p.code} className="bg-background p-3 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">{p.locked ? "🔒 " : ""}{p.title} <span className={`text-xs ${p.enabled || p.locked ? "text-accent" : "text-muted-foreground"}`}>· {p.enabled || p.locked ? "aktív" : "kikapcsolva"}</span></p>
                {!p.locked && <Button size="sm" variant="outline" className="rounded-none h-7" disabled={reason.trim().length < 20} onClick={() => save(p, !p.enabled)}>{p.enabled ? "Kikapcsolás" : "Bekapcsolás"}</Button>}
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">{p.rule}</p>
              {Object.keys(p.params).length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {Object.entries(p.params).map(([k, v]) => (
                    <label key={k} className="text-xs flex items-center gap-1">{PARAM_LABEL[k] ?? k}
                      <Input type="number" value={edit[p.code]?.[k] ?? v} onChange={(e) => setEdit((s) => ({ ...s, [p.code]: { ...(s[p.code] ?? {}), [k]: Number(e.target.value) } }))} className="rounded-none h-7 w-28" />
                    </label>
                  ))}
                  <Button size="sm" className="rounded-none h-7" disabled={reason.trim().length < 20 || !edit[p.code] || !Object.keys(edit[p.code]).length} onClick={() => save(p, p.enabled)}>Mentés</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-2" aria-labelledby="zt">
        <h2 id="zt" className="text-lg font-medium">Zero-Trust döntésnapló</h2>
        <p className="text-xs text-muted-foreground">Minden végrehajtási kísérletnél rögzítve: ki, mit, miért, min, milyen joggal, mekkora kockázattal, milyen adattal, milyen következménnyel. Utólag nem módosítható. Utolsó 40: {allow} engedélyezve, {dec.length - allow} elutasítva.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border border-border">
            <thead><tr className="text-left text-muted-foreground">{["Mikor", "Döntés", "Mit / miért", "Jog", "Kockázat", "Adat", "Következmény", "Szabály"].map((h) => <th key={h} className="p-2 font-normal">{h}</th>)}</tr></thead>
            <tbody>
              {dec.map((d) => (
                <tr key={d.id} className="border-t border-border align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(d.created_at).toLocaleString("hu-HU")}</td>
                  <td className={`p-2 ${d.decision === "deny" ? "text-destructive" : "text-accent"}`}>{d.decision === "deny" ? "TILTVA" : "ENGEDVE"}</td>
                  <td className="p-2">{d.what}<div className="text-muted-foreground">{d.why}</div></td>
                  <td className="p-2">{d.permission}</td>
                  <td className="p-2">{d.risk === "red" ? "🔴" : d.risk === "yellow" ? "🟡" : "🟢"}</td>
                  <td className="p-2">{d.data_findings.length ? d.data_findings.join(", ") : "tiszta"}</td>
                  <td className="p-2">{d.consequence}</td>
                  <td className="p-2">{d.policy_hits.map((h) => HIT_LABEL[h] ?? h).join(", ") || "—"}</td>
                </tr>
              ))}
              {dec.length === 0 && <tr><td colSpan={8} className="p-2 text-muted-foreground">Még nincs döntés.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
