import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, ExternalLink, Copy } from "lucide-react";
import RentalJourney from "@/components/social/RentalJourney";
import SocialVideoDraft from "./SocialVideoDraft";
import { pairWeekly, rentalTopics, tiktokRentalVariants } from "@/lib/social-rental-plan";
import { periodKey } from "@/lib/social-periods";
import { toast } from "sonner";

type Applicant = { id: string; full_name: string; company_name: string | null; status: string; created_at: string };
type Followup = { partner_id: string; interest: string; note: string | null; next_contact_on: string | null };
const interests: Record<string, string> = { new: "Új", contacted: "Megkeresve", interested: "Érdeklődik", not_interested: "Nem érdeklődik", contract: "Szerződés folyamatban" };
const statuses: Record<string, string> = { pending: "Elbírálásra vár", active: "Aktív", invited: "Meghívva", paused: "Szüneteltetve", revoked: "Visszavonva", rejected: "Elutasítva" };

export default function SocialRentalPlan() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [followups, setFollowups] = useState<Record<string, Followup>>({});
  const [interestFilter, setInterestFilter] = useState("all");
  const [pairs, setPairs] = useState<ReturnType<typeof pairWeekly>>([]);
  const [topic, setTopic] = useState(rentalTopics[0]);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const { data, error: failure } = await supabase.from("partners").select("id,full_name,company_name,status,created_at").order("created_at", { ascending: false }).limit(100);
      if (failure) { setError(failure.message); return; }
      setApplicants(data ?? []);
      const fu = await supabase.from("social_partner_followups").select("partner_id,interest,note,next_contact_on");
      if (fu.error) { setError(fu.error.message); return; }
      setFollowups(Object.fromEntries((fu.data ?? []).map((f: Followup) => [f.partner_id, f])));
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
  const save = async (partner_id: string, patch: Partial<Followup>) => {
    const next = { interest: "new", note: null, next_contact_on: null, ...followups[partner_id], ...patch, partner_id };
    const { error: e } = await supabase.from("social_partner_followups").upsert(next);
    if (e) { toast.error(e.message); return; }
    setFollowups(f => ({ ...f, [partner_id]: next })); toast.success("Utánkövetés mentve");
  };
  const shown = applicants.filter(a => interestFilter === "all" || (followups[a.id]?.interest ?? "new") === interestFilter);
  return <section className="space-y-6">
    <RentalJourney />
    <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/social-partner" target="_blank"><ExternalLink className="mr-2 h-4 w-4" />Partnerbelépés és jelentkezés</Link></Button><Button asChild variant="outline"><Link to="/partner-contract">Szerződéses folyamat</Link></Button></div>
    <div className="border-t border-border pt-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-xl flex items-center gap-2"><Users className="h-5 w-5 text-accent" />Partnerjelentkezések</h3><Button variant="outline" disabled={busy} onClick={() => void load()}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Frissítés</Button></div>
      <div className="flex flex-wrap gap-1">{[["all", "Mind"], ...Object.entries(interests)].map(([k, v]) => <Button key={k} size="sm" variant={interestFilter === k ? "secondary" : "ghost"} aria-pressed={interestFilter === k} onClick={() => setInterestFilter(k)}>{v} ({k === "all" ? applicants.length : applicants.filter(a => (followups[a.id]?.interest ?? "new") === k).length})</Button>)}</div>
      <p className="text-xs text-muted-foreground">Legutóbbi 100 partneradat · meglévő jelentkezések, nem igazolt hirdetési konverziók.</p>
      {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
      {busy ? <p className="text-sm text-muted-foreground">Betöltés…</p> : !applicants.length && !error ? <p className="text-sm text-muted-foreground">Még nincs partnerjelentkezés.</p> : <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[980px] text-sm"><thead><tr className="text-left text-xs text-muted-foreground">{["Név", "Vállalkozás", "Állapot", "Jelentkezés", "Érdeklődés", "Következő kapcsolat", "Megjegyzés"].map(t => <th key={t} className="p-3 font-normal">{t}</th>)}</tr></thead><tbody className="divide-y divide-border">{shown.map(a => <tr key={a.id}><td className="p-3">{a.full_name}</td><td className="p-3">{a.company_name ?? "—"}</td><td className="p-3 text-accent">{statuses[a.status] ?? a.status}</td><td className="p-3 whitespace-nowrap text-muted-foreground">{new Date(a.created_at).toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" })}</td><td className="p-3"><select aria-label={`Érdeklődés: ${a.full_name}`} className="border border-border bg-background p-1 text-sm" value={followups[a.id]?.interest ?? "new"} onChange={e => void save(a.id, { interest: e.target.value })}>{Object.entries(interests).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td><td className="p-3"><input type="date" aria-label={`Következő kapcsolat: ${a.full_name}`} className="border border-border bg-background p-1 text-sm" defaultValue={followups[a.id]?.next_contact_on ?? ""} onBlur={e => { if (e.target.value !== (followups[a.id]?.next_contact_on ?? "")) void save(a.id, { next_contact_on: e.target.value || null }); }} /></td><td className="p-3"><input aria-label={`Megjegyzés: ${a.full_name}`} maxLength={1000} className="w-48 border border-border bg-background p-1 text-sm" defaultValue={followups[a.id]?.note ?? ""} onBlur={e => { if (e.target.value !== (followups[a.id]?.note ?? "")) void save(a.id, { note: e.target.value || null }); }} /></td></tr>)}</tbody></table></div>}
      <Button asChild variant="outline"><Link to="/admin/partner-approvals">Jelentkezések elbírálása</Link></Button>
    </div>
    <div className="border-t border-border pt-5 space-y-3"><h3 className="font-display text-xl">Heti párosítás · posztok és jelentkezések</h3><p className="text-xs text-muted-foreground">Hétfőtől induló budapesti hetek. Együttjárás, nem igazolt ok-okozat vagy hirdetési konverzió.</p>
      {!pairs.length ? <p className="text-sm text-muted-foreground">Nincs még adat.</p> : <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[560px] text-sm"><thead><tr className="text-left text-xs text-muted-foreground">{["Hét", "Tervezett", "Publikált", "Facebook", "TikTok", "Jelentkezés"].map(t => <th key={t} className="p-3 font-normal">{t}</th>)}</tr></thead><tbody className="divide-y divide-border">{pairs.map(r => <tr key={r.week}><td className="p-3 whitespace-nowrap">{r.week}</td><td className="p-3">{r.planned}</td><td className="p-3">{r.published}</td><td className="p-3">{r.facebook}</td><td className="p-3">{r.tiktok}</td><td className="p-3 text-accent">{r.applications}</td></tr>)}</tbody></table></div>}
    </div>
    <div className="border-t border-border pt-5 space-y-3"><h3 className="font-display text-xl">TikTok-szöveggeneráló</h3>
      <select aria-label="Bérlési téma" className="w-full border border-border bg-background p-2 text-sm" value={topic} onChange={e => setTopic(e.target.value)}>{rentalTopics.map(t => <option key={t}>{t}</option>)}</select>
      {tiktokRentalVariants(topic).map((text, i) => <div key={i} className="border border-border p-3 space-y-2"><p className="text-sm whitespace-pre-wrap break-words">{text}</p><Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success("Szöveg másolva"); } catch { toast.error("Jelöld ki és másold a szöveget."); } }}><Copy className="mr-2 h-3 w-3" />Másolás</Button><SocialVideoDraft topic={topic} text={text} /></div>)}
      <p className="text-xs text-muted-foreground">Kézi feltöltéshez; a videó AI-tervezet, közzététel nem történik. TikTok API-posztolás nincs engedélyezve.</p>
    </div>
  </section>;
}