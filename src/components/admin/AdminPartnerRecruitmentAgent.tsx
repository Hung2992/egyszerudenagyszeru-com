import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Sparkles, Copy, Trash2, Check, Facebook, Instagram, Music2, RefreshCw,
  Image as ImageIcon, TrendingUp, CalendarDays, BarChart3, Zap, Flame, Wand2, Clock,
} from "lucide-react";

type Post = {
  id: string;
  platform: "facebook" | "instagram" | "tiktok";
  title: string | null;
  hook: string | null;
  body: string;
  hashtags: string[];
  cta: string | null;
  image_url: string | null;
  image_prompt: string | null;
  video_script: string | null;
  angle: string | null;
  status: string;
  created_at: string;
  viral_score: number | null;
  viral_analysis: any;
  hook_variants: string[];
  scheduled_for: string | null;
  campaign_group: string | null;
  best_time_hint: string | null;
};

type Trend = {
  id: string;
  platform: string;
  topic: string;
  hashtags: string[];
  hook_examples: string[];
  audience_note: string | null;
  score: number | null;
  created_at: string;
};

const PLATFORM_META: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  facebook: { icon: Facebook, label: "Facebook", color: "text-blue-500", bg: "bg-blue-500" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-500", bg: "bg-pink-500" },
  tiktok: { icon: Music2, label: "TikTok", color: "text-fuchsia-500", bg: "bg-fuchsia-500" },
};

function scoreColor(s: number | null) {
  if (s == null) return "bg-muted text-muted-foreground";
  if (s >= 85) return "bg-emerald-500 text-white";
  if (s >= 70) return "bg-lime-500 text-white";
  if (s >= 50) return "bg-yellow-500 text-black";
  return "bg-red-500 text-white";
}

export default function AdminPartnerRecruitmentAgent() {
  const [tab, setTab] = useState<"generator" | "weekly" | "trends" | "analytics">("generator");
  const [cfg, setCfg] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [weeklyRunning, setWeeklyRunning] = useState(false);
  const [trendRunning, setTrendRunning] = useState(false);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "facebook" | "instagram" | "tiktok">("all");
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({ facebook: true, instagram: true, tiktok: true });
  const [count, setCount] = useState(2);
  const [withImages, setWithImages] = useState(true);
  const [withScore, setWithScore] = useState(true);
  const [days, setDays] = useState(7);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: t }] = await Promise.all([
      supabase.from("partner_recruitment_agent_config").select("*").order("created_at").limit(1).maybeSingle(),
      supabase.from("partner_recruitment_posts").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("partner_recruitment_trends").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setCfg(c);
    setPosts((p as Post[]) || []);
    setTrends((t as Trend[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveCfg = async () => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await supabase.from("partner_recruitment_agent_config").update({
      enabled: cfg.enabled, tone: cfg.tone, target_audience: cfg.target_audience,
      value_props: cfg.value_props, custom_instructions: cfg.custom_instructions,
      posts_per_run: cfg.posts_per_run, updated_at: new Date().toISOString(),
    }).eq("id", cfg.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve" });
  };

  const runAgent = async () => {
    const selected = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
    if (!selected.length) { toast({ title: "Válassz platformot", variant: "destructive" }); return; }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-recruitment-agent", {
        body: { action: "run", platforms: selected, count, with_images: withImages, with_score: withScore, with_variants: true },
      });
      if (error) throw error;
      toast({ title: `${data?.created?.length || 0} poszt generálva ✨` });
      await load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally { setRunning(false); }
  };

  const runWeekly = async () => {
    const selected = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
    if (!selected.length) { toast({ title: "Válassz platformot", variant: "destructive" }); return; }
    if (!confirm(`${days} napos terv = ${days * selected.length} poszt. Folytatod?`)) return;
    setWeeklyRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-recruitment-agent", {
        body: { action: "weekly_plan", platforms: selected, days, with_images: withImages },
      });
      if (error) throw error;
      toast({ title: `Heti terv kész: ${data?.created?.length || 0} poszt ütemezve 📅` });
      await load();
      setTab("weekly");
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally { setWeeklyRunning(false); }
  };

  const runTrends = async () => {
    const selected = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
    if (!selected.length) { toast({ title: "Válassz platformot", variant: "destructive" }); return; }
    setTrendRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-recruitment-agent", {
        body: { action: "research_trends", platforms: selected },
      });
      if (error) throw error;
      toast({ title: `${data?.trends?.length || 0} trend behúzva 🔥` });
      await load();
      setTab("trends");
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally { setTrendRunning(false); }
  };

  const scoreOne = async (id: string) => {
    setScoringId(id);
    try {
      const { error } = await supabase.functions.invoke("partner-recruitment-agent", { body: { action: "score_post", post_id: id } });
      if (error) throw error;
      toast({ title: "Pontszám frissítve" });
      await load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message, variant: "destructive" });
    } finally { setScoringId(null); }
  };

  const copyPost = async (post: Post) => {
    const text = [post.hook, "", post.body, "", (post.hashtags || []).join(" "), post.cta ? `\n${post.cta}` : ""].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    toast({ title: "Vágólapra másolva" });
  };
  const setStatus = async (id: string, status: string) => {
    await supabase.from("partner_recruitment_posts").update({ status, published_at: status === "published" ? new Date().toISOString() : null }).eq("id", id);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Törlöd?")) return;
    await supabase.from("partner_recruitment_posts").delete().eq("id", id);
    load();
  };
  const regenImage = async (id: string) => {
    const { error } = await supabase.functions.invoke("partner-recruitment-agent", { body: { action: "regenerate_image", post_id: id } });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Kép újragenerálva" }); load(); }
  };
  const swapHook = async (post: Post, newHook: string) => {
    await supabase.from("partner_recruitment_posts").update({ hook: newHook }).eq("id", post.id);
    toast({ title: "Hook frissítve" });
    load();
  };
  const useTrendAsAngle = (trend: Trend) => {
    if (!cfg) return;
    const extra = `${cfg.custom_instructions ? cfg.custom_instructions + "\n" : ""}TREND FÓKUSZ: ${trend.topic}. Példa hookok: ${trend.hook_examples.join(" | ")}. Használt hashtag-ek: ${trend.hashtags.join(" ")}`;
    setCfg({ ...cfg, custom_instructions: extra });
    setTab("generator");
    toast({ title: "Trend beszúrva az utasításba" });
  };

  const filtered = useMemo(() => filter === "all" ? posts : posts.filter((p) => p.platform === filter), [posts, filter]);

  // analytics
  const stats = useMemo(() => {
    const byPlatform: Record<string, { total: number; approved: number; published: number; avgScore: number; scored: number }> = {};
    const byAngle: Record<string, { total: number; approved: number; avgScore: number; scored: number }> = {};
    let totalScored = 0, sumScore = 0;
    for (const p of posts) {
      const pf = byPlatform[p.platform] || (byPlatform[p.platform] = { total: 0, approved: 0, published: 0, avgScore: 0, scored: 0 });
      pf.total++;
      if (p.status === "approved") pf.approved++;
      if (p.status === "published") pf.published++;
      if (p.viral_score != null) { pf.scored++; pf.avgScore += p.viral_score; totalScored++; sumScore += p.viral_score; }
      const a = p.angle || "egyéb";
      const ag = byAngle[a] || (byAngle[a] = { total: 0, approved: 0, avgScore: 0, scored: 0 });
      ag.total++;
      if (p.status === "approved" || p.status === "published") ag.approved++;
      if (p.viral_score != null) { ag.scored++; ag.avgScore += p.viral_score; }
    }
    Object.values(byPlatform).forEach(v => { if (v.scored) v.avgScore = v.avgScore / v.scored; });
    Object.values(byAngle).forEach(v => { if (v.scored) v.avgScore = v.avgScore / v.scored; });
    return { byPlatform, byAngle, totalScored, avgScore: totalScored ? sumScore / totalScored : 0 };
  }, [posts]);

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Betöltés…</div>;

  const renderPostCard = (post: Post) => {
    const M = PLATFORM_META[post.platform];
    const Ic = M.icon;
    return (
      <div key={post.id} className="border-2 border-border bg-card flex flex-col hover:border-primary transition-colors">
        <div className="relative">
          {post.image_url ? (
            <img src={post.image_url} alt="" className="w-full aspect-square object-cover" />
          ) : (
            <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          {post.viral_score != null && (
            <div className={`absolute top-2 left-2 px-2 py-1 text-xs font-black uppercase tracking-widest ${scoreColor(post.viral_score)} flex items-center gap-1`}>
              <Flame className="h-3 w-3" /> {post.viral_score}
            </div>
          )}
          {post.scheduled_for && (
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
              <Clock className="h-3 w-3" /> {new Date(post.scheduled_for).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} {post.best_time_hint || ""}
            </div>
          )}
        </div>
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${M.color}`}>
              <Ic className="h-3.5 w-3.5" /> {M.label}
            </div>
            <span className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest ${
              post.status === "published" ? "bg-emerald-500 text-white" :
              post.status === "approved" ? "bg-primary text-primary-foreground" :
              post.status === "discarded" ? "bg-muted text-muted-foreground" :
              "bg-yellow-500/20 text-yellow-700"
            }`}>{post.status}</span>
          </div>
          {post.hook && <div className="text-sm font-black leading-tight">{post.hook}</div>}
          {post.hook_variants?.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-primary font-bold uppercase tracking-widest">🔀 Alternatív hookok ({post.hook_variants.length})</summary>
              <div className="mt-2 space-y-1">
                {post.hook_variants.map((h, i) => (
                  <button key={i} onClick={() => swapHook(post, h)} className="w-full text-left text-xs p-2 border border-border hover:border-primary hover:bg-primary/5">
                    {h}
                  </button>
                ))}
              </div>
            </details>
          )}
          <div className="text-xs whitespace-pre-wrap line-clamp-6 text-muted-foreground">{post.body}</div>
          {post.hashtags?.length > 0 && (
            <div className="text-[10px] text-primary line-clamp-2">{post.hashtags.join(" ")}</div>
          )}
          {post.cta && <div className="text-xs font-bold">→ {post.cta}</div>}
          {post.viral_analysis && Object.keys(post.viral_analysis).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-bold uppercase tracking-widest text-muted-foreground">📊 Elemzés</summary>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                {post.viral_analysis.hook_strength != null && <div>Hook: <span className="font-bold">{post.viral_analysis.hook_strength}</span></div>}
                {post.viral_analysis.cta_strength != null && <div>CTA: <span className="font-bold">{post.viral_analysis.cta_strength}</span></div>}
                {post.viral_analysis.clarity != null && <div>Világosság: <span className="font-bold">{post.viral_analysis.clarity}</span></div>}
                {post.viral_analysis.emotional_pull != null && <div>Érzelem: <span className="font-bold">{post.viral_analysis.emotional_pull}</span></div>}
                {post.viral_analysis.predicted_reach && <div className="col-span-2">Elérés: <span className="font-bold uppercase">{post.viral_analysis.predicted_reach}</span></div>}
              </div>
              {post.viral_analysis.improvements?.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-[10px] text-muted-foreground">
                  {post.viral_analysis.improvements.slice(0, 3).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </details>
          )}
          {post.video_script && (
            <details className="text-xs">
              <summary className="cursor-pointer font-bold uppercase tracking-widest text-muted-foreground">🎬 Forgatókönyv</summary>
              <pre className="mt-2 whitespace-pre-wrap text-[11px]">{post.video_script}</pre>
            </details>
          )}
          <div className="mt-auto flex flex-wrap gap-1 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => copyPost(post)}><Copy className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" onClick={() => regenImage(post.id)} title="Kép újra"><RefreshCw className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" onClick={() => scoreOne(post.id)} disabled={scoringId === post.id} title="Újrapontoz">
              {scoringId === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            </Button>
            {post.status !== "approved" && <Button size="sm" variant="outline" onClick={() => setStatus(post.id, "approved")}><Check className="h-3 w-3" /></Button>}
            {post.status !== "published" && <Button size="sm" variant="outline" onClick={() => setStatus(post.id, "published")}>Publikálva</Button>}
            <Button size="sm" variant="outline" onClick={() => del(post.id)} className="ml-auto text-destructive"><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      </div>
    );
  };

  const scheduledPosts = posts.filter(p => p.scheduled_for).sort((a, b) => (a.scheduled_for || "").localeCompare(b.scheduled_for || ""));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 p-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 flex items-center justify-center bg-primary text-primary-foreground">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary">🤝 AI PARTNER TOBORZÓ — PRO</div>
            <h2 className="text-2xl font-black uppercase tracking-wider">Autonóm partner-szerző gépezet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Virális score · hook-variánsok · heti kontenttterv · trendkutatás · analitika. Az AI Facebook / Instagram / TikTok posztokat gyárt, hogy új partnereket vonzz a platformra.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 text-right">
            <div className="text-3xl font-black">{posts.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">generált poszt</div>
            {stats.avgScore > 0 && <div className={`px-2 py-1 text-xs font-black ${scoreColor(stats.avgScore)}`}>átlag score: {stats.avgScore.toFixed(0)}</div>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {[
          { k: "generator", l: "🚀 Generátor", i: Sparkles },
          { k: "weekly", l: "📅 Heti terv", i: CalendarDays },
          { k: "trends", l: "🔥 Trendek", i: TrendingUp },
          { k: "analytics", l: "📊 Analitika", i: BarChart3 },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${tab === t.k ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Config always visible */}
      {cfg && (
        <div className="border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider">⚙️ Ügynök beállítások</h3>
            <div className="flex items-center gap-2">
              <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
              <span className="text-xs uppercase tracking-widest">{cfg.enabled ? "Aktív" : "Inaktív"}</span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-widest">Hangnem</Label>
              <Input value={cfg.tone} onChange={(e) => setCfg({ ...cfg, tone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest">Posztok / futás / platform</Label>
              <Input type="number" min={1} max={10} value={cfg.posts_per_run} onChange={(e) => setCfg({ ...cfg, posts_per_run: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Célközönség</Label>
            <Textarea rows={2} value={cfg.target_audience} onChange={(e) => setCfg({ ...cfg, target_audience: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Érték-ajánlatok</Label>
            <Textarea rows={3} value={cfg.value_props} onChange={(e) => setCfg({ ...cfg, value_props: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Extra utasítás</Label>
            <Textarea rows={2} value={cfg.custom_instructions || ""} onChange={(e) => setCfg({ ...cfg, custom_instructions: e.target.value })} placeholder="Pl. említsd meg mindig hogy 24/7 support…" />
          </div>
          <Button onClick={saveCfg} disabled={saving}>{saving ? "Mentés…" : "💾 Mentés"}</Button>
        </div>
      )}

      {/* GENERATOR TAB */}
      {tab === "generator" && (
        <>
          <div className="border p-5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider">🚀 Új posztok</h3>
            <div className="flex flex-wrap gap-2">
              {(["facebook", "instagram", "tiktok"] as const).map((pf) => {
                const M = PLATFORM_META[pf]; const Ic = M.icon; const active = platforms[pf];
                return (
                  <button key={pf} onClick={() => setPlatforms({ ...platforms, [pf]: !active })}
                    className={`flex items-center gap-2 border-2 px-4 py-2 text-xs font-bold uppercase tracking-widest ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    <Ic className="h-4 w-4" /> {M.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest">Db / platform</Label>
                <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-24" />
              </div>
              <div className="flex items-center gap-2"><Switch checked={withImages} onCheckedChange={setWithImages} /><span className="text-xs uppercase tracking-widest">AI kép</span></div>
              <div className="flex items-center gap-2"><Switch checked={withScore} onCheckedChange={setWithScore} /><span className="text-xs uppercase tracking-widest">Viralitás-score</span></div>
              <Button onClick={runAgent} disabled={running} size="lg" className="ml-auto">
                {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generálás…</> : <><Sparkles className="mr-2 h-4 w-4" /> Ügynök indítása</>}
              </Button>
            </div>
            {cfg?.last_run_at && <div className="text-xs text-muted-foreground">Utolsó futás: {new Date(cfg.last_run_at).toLocaleString("hu-HU")}</div>}
          </div>

          <div className="flex gap-2 border-b">
            {(["all", "facebook", "instagram", "tiktok"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${filter === f ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
                {f === "all" ? `Összes (${posts.length})` : `${PLATFORM_META[f].label} (${posts.filter((p) => p.platform === f).length})`}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(renderPostCard)}
            {filtered.length === 0 && (
              <div className="col-span-full p-12 text-center text-sm text-muted-foreground border border-dashed">
                Még nincs generált poszt. Indítsd el az ügynököt fent. ✨
              </div>
            )}
          </div>
        </>
      )}

      {/* WEEKLY TAB */}
      {tab === "weekly" && (
        <>
          <div className="border-2 border-primary bg-primary/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-wider">📅 Automatikus heti kontenttterv</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Az AI teljes {days} napos poszt-tervet készít mindhárom platformra, változatos szögekkel, optimális posztolási időpontokra ütemezve.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["facebook", "instagram", "tiktok"] as const).map((pf) => {
                const M = PLATFORM_META[pf]; const Ic = M.icon; const active = platforms[pf];
                return (
                  <button key={pf} onClick={() => setPlatforms({ ...platforms, [pf]: !active })}
                    className={`flex items-center gap-2 border-2 px-4 py-2 text-xs font-bold uppercase tracking-widest ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    <Ic className="h-4 w-4" /> {M.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest">Napok</Label>
                <Input type="number" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24" />
              </div>
              <div className="flex items-center gap-2"><Switch checked={withImages} onCheckedChange={setWithImages} /><span className="text-xs uppercase tracking-widest">AI kép is</span></div>
              <Button onClick={runWeekly} disabled={weeklyRunning} size="lg" className="ml-auto">
                {weeklyRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Tervezés…</> : <><CalendarDays className="mr-2 h-4 w-4" /> Heti terv generálása</>}
              </Button>
            </div>
          </div>

          <h3 className="text-sm font-black uppercase tracking-wider">📆 Ütemezett posztok ({scheduledPosts.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scheduledPosts.map(renderPostCard)}
            {scheduledPosts.length === 0 && (
              <div className="col-span-full p-12 text-center text-sm text-muted-foreground border border-dashed">
                Még nincs ütemezett poszt. Generálj egy heti tervet fent. 📅
              </div>
            )}
          </div>
        </>
      )}

      {/* TRENDS TAB */}
      {tab === "trends" && (
        <>
          <div className="border-2 border-primary bg-primary/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-wider">🔥 Trend-kutatás</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Az AI aktuálisan pörgő trendeket, hashtag-eket és hook-példákat gyűjt platformonként. Egy klikkel beszúrhatod egy generálásba.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["facebook", "instagram", "tiktok"] as const).map((pf) => {
                const M = PLATFORM_META[pf]; const Ic = M.icon; const active = platforms[pf];
                return (
                  <button key={pf} onClick={() => setPlatforms({ ...platforms, [pf]: !active })}
                    className={`flex items-center gap-2 border-2 px-4 py-2 text-xs font-bold uppercase tracking-widest ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    <Ic className="h-4 w-4" /> {M.label}
                  </button>
                );
              })}
              <Button onClick={runTrends} disabled={trendRunning} size="lg" className="ml-auto">
                {trendRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kutatás…</> : <><TrendingUp className="mr-2 h-4 w-4" /> Trendek behúzása</>}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {trends.map((t) => {
              const M = PLATFORM_META[t.platform] || PLATFORM_META.facebook;
              const Ic = M.icon;
              return (
                <div key={t.id} className="border-2 p-4 space-y-3 hover:border-primary transition-colors">
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${M.color}`}>
                      <Ic className="h-3.5 w-3.5" /> {M.label}
                    </div>
                    {t.score != null && <span className={`px-2 py-0.5 text-[10px] font-black ${scoreColor(t.score)}`}>{t.score}</span>}
                  </div>
                  <div className="text-sm font-black">{t.topic}</div>
                  {t.audience_note && <div className="text-xs text-muted-foreground">{t.audience_note}</div>}
                  {t.hashtags?.length > 0 && <div className="text-[11px] text-primary">{t.hashtags.join(" ")}</div>}
                  {t.hook_examples?.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Hook példák:</div>
                      {t.hook_examples.map((h, i) => <div key={i} className="text-xs italic border-l-2 pl-2">{h}</div>)}
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={() => useTrendAsAngle(t)} className="w-full">
                    <Sparkles className="mr-2 h-3 w-3" /> Használd trendként a generátorban
                  </Button>
                </div>
              );
            })}
            {trends.length === 0 && (
              <div className="col-span-full p-12 text-center text-sm text-muted-foreground border border-dashed">
                Még nincs trend. Indíts kutatást fent. 🔥
              </div>
            )}
          </div>
        </>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="border p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Összes poszt</div>
              <div className="text-2xl font-black">{posts.length}</div>
            </div>
            <div className="border p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Publikálva</div>
              <div className="text-2xl font-black text-emerald-500">{posts.filter(p => p.status === "published").length}</div>
            </div>
            <div className="border p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Átlag viral score</div>
              <div className={`text-2xl font-black ${stats.avgScore >= 70 ? "text-emerald-500" : stats.avgScore >= 50 ? "text-yellow-500" : "text-red-500"}`}>{stats.avgScore.toFixed(0)}</div>
            </div>
            <div className="border p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ütemezett</div>
              <div className="text-2xl font-black text-primary">{scheduledPosts.length}</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wider mb-3">Platform teljesítmény</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(stats.byPlatform).map(([pf, s]) => {
                const M = PLATFORM_META[pf] || PLATFORM_META.facebook;
                const Ic = M.icon;
                const approvalRate = s.total ? (s.approved + s.published) / s.total * 100 : 0;
                return (
                  <div key={pf} className="border-2 p-4 space-y-2">
                    <div className={`flex items-center gap-2 text-sm font-black uppercase ${M.color}`}>
                      <Ic className="h-4 w-4" /> {M.label}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Összes: <span className="font-bold">{s.total}</span></div>
                      <div>Publikált: <span className="font-bold text-emerald-500">{s.published}</span></div>
                      <div>Approval: <span className="font-bold">{approvalRate.toFixed(0)}%</span></div>
                      <div>Átlag score: <span className="font-bold">{s.avgScore.toFixed(0)}</span></div>
                    </div>
                    <div className="h-2 bg-muted overflow-hidden">
                      <div className={M.bg} style={{ width: `${approvalRate}%`, height: "100%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wider mb-3">Legjobb szögek</h3>
            <div className="border">
              {Object.entries(stats.byAngle)
                .sort((a, b) => (b[1].avgScore || 0) - (a[1].avgScore || 0))
                .slice(0, 10)
                .map(([angle, s]) => (
                  <div key={angle} className="flex items-center gap-3 border-b p-3 last:border-b-0">
                    <div className={`px-2 py-1 text-xs font-black ${scoreColor(s.avgScore)}`}>{s.avgScore ? s.avgScore.toFixed(0) : "—"}</div>
                    <div className="flex-1 text-xs">{angle}</div>
                    <div className="text-[10px] text-muted-foreground">{s.total} db · {s.approved} elfogadva</div>
                  </div>
                ))}
              {Object.keys(stats.byAngle).length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">Még nincs adat.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
