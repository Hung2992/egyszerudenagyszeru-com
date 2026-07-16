import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Copy, Trash2, Check, Facebook, Instagram, Music2, RefreshCw, Image as ImageIcon } from "lucide-react";

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
};

const PLATFORM_META: Record<string, { icon: any; label: string; color: string }> = {
  facebook: { icon: Facebook, label: "Facebook", color: "text-blue-500" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-500" },
  tiktok: { icon: Music2, label: "TikTok", color: "text-fuchsia-500" },
};

export default function AdminPartnerRecruitmentAgent() {
  const [cfg, setCfg] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"all" | "facebook" | "instagram" | "tiktok">("all");
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({ facebook: true, instagram: true, tiktok: true });
  const [count, setCount] = useState(2);
  const [withImages, setWithImages] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("partner_recruitment_agent_config").select("*").order("created_at").limit(1).maybeSingle(),
      supabase.from("partner_recruitment_posts").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setCfg(c);
    setPosts((p as Post[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveCfg = async () => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await supabase.from("partner_recruitment_agent_config").update({
      enabled: cfg.enabled,
      tone: cfg.tone,
      target_audience: cfg.target_audience,
      value_props: cfg.value_props,
      custom_instructions: cfg.custom_instructions,
      posts_per_run: cfg.posts_per_run,
      updated_at: new Date().toISOString(),
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
        body: { action: "run", platforms: selected, count, with_images: withImages },
      });
      if (error) throw error;
      toast({ title: `${data?.created?.length || 0} poszt generálva ✨` });
      await load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally { setRunning(false); }
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

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Betöltés…</div>;

  const filtered = filter === "all" ? posts : posts.filter((p) => p.platform === filter);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="border-2 border-primary bg-primary/5 p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 flex items-center justify-center bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary">AI PARTNER TOBORZÓ ÜGYNÖK</div>
            <h2 className="text-xl font-black uppercase tracking-wider">Új partnerek automatán</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Az AI Facebook, Instagram és TikTok posztokat generál — nem termékekhez, hanem hogy új webshop-partnereket vonzz a platformra.
            </p>
          </div>
        </div>
      </div>

      {/* Config */}
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
            <Label className="text-xs uppercase tracking-widest">Érték-ajánlatok (miért csatlakozzanak)</Label>
            <Textarea rows={3} value={cfg.value_props} onChange={(e) => setCfg({ ...cfg, value_props: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Extra utasítás az AI-nak</Label>
            <Textarea rows={2} value={cfg.custom_instructions || ""} onChange={(e) => setCfg({ ...cfg, custom_instructions: e.target.value })} placeholder="Pl. említsd meg mindig hogy 24/7 support van…" />
          </div>
          <Button onClick={saveCfg} disabled={saving}>{saving ? "Mentés…" : "💾 Mentés"}</Button>
        </div>
      )}

      {/* Run */}
      <div className="border p-5 space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider">🚀 Új posztok generálása</h3>
        <div className="flex flex-wrap gap-2">
          {(["facebook", "instagram", "tiktok"] as const).map((pf) => {
            const M = PLATFORM_META[pf];
            const Ic = M.icon;
            const active = platforms[pf];
            return (
              <button
                key={pf}
                onClick={() => setPlatforms({ ...platforms, [pf]: !active })}
                className={`flex items-center gap-2 border-2 px-4 py-2 text-xs font-bold uppercase tracking-widest ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >
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
          <div className="flex items-center gap-2">
            <Switch checked={withImages} onCheckedChange={setWithImages} />
            <span className="text-xs uppercase tracking-widest">AI kép is</span>
          </div>
          <Button onClick={runAgent} disabled={running} size="lg" className="ml-auto">
            {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generálás…</> : <><Sparkles className="mr-2 h-4 w-4" /> Ügynök indítása</>}
          </Button>
        </div>
        {cfg?.last_run_at && (
          <div className="text-xs text-muted-foreground">Utolsó futás: {new Date(cfg.last_run_at).toLocaleString("hu-HU")}</div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 border-b">
        {(["all", "facebook", "instagram", "tiktok"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${filter === f ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
            {f === "all" ? `Összes (${posts.length})` : `${PLATFORM_META[f].label} (${posts.filter((p) => p.platform === f).length})`}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((post) => {
          const M = PLATFORM_META[post.platform];
          const Ic = M.icon;
          return (
            <div key={post.id} className="border bg-card flex flex-col">
              {post.image_url ? (
                <img src={post.image_url} alt="" className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
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
                <div className="text-xs whitespace-pre-wrap line-clamp-6 text-muted-foreground">{post.body}</div>
                {post.hashtags?.length > 0 && (
                  <div className="text-[10px] text-primary line-clamp-2">{post.hashtags.join(" ")}</div>
                )}
                {post.cta && <div className="text-xs font-bold">→ {post.cta}</div>}
                {post.video_script && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-bold uppercase tracking-widest text-muted-foreground">🎬 Forgatókönyv</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-[11px]">{post.video_script}</pre>
                  </details>
                )}
                {post.angle && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Szög: {post.angle}</div>}
                <div className="mt-auto flex flex-wrap gap-1 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => copyPost(post)}><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => regenImage(post.id)} title="Kép újragenerálás"><RefreshCw className="h-3 w-3" /></Button>
                  {post.status !== "approved" && <Button size="sm" variant="outline" onClick={() => setStatus(post.id, "approved")}><Check className="h-3 w-3" /></Button>}
                  {post.status !== "published" && <Button size="sm" variant="outline" onClick={() => setStatus(post.id, "published")}>Publikálva</Button>}
                  <Button size="sm" variant="outline" onClick={() => del(post.id)} className="ml-auto text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full p-12 text-center text-sm text-muted-foreground border border-dashed">
            Még nincs generált poszt. Indítsd el az ügynököt fent. ✨
          </div>
        )}
      </div>
    </div>
  );
}
