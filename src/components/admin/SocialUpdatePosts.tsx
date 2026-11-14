import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { budapestDay } from "@/lib/social-periods";
import { nextFreeSlots, updatePosts, type UpdateNote } from "@/lib/social-update-posts";

export default function SocialUpdatePosts({ onChanged }: { onChanged: () => void }) {
  const [kind, setKind] = useState<UpdateNote["kind"]>("uj");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [busy, setBusy] = useState(false);
  const today = budapestDay(new Date());
  const posts = updatePosts({ title, details, kind, date: today });
  const save = async () => {
    if (!window.confirm("A frissítésről szóló posztokat a következő szabad helyekre mented jóváhagyásra? Közzététel nem történik.")) return;
    setBusy(true);
    const { data, error } = await supabase.from("social_plan_slots").select("id,day,platform,queue_id").gt("day", today).order("day").limit(200);
    if (error) { setBusy(false); toast.error(error.message); return; }
    const free = nextFreeSlots(data ?? [], today); const done: string[] = []; const skipped: string[] = [];
    for (const platform of ["facebook", "tiktok", "linkedin"] as const) {
      const slot = free[platform];
      if (!slot || (platform === "tiktok" && !video.trim())) { skipped.push(platform); continue; }
      const r = await supabase.rpc("social_prepare_slot", { _slot: slot.id, _source: "manual", _ref: null, _content: posts[platform], _video: platform === "tiktok" ? video.trim() : null, _image: platform === "facebook" ? image.trim() || null : null });
      if (r.error) skipped.push(`${platform}: ${r.error.message}`); else done.push(`${platform} ${slot.day}`);
    }
    setBusy(false); onChanged();
    if (done.length) toast.success(`Jóváhagyásra vár: ${done.join(", ")}`);
    if (skipped.length) toast.warning(`Kihagyva: ${skipped.join(", ")}`);
    if (done.length) { setTitle(""); setDetails(""); setImage(""); setVideo(""); }
  };
  return <section className="space-y-4">
    <h2 className="font-display text-xl flex items-center gap-2"><Megaphone className="h-5 w-5 text-accent" />Frissítési posztok</h2>
    <p className="text-sm text-muted-foreground">Minden új funkcióról, javításról és frissítésről poszt készül a valódi szoftver képernyőképével vagy videójával. Csak igaz adatot írj be; a posztok a Havi terv következő szabad helyére kerülnek jóváhagyásra.</p>
    <div className="flex flex-wrap gap-2">{([["uj", "Új funkció"], ["javitas", "Javítás"], ["frissites", "Frissítés"]] as const).map(([k, l]) => <Button key={k} size="sm" variant={kind === k ? "secondary" : "outline"} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</Button>)}</div>
    <Input aria-label="Frissítés címe" placeholder="Mi változott? (pl. Kép csatolása Facebook-posztokhoz)" value={title} maxLength={120} onChange={e => setTitle(e.target.value)} />
    <Textarea aria-label="Részletek soronként" rows={4} placeholder="Részletek, soronként egy tény" value={details} maxLength={1500} onChange={e => setDetails(e.target.value)} />
    <Input aria-label="Valós képernyőkép HTTPS címe (Facebook)" placeholder="Valós képernyőkép HTTPS címe (Facebook, nem kötelező)" value={image} onChange={e => setImage(e.target.value)} />
    <Input aria-label="Valós videó HTTPS címe (TikTok)" placeholder="Valós videó HTTPS címe (TikTok, kötelező a TikTok-poszthoz)" value={video} onChange={e => setVideo(e.target.value)} />
    {title.trim() && <div className="grid gap-3 md:grid-cols-3">{(["facebook", "tiktok", "linkedin"] as const).map(p => <div key={p} className="border border-border p-3"><p className="text-xs uppercase text-accent mb-2">{p}</p><p className="text-xs whitespace-pre-wrap break-words">{posts[p]}</p></div>)}</div>}
    <Button disabled={busy || !title.trim() || !details.trim()} onClick={() => void save()}>Posztok mentése jóváhagyásra</Button>
  </section>;
}
