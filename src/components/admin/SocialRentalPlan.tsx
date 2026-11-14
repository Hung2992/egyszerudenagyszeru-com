import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, ExternalLink, Copy } from "lucide-react";
import RentalJourney from "@/components/social/RentalJourney";
import { pairWeekly, rentalTopics, tiktokRentalVariants } from "@/lib/social-rental-plan";
import { periodKey } from "@/lib/social-periods";
import { toast } from "sonner";

type Applicant = { id: string; full_name: string; company_name: string | null; status: string; created_at: string };
const statuses: Record<string, string> = { pending: "Elbírálásra vár", active: "Aktív", invited: "Meghívva", paused: "Szüneteltetve", revoked: "Visszavonva", rejected: "Elutasítva" };

export default function SocialRentalPlan() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pairs, setPairs] = useState<ReturnType<typeof pairWeekly>>([]);
  const [topic, setTopic] = useState(rentalTopics[0]);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const { data, error: failure } = await supabase.from("partners").select("id,full_name,company_name,status,created_at").order("created_at", { ascending: false }).limit(100);
      if (failure) { setError(failure.message); return; }
      setApplicants(data ?? []);
      const slots = await supabase.from("social_plan_slots").select("day,platform,queue_id").limit(1000);
      if (slots.error) { setError(slots.error.message); return; }
      const ids = (slots.data ?? []).map(s => s.queue_id).filter(Boolean);
      const queue = ids.length ? await supabase.from("social_publish_queue").select("id,status").in("id", ids) : { data: [], error: null };
      if (queue.error) { setError(queue.error.message); return; }
      const status = new Map((queue.data ?? []).map((q: { id: string; status: string }) => [q.id, q.status]));
      setPairs(pairWeekly((slots.data ?? []).map(s => ({ day: s.day, platform: s.platform, status: status.get(s.queue_id) ?? "missing" })), (data ?? []).map(a => a.created_at), v => periodKey(v, "week")));
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
    <div className="border-t border-border pt-5 space-y-3"><h3 className="font-display text-xl">Heti párosítás · posztok és jelentkezések</h3><p className="text-xs text-muted-foreground">Hétfőtől induló budapesti hetek. Együttjárás, nem igazolt ok-okozat vagy hirdetési konverzió.</p>
      {!pairs.length ? <p className="text-sm text-muted-foreground">Nincs még adat.</p> : <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[560px] text-sm"><thead><tr className="text-left text-xs text-muted-foreground">{["Hét", "Tervezett", "Publikált", "Facebook", "TikTok", "Jelentkezés"].map(t => <th key={t} className="p-3 font-normal">{t}</th>)}</tr></thead><tbody className="divide-y divide-border">{pairs.map(r => <tr key={r.week}><td className="p-3 whitespace-nowrap">{r.week}</td><td className="p-3">{r.planned}</td><td className="p-3">{r.published}</td><td className="p-3">{r.facebook}</td><td className="p-3">{r.tiktok}</td><td className="p-3 text-accent">{r.applications}</td></tr>)}</tbody></table></div>}
    </div>
    <div className="border-t border-border pt-5 space-y-3"><h3 className="font-display text-xl">TikTok-szöveggeneráló</h3>
      <select aria-label="Bérlési téma" className="w-full border border-border bg-background p-2 text-sm" value={topic} onChange={e => setTopic(e.target.value)}>{rentalTopics.map(t => <option key={t}>{t}</option>)}</select>
      {tiktokRentalVariants(topic).map((text, i) => <div key={i} className="border border-border p-3 space-y-2"><p className="text-sm whitespace-pre-wrap break-words">{text}</p><Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success("Szöveg másolva"); } catch { toast.error("Jelöld ki és másold a szöveget."); } }}><Copy className="mr-2 h-3 w-3" />Másolás</Button></div>)}
      <p className="text-xs text-muted-foreground">Kézi feltöltéshez; TikTok API-posztolás nincs engedélyezve.</p>
    </div>
  </section>;
}