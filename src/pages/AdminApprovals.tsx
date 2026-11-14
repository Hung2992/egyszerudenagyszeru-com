import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { approvalLabel } from "@/lib/social-periods";
import { needsHuman, type PlanLite } from "@/lib/aegis-os";
import AegisApprovalQueue from "@/components/admin/AegisApprovalQueue";
import { toast } from "sonner";

type Post = { id: string; platform: string; content: string; status: string; requires_approval: boolean; scheduled_at: string; approval_hash: string | null; approval_expires_at: string | null; test_only: boolean; media_urls: string[] | null; media_type: string | null; approval_current?: boolean };
type Plan = PlanLite & { id: string; goal: string; risk: string; status: string };
const platformNames: Record<string, string> = { facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn" };

/** Külön jóváhagyási menü: minden emberi döntésre váró tartalom és terv egy helyen. */
export default function AdminApprovals() {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    const [queue, workforce] = await Promise.all([
      supabase.from("social_publish_queue").select("id,platform,content,status,requires_approval,scheduled_at,approval_hash,approval_expires_at,test_only,media_urls,media_type").eq("status", "pending").eq("requires_approval", true).order("scheduled_at", { ascending: true }).limit(100),
      supabase.from("workforce_plans").select("id,goal,status,risk,approval_expires_at").order("created_at", { ascending: false }).limit(100),
    ]);
    if (queue.error || workforce.error) setError([queue.error?.message, workforce.error?.message].filter(Boolean).join(" · "));
    const items = (queue.data ?? []) as Post[];
    const states = items.length ? await supabase.rpc("social_approval_states", { _ids: items.map(p => p.id) }) : { data: {}, error: null };
    if (states.error) setError(states.error.message);
    setPosts(items.map(p => ({ ...p, approval_current: states.data?.[p.id] === true })).filter(p => approvalLabel(p) !== "Jóváhagyva"));
    setPlans(((workforce.data ?? []) as Plan[]).filter(p => needsHuman(p)));
    setBusy(false);
  }, []);

  useEffect(() => { if (!loading && !isAdmin) navigate("/auth", { replace: true }); }, [loading, isAdmin, navigate]);
  useEffect(() => {
    if (!isAdmin) return;
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [isAdmin, load]);

  const approve = async (post: Post) => {
    if (!window.confirm(post.test_only ? "Jóváhagyod ezt a teszttartalmat? Nem kerül közzétételre." : `Jóváhagyod ezt a pontos tartalmat és az ütemezett közzétételét?\n\n${post.content.slice(0, 200)}`)) return;
    setActing(post.id);
    const review = await supabase.rpc("social_review", { _id: post.id });
    if (review.error) { setActing(null); toast.error(review.error.message); return; }
    const { error: approveError } = await supabase.rpc("social_approve", { _id: post.id, _expected_hash: review.data.hash });
    setActing(null);
    if (approveError) { toast.error(approveError.message.includes("publication_permission_required") ? `Nincs ${post.test_only ? "teszt" : "éles"} publikálási engedélyed. Add meg a Social AI központ „Engedélyek és napló” fülön, majd próbáld újra.` : approveError.message, { duration: 10000 }); return; }
    toast.success("Tartalom jóváhagyva · 72 óráig érvényes");
    void load();
  };
  const reject = async (post: Post) => {
    if (!window.confirm("Biztosan elutasítod ezt a posztot? Nem jelenik meg.")) return;
    setActing(post.id);
    const { error: cancelError } = await supabase.rpc("social_cancel", { _id: post.id });
    setActing(null);
    if (cancelError) { toast.error(cancelError.message); return; }
    toast.success("Poszt elutasítva, naplózva");
    void load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return null;

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-4 py-5 md:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Admin</Link></Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Frissítés</Button>
        </div>
        <div className="flex items-start gap-4">
          <ShieldCheck className="h-9 w-9 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-accent">Emberi döntések egy helyen</p>
            <h1 className="mt-1 font-display text-2xl md:text-3xl break-words">JÓVÁHAGYÁSOK</h1>
            <p className="mt-2 text-sm text-muted-foreground">Itt látod és hagyhatod jóvá az összes várakozó posztot és munkatárs-tervet. Automatikus frissítés 30 másodpercenként.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-background p-4"><div className="font-display text-3xl">{busy ? "—" : posts.length}</div><p className="text-xs text-muted-foreground mt-1">Poszt vár jóváhagyásra</p></div>
          <div className="bg-background p-4"><div className="font-display text-3xl">{busy ? "—" : plans.length}</div><p className="text-xs text-muted-foreground mt-1">Munkatárs-terv vár döntésre</p></div>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 space-y-10">
      {error && <div role="alert" className="border border-destructive p-3 text-sm text-destructive break-words">{error}</div>}

      <section className="space-y-4">
        <h2 className="font-display text-xl">Posztok jóváhagyásra ({posts.length})</h2>
        <p className="text-xs text-muted-foreground">A jóváhagyás a pontos tartalomhoz kötött, 72 óráig érvényes. Elutasított poszt nem jelenik meg.</p>
        {!busy && !posts.length && <p className="py-6 text-sm text-muted-foreground">Nincs jóváhagyásra váró poszt.</p>}
        <ul className="space-y-3">
          {posts.map(post => <li key={post.id} className="border border-border p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="uppercase tracking-widest text-accent">{platformNames[post.platform] ?? post.platform}</span>
              {post.test_only && <span className="border border-border px-2 py-0.5">Teszt · nem kerül közzétételre</span>}
              <span>{post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("hu-HU") : "Nincs időpont"}</span>
              <span className="text-destructive">{approvalLabel(post)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words">{post.content}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={acting === post.id} onClick={() => void approve(post)}>{acting === post.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Jóváhagyom</Button>
              <Button size="sm" variant="outline" disabled={acting === post.id} onClick={() => void reject(post)}><X className="mr-2 h-4 w-4" />Elutasítom</Button>
            </div>
          </li>)}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl">Munkatárs-tervek döntésre ({plans.length})</h2>
        <p className="text-xs text-muted-foreground">AI munkatársak tervei — magas kockázatnál nincs automatikus végrehajtás. Piros tervhez indoklás kell.</p>
        <AegisApprovalQueue plans={plans} onDone={() => void load()} />
      </section>
    </main>
  </div>;
}
