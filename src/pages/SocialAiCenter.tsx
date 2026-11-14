import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BarChart3, Brain, CalendarDays, Film, Loader2, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MarketingStudioRouter from "@/components/admin/MarketingStudioRouter";
import { lazyRetry } from "@/lib/lazy-retry";

const ContentStudio = lazy(lazyRetry(() => import("@/components/admin/AdminAiMarketingStudio")));
type Post = { id: string; platform: string; content: string; status: string; requires_approval: boolean; scheduled_at: string; error_message: string | null };
type Insight = { id: string; title: string; insight: string; platform: string | null };
const platforms = [{ id: "fb_studio", label: "Facebook" }, { id: "tt_studio", label: "TikTok" }, { id: "li_studio", label: "LinkedIn" }];
const statusNames: Record<string, string> = { pending: "Ütemezésre vár", processing: "Feldolgozás", published: "Publikálva", failed: "Hiba", cancelled: "Visszavonva", skipped: "Kihagyva" };

export default function SocialAiCenter() {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Post | null>(null);
  const [platform, setPlatform] = useState("fb_studio");
  const [filter, setFilter] = useState("all");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [queue, analysis] = await Promise.all([
        supabase.from("social_publish_queue").select("id,platform,content,status,requires_approval,scheduled_at,error_message").order("scheduled_at", { ascending: false }).limit(100),
        supabase.from("ai_marketing_insights").select("id,title,insight,platform").eq("status", "active").order("created_at", { ascending: false }).limit(12),
      ]);
      if (queue.error || analysis.error) setError([queue.error?.message, analysis.error?.message].filter(Boolean).join(" · "));
      setPosts((queue.data ?? []) as Post[]);
      setInsights((analysis.data ?? []) as Insight[]);
    } catch {
      setError("A közösségi adatok nem tölthetők be. Próbáld újra.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { if (!loading && !isAdmin) navigate("/auth", { replace: true }); }, [loading, isAdmin, navigate]);
  useEffect(() => {
    if (!isAdmin) return;
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, [isAdmin, load]);
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return null;
  const counts = [
    { label: "Tartalom a sorban", value: posts.length, icon: CalendarDays },
    { label: "Jóváhagyásra vár", value: posts.filter(p => p.status === "pending" && p.requires_approval).length, icon: ShieldCheck },
    { label: "Publikálva", value: posts.filter(p => p.status === "published").length, icon: ArrowUpRight },
    { label: "Hibás publikálás", value: posts.filter(p => p.status === "failed").length, icon: BarChart3 },
  ];
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-4 py-5 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Admin</Link></Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Frissítés</Button>
        </div>
        <div className="flex items-start gap-4"><Brain className="h-9 w-9 shrink-0 text-accent" /><div className="min-w-0"><p className="text-xs uppercase tracking-widest text-accent">AI Social Department</p><h1 className="mt-1 font-display text-2xl md:text-4xl break-words">SOCIAL AI COMMAND CENTER</h1><p className="mt-2 text-sm text-muted-foreground">Egyszerű de Nagyszerű · Facebook / TikTok / LinkedIn</p></div></div>
        <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">{counts.map(({ label, value, icon: Icon }) => <div key={label} className="bg-background p-4"><Icon className="h-4 w-4 text-accent mb-3" /><div className="font-display text-3xl">{busy ? "—" : value}</div><p className="text-xs text-muted-foreground mt-1">{label}</p></div>)}</div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      {error && <div role="alert" className="border border-destructive p-3 mb-5 text-sm text-destructive break-words">{error}</div>}
      <Tabs defaultValue="command" className="space-y-6">
        <div className="overflow-x-auto"><TabsList className="h-auto justify-start bg-transparent gap-1">
          <TabsTrigger value="command">Központ</TabsTrigger><TabsTrigger value="content">Tartalomgyár</TabsTrigger><TabsTrigger value="platforms">Platformok</TabsTrigger><TabsTrigger value="video">Videóműhely</TabsTrigger><TabsTrigger value="insights">Elemzések</TabsTrigger><TabsTrigger value="team">Csapat és AEGIS</TabsTrigger>
        </TabsList></div>
        <TabsContent value="command" className="space-y-6">
          <div className="flex flex-wrap justify-between gap-3 items-center"><h2 className="font-display text-xl">Közös tartalomnaptár</h2><div className="flex flex-wrap gap-1">{["all", "facebook", "tiktok", "linkedin"].map(p => <Button key={p} size="sm" variant={filter === p ? "secondary" : "ghost"} aria-pressed={filter === p} onClick={() => setFilter(p)}>{p === "all" ? "Mind" : p === "facebook" ? "Facebook" : p === "tiktok" ? "TikTok" : "LinkedIn"}</Button>)}</div></div>
          <p className="text-xs text-muted-foreground">Legutóbbi legfeljebb 100 tartalom · automatikus frissítés percenként</p>
          <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[620px] text-sm"><thead className="text-xs text-muted-foreground text-left"><tr>{["Platform", "Tartalom", "Állapot", "Időpont", ""].map((h, i) => <th key={i} className="p-3 font-normal">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{posts.filter(p => filter === "all" || p.platform === filter).map(p => <tr key={p.id}><td className="p-3 capitalize">{p.platform}</td><td className="p-3 max-w-sm"><p className="line-clamp-2 break-words">{p.content}</p></td><td className={`p-3 text-xs ${p.status === "failed" ? "text-destructive" : "text-accent"}`}>{p.status === "pending" && p.requires_approval ? "Jóváhagyásra vár" : statusNames[p.status] ?? p.status}</td><td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString("hu-HU") : "Nincs időpont"}</td><td className="p-3"><Button size="sm" variant="outline" onClick={() => setSelected(p)}>Megnyitás</Button></td></tr>)}</tbody></table></div>
          {!busy && !posts.filter(p => filter === "all" || p.platform === filter).length && <p className="py-8 text-sm text-muted-foreground text-center">Nincs tartalom ebben a listában.</p>}
          <div className="border-t border-border pt-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display">SOCIAL AI DIRECTOR</h3><p className="text-xs text-muted-foreground mt-1">Marketing munkatárs · saját tervek és átadások</p></div><Button asChild variant="outline"><Link to="/admin/ai-asszisztensek/10"><Users className="mr-2 h-4 w-4" />Marketing munkatárs</Link></Button></div>
        </TabsContent>
        <TabsContent value="content"><Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}><ContentStudio /></Suspense></TabsContent>
        <TabsContent value="platforms" className="space-y-6"><div className="flex flex-wrap gap-2">{platforms.map(p => <Button key={p.id} variant={platform === p.id ? "secondary" : "outline"} aria-pressed={platform === p.id} onClick={() => setPlatform(p.id)}>{p.label}</Button>)}</div><MarketingStudioRouter tab={platform} /></TabsContent>
        <TabsContent value="video" className="space-y-5"><h2 className="font-display text-xl flex items-center gap-2"><Film className="h-5 w-5 text-accent" />Videóműhely</h2><MarketingStudioRouter tab="ai_studio_recorder" /></TabsContent>
        <TabsContent value="insights" className="space-y-4"><h2 className="font-display text-xl">Marketingkövetkeztetések</h2>{!insights.length && <p className="text-sm text-muted-foreground">Még nincs aktív elemzés.</p>}{insights.map(i => <article key={i.id} className="border-b border-border py-4"><p className="text-xs uppercase text-accent">{i.platform ?? "Összes platform"}</p><h3 className="font-display mt-1">{i.title}</h3><p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">{i.insight}</p></article>)}</TabsContent>
        <TabsContent value="team" className="space-y-6"><h2 className="font-display text-xl">Csapat és biztonsági kapu</h2><div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/admin/ai-asszisztensek/10"><Users className="mr-2 h-4 w-4" />Marketing</Link></Button><Button asChild variant="outline"><Link to="/admin/ai-asszisztensek">AI munkatársak</Link></Button><Button asChild variant="outline"><Link to="/admin/ai-workforce"><ShieldCheck className="mr-2 h-4 w-4" />AEGIS · HUMAN GATE</Link></Button></div><h3 className="font-display">A feltöltött terv további munkaterületei</h3><div className="divide-y divide-border">{["Social AI-szakértők önálló koordinálása", "Teljes videógyártás és platformváltozatok", "Kommentek és közösségi moderáció", "Profiladatok központi módosítása", "Automatikus tanulás és optimalizálás", "Social-tartalmak teljes AEGIS-jóváhagyási lánca"].map(t => <div key={t} className="py-3 flex justify-between gap-4 text-sm"><span>{t}</span><span className="text-xs text-muted-foreground shrink-0">Tervezett</span></div>)}</div></TabsContent>
      </Tabs>
    </main>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Tartalom · {selected?.platform}</DialogTitle></DialogHeader><p className="text-sm whitespace-pre-wrap break-words">{selected?.content}</p>{selected?.error_message && <p className="text-sm text-destructive break-words">{selected.error_message}</p>}</DialogContent></Dialog>
  </div>;
}