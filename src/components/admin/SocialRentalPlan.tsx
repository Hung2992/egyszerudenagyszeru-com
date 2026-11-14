import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, ExternalLink } from "lucide-react";
import RentalJourney from "@/components/social/RentalJourney";

type Applicant = { id: string; full_name: string; company_name: string | null; status: string; created_at: string };
const statuses: Record<string, string> = { pending: "Elbírálásra vár", active: "Aktív", invited: "Meghívva", paused: "Szüneteltetve", revoked: "Visszavonva", rejected: "Elutasítva" };

export default function SocialRentalPlan() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const { data, error: failure } = await supabase.from("partners").select("id,full_name,company_name,status,created_at").order("created_at", { ascending: false }).limit(100);
      if (failure) setError(failure.message); else setApplicants(data ?? []);
    } catch { setError("A jelentkezések nem tölthetők be."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="space-y-6">
    <RentalJourney />
    <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/social-partner" target="_blank"><ExternalLink className="mr-2 h-4 w-4" />Partnerbelépés és jelentkezés</Link></Button><Button asChild variant="outline"><Link to="/partner-contract">Szerződéses folyamat</Link></Button></div>
    <div className="border-t border-border pt-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-xl flex items-center gap-2"><Users className="h-5 w-5 text-accent" />Partnerjelentkezések</h3><Button variant="outline" disabled={busy} onClick={() => void load()}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Frissítés</Button></div>
      <p className="text-xs text-muted-foreground">Legutóbbi 100 partneradat · meglévő jelentkezések, nem igazolt hirdetési konverziók.</p>
      {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
      {busy ? <p className="text-sm text-muted-foreground">Betöltés…</p> : !applicants.length && !error ? <p className="text-sm text-muted-foreground">Még nincs partnerjelentkezés.</p> : <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[550px] text-sm"><thead><tr className="text-left text-xs text-muted-foreground">{["Név", "Vállalkozás", "Állapot", "Jelentkezés"].map(t => <th key={t} className="p-3 font-normal">{t}</th>)}</tr></thead><tbody className="divide-y divide-border">{applicants.map(a => <tr key={a.id}><td className="p-3">{a.full_name}</td><td className="p-3">{a.company_name ?? "—"}</td><td className="p-3 text-accent">{statuses[a.status] ?? a.status}</td><td className="p-3 whitespace-nowrap text-muted-foreground">{new Date(a.created_at).toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" })}</td></tr>)}</tbody></table></div>}
      <Button asChild variant="outline"><Link to="/admin/partner-approvals">Jelentkezések elbírálása</Link></Button>
    </div>
  </section>;
}