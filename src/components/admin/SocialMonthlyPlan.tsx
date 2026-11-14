import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, Plus } from "lucide-react";
import { approvalLabel, budapestDay } from "@/lib/social-periods";
import { toast } from "sonner";
import { rentalTopic } from "@/lib/social-rental-plan";
type Slot = { id: string; day: string; platform: string; topic: string; queue_id: string | null };
type Post = { id: string; content: string; status: string; approval_hash: string | null; approval_expires_at: string | null; test_only: boolean; requires_approval: boolean; platform: string; scheduled_at: string; error_message: string | null; approval_current?: boolean };
export default function SocialMonthlyPlan({ onOpen, onChanged }: { onOpen: (post: Post) => void; onChanged: () => void }) {
  const [month, setMonth] = useState(budapestDay(new Date()).slice(0, 7));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [source] = useState("manual");
  const [ref, setRef] = useState("");
  const [content, setContent] = useState("");
  const [video, setVideo] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const plan = await supabase.from("social_month_plans").select("id").eq("month", `${month}-01`).maybeSingle();
    if (plan.error) { toast.error(plan.error.message); return; }
    if (!plan.data) { setSlots([]); setPosts([]); return; }
    const rows = await supabase.from("social_plan_slots").select("*").eq("plan_id", plan.data.id).order("day").order("platform");
    if (rows.error) { toast.error(rows.error.message); return; }
    setSlots(rows.data ?? []);
    const ids = (rows.data ?? []).map(s => s.queue_id).filter((id): id is string => Boolean(id));
    if (!ids.length) { setPosts([]); return; }
    const queue = await supabase.from("social_publish_queue").select("*").in("id", ids);
    if (queue.error) toast.error(queue.error.message); else {
      const states = await supabase.rpc("social_approval_states", { _ids: ids });
      if (states.error) toast.error(states.error.message);
      setPosts((queue.data ?? []).map(p => ({ ...p, approval_current: states.data?.[p.id] === true })));
    }
  }, [month]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30000); return () => window.clearInterval(timer); }, [load]);
  const create = async () => {
    if (!window.confirm(`${month}: napi 1 poszthely Facebookra, TikTokra és LinkedInre? Ez nem engedélyez közzétételt.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("social_create_month", { _month: `${month}-01` });
    setBusy(false);
    if (error) toast.error(error.message); else { await load(); toast.success("Havi terv létrehozva · tartalomra és jóváhagyásra vár"); }
  };
  const prepare = async () => {
    if (!selected || !window.confirm("Ezt a pontos tartalmat a közös sorba mented jóváhagyásra? Közzététel nem történik.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("social_prepare_slot", { _slot: selected.id, _source: source, _ref: ref || null, _content: content, _video: selected.platform === "tiktok" ? video || null : null, _image: selected.platform === "facebook" ? image || null : null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSelected(null); await load(); onChanged(); toast.success("Tartalom jóváhagyásra vár");
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl flex items-center gap-2"><CalendarDays className="h-5 w-5" />Havi posztterv</h2><div className="flex flex-wrap gap-2"><Input className="w-44" type="month" aria-label="Terv hónapja" value={month} onChange={e => setMonth(e.target.value)} /><Button disabled={busy || !month} variant="outline" onClick={() => void create()}><Plus className="mr-2 h-4 w-4" />Havi terv létrehozása</Button></div></div>
    <p className="text-xs text-muted-foreground">Facebook / TikTok / LinkedIn · napi 1 poszt/platform · tervezett időpont 12:00 Budapest · {slots.length} poszthely</p>
    <p className="text-xs text-muted-foreground">A témák javaslatok. TikTokhoz valódi videó szükséges. Jóváhagyás: pontos tartalom, 72 órás érvényesség; a hónap nem hagyható jóvá egyben.</p>
    {!slots.length && <p className="py-6 text-sm text-muted-foreground">Ebben a hónapban még nincs terv.</p>}
    <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[680px] text-sm"><thead><tr className="text-left text-xs text-muted-foreground">{["Nap", "Platform", "Téma / tartalom", "Jóváhagyás", ""].map((h, i) => <th key={i} className="p-3 font-normal">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{slots.map(slot => { const post = posts.find(p => p.id === slot.queue_id); return <tr key={slot.id}><td className="p-3 whitespace-nowrap">{slot.day}</td><td className="p-3 capitalize">{slot.platform}</td><td className="p-3 max-w-xs"><p className="line-clamp-2 break-words">{post?.content ?? rentalTopic(slot.day)}</p></td><td className={`p-3 text-xs ${approvalLabel(post) === "Jóváhagyva" ? "text-accent" : "text-muted-foreground"}`}>{approvalLabel(post)}</td><td className="p-3"><Button size="sm" variant="outline" disabled={!post && slot.day < budapestDay(new Date())} onClick={() => { if (post) onOpen(post); else { setSelected(slot); setContent(`${rentalTopic(slot.day)}\nEgyszerű de Nagyszerű — teljes üzleti szoftver, szerződéses bérléssel.\nIsmerd meg a rendszert és jelentkezz partnernek!\nhttps://egyszerudenagyszeru.com/social-partner`); setRef(""); setVideo(""); setImage(""); } }}>{post ? "Megnyitás" : "Tartalom készítése"}</Button></td></tr>; })}</tbody></table></div>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{selected?.platform} · {selected?.day}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Partnerkeresés · Egyszerű de Nagyszerű teljes szoftverének szerződéses bérlése</p><Textarea aria-label="Poszt pontos szövege" rows={6} value={content} onChange={e => setContent(e.target.value)} />{selected?.platform === "tiktok" && <Input aria-label="Videó HTTPS címe" placeholder="Videó HTTPS címe (kötelező)" value={video} onChange={e => setVideo(e.target.value)} />}{selected?.platform === "facebook" && <Input aria-label="Kép HTTPS címe" placeholder="Kép HTTPS címe (nem kötelező)" value={image} onChange={e => setImage(e.target.value)} />}{selected?.platform === "linkedin" && <p className="text-xs text-muted-foreground">LinkedIn: csak szöveges poszt küldhető.</p>}<Button disabled={busy || !content.trim() || (source !== "manual" && !ref) || (selected?.platform === "tiktok" && !video)} onClick={() => void prepare()}>Mentés jóváhagyásra</Button></DialogContent></Dialog>
  </section>;
}