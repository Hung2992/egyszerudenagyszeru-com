import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Target, Film, Languages, LineChart, Sparkles, Trash2 } from "lucide-react";

type SubTab = "campaign" | "video" | "translate" | "predict";

const LANGS = [
  { code: "en", label: "🇬🇧 Angol" },
  { code: "de", label: "🇩🇪 Német" },
  { code: "ro", label: "🇷🇴 Román" },
  { code: "sk", label: "🇸🇰 Szlovák" },
];

async function invoke(action: string, payload: any = {}) {
  const { data, error } = await supabase.functions.invoke("partner-recruitment-agent", { body: { action, ...payload } });
  if (error) {
    const context = (error as any).context;
    if (context && typeof context.json === "function") {
      try {
        const body = await context.clone().json();
        throw new Error(body?.error || body?.message || error.message);
      } catch (jsonError: any) {
        if (jsonError?.message && jsonError.message !== "Failed to execute 'json' on 'Response': body stream already read") throw jsonError;
      }
    }
    if (context && typeof context.text === "function") {
      try {
        const text = await context.clone().text();
        if (text) throw new Error(text);
      } catch (textError: any) {
        if (textError?.message) throw textError;
      }
    }
    throw new Error(error.message || "Nem sikerült elérni az AI Partner Toborzó végpontot.");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AdminPartnerRecruitmentPro() {
  const [sub, setSub] = useState<SubTab>("campaign");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Pro Suite
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Kampányok · Videó Stúdió · Többnyelvű posztok · Growth Predictor</p>
      </div>
      <div className="flex gap-2 border-b overflow-x-auto">
        {[
          { k: "campaign", l: "🤖 Kampány Manager", i: Target },
          { k: "video", l: "🎬 Videó Stúdió", i: Film },
          { k: "translate", l: "🌍 Multi-language", i: Languages },
          { k: "predict", l: "📈 Growth Predictor", i: LineChart },
        ].map(t => (
          <button key={t.k} onClick={() => setSub(t.k as SubTab)}
            className={`px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${sub === t.k ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>
      {sub === "campaign" && <CampaignManager />}
      {sub === "video" && <VideoStudio />}
      {sub === "translate" && <MultiLanguagePanel />}
      {sub === "predict" && <GrowthPredictor />}
    </div>
  );
}

// ============ 1. CAMPAIGN MANAGER ============
function CampaignManager() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", goal: "", budget_huf: 0, target_audience: "", start_date: "", end_date: "" });
  const [running, setRunning] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("partner_recruitment_campaigns").select("*").order("created_at", { ascending: false }).limit(50);
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) { toast({ title: "Név kötelező", variant: "destructive" }); return; }
    setRunning(true);
    try {
      await invoke("create_campaign", form);
      toast({ title: "Kampány létrehozva AI stratégiával" });
      setForm({ name: "", goal: "", budget_huf: 0, target_audience: "", start_date: "", end_date: "" });
      load();
    } catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setRunning(false); }
  };

  const remove = async (id: string) => {
    await supabase.from("partner_recruitment_campaigns").delete().eq("id", id);
    load();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="border p-4 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider">Új kampány</h3>
        <div><Label>Név</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Cél</Label><Input value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} placeholder="pl. 100 új partner Q1-ben" /></div>
        <div><Label>Költségkeret (HUF)</Label><Input type="number" value={form.budget_huf} onChange={e => setForm({ ...form, budget_huf: Number(e.target.value) })} /></div>
        <div><Label>Célközönség</Label><Textarea rows={2} value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Kezdés</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>Vége</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
        </div>
        <Button onClick={create} disabled={running} className="w-full">
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Létrehoz + AI stratégia
        </Button>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider">Kampányok ({items.length})</h3>
        {items.length === 0 && <div className="border p-6 text-xs text-center text-muted-foreground">Még nincs kampány.</div>}
        {items.map(c => (
          <div key={c.id} className="border p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-black">{c.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase">{c.status} · {c.budget_huf?.toLocaleString("hu-HU") || 0} HUF</div>
              </div>
              <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            {c.goal && <div className="text-xs mt-2">{c.goal}</div>}
            {c.kpis && Object.keys(c.kpis).length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                {Object.entries(c.kpis).map(([k, v]: any) => (
                  <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-bold">{String(v)}</span></div>
                ))}
              </div>
            )}
            {c.ai_suggestions?.optimizations?.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <div className="text-[10px] uppercase text-muted-foreground mb-1">AI javaslatok</div>
                <ul className="text-xs space-y-1">
                  {c.ai_suggestions.optimizations.slice(0, 3).map((o: string, i: number) => <li key={i}>• {o}</li>)}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 2. VIDEO STUDIO ============
function VideoStudio() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ topic: "", platform: "tiktok", duration: 30 });
  const [running, setRunning] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("partner_recruitment_videos").select("*").order("created_at", { ascending: false }).limit(20);
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setRunning(true);
    try {
      await invoke("video_studio", form);
      toast({ title: "Videó csomag kész" });
      load();
    } catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setRunning(false); }
  };

  const remove = async (id: string) => {
    await supabase.from("partner_recruitment_videos").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="border p-4 grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2"><Label>Téma</Label><Input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="pl. Hogyan indíts saját webshopot 5 perc alatt" /></div>
        <div>
          <Label>Platform</Label>
          <select className="w-full h-10 border bg-background px-3" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram Reels</option>
            <option value="facebook">Facebook Reels</option>
          </select>
        </div>
        <div><Label>Hossz (mp)</Label><Input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /></div>
        <div className="md:col-span-4">
          <Button onClick={generate} disabled={running} className="w-full">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Film className="h-4 w-4 mr-2" />}
            Videó csomag generálása (script + storyboard + narráció + felirat + zene + thumbnail)
          </Button>
        </div>
      </div>
      {items.map(v => (
        <div key={v.id} className="border p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-black uppercase text-xs">{v.platform} · {v.duration_seconds} mp</div>
              <div className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleString("hu-HU")}</div>
            </div>
            <button onClick={() => remove(v.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
          {v.thumbnail_url && <img src={v.thumbnail_url} alt="thumbnail" className="w-40 border" />}
          {Array.isArray(v.script) && v.script.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">📽️ Forgatókönyv</div>
              <div className="border divide-y">
                {v.script.map((s: any, i: number) => (
                  <div key={i} className="p-2 text-xs grid grid-cols-[60px_1fr] gap-2">
                    <div className="font-black text-primary">{s.seconds || `${i+1}.`}</div>
                    <div>
                      <div><span className="text-muted-foreground">Kép:</span> {s.visual}</div>
                      {s.voiceover && <div><span className="text-muted-foreground">Narráció:</span> {s.voiceover}</div>}
                      {s.text_overlay && <div><span className="text-muted-foreground">Felirat:</span> {s.text_overlay}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {v.music_suggestion && <div className="text-xs">🎵 <span className="text-muted-foreground">Zene:</span> {v.music_suggestion}</div>}
          {v.captions && (
            <details className="text-xs"><summary className="cursor-pointer font-bold">📝 Feliratok</summary>
              <pre className="whitespace-pre-wrap mt-2 p-2 bg-muted">{v.captions}</pre>
            </details>
          )}
          {v.narration && (
            <details className="text-xs"><summary className="cursor-pointer font-bold">🎙️ Teljes narráció</summary>
              <p className="mt-2 p-2 bg-muted">{v.narration}</p>
            </details>
          )}
        </div>
      ))}
      {items.length === 0 && <div className="border p-8 text-center text-xs text-muted-foreground">Még nincs videó csomag.</div>}
    </div>
  );
}

// ============ 3. MULTI-LANGUAGE ============
function MultiLanguagePanel() {
  const [posts, setPosts] = useState<any[]>([]);
  const [translations, setTranslations] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [langs, setLangs] = useState<string[]>(["en"]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("partner_recruitment_posts").select("id,platform,hook,body,language").order("created_at", { ascending: false }).limit(30);
      setPosts(data || []);
    })();
  }, []);

  const loadTranslations = async (postId: string) => {
    const { data } = await supabase.from("partner_recruitment_translations").select("*").eq("post_id", postId);
    setTranslations(t => ({ ...t, [postId]: data || [] }));
  };

  const translate = async () => {
    if (!selected || !langs.length) return;
    setRunning(true);
    try {
      await invoke("translate_post", { post_id: selected, langs });
      toast({ title: `Fordítás kész (${langs.length} nyelv)` });
      loadTranslations(selected);
    } catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setRunning(false); }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]">
      <div className="border max-h-[600px] overflow-auto">
        <div className="p-3 border-b text-[10px] uppercase font-black tracking-widest">Posztok</div>
        {posts.map(p => (
          <button key={p.id} onClick={() => { setSelected(p.id); loadTranslations(p.id); }}
            className={`w-full text-left p-3 border-b hover:bg-muted ${selected === p.id ? "bg-muted" : ""}`}>
            <div className="text-[10px] uppercase text-muted-foreground">{p.platform}</div>
            <div className="text-xs font-bold line-clamp-2">{p.hook || p.body?.slice(0, 60)}</div>
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {!selected && <div className="border p-8 text-center text-xs text-muted-foreground">Válassz egy posztot a fordításhoz.</div>}
        {selected && (
          <>
            <div className="border p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Célnyelvek</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {LANGS.map(l => (
                  <label key={l.code} className={`cursor-pointer px-3 py-2 border text-xs font-bold ${langs.includes(l.code) ? "bg-primary text-primary-foreground" : ""}`}>
                    <input type="checkbox" className="hidden" checked={langs.includes(l.code)}
                      onChange={e => setLangs(v => e.target.checked ? [...v, l.code] : v.filter(x => x !== l.code))} />
                    {l.label}
                  </label>
                ))}
              </div>
              <Button onClick={translate} disabled={running || !langs.length}>
                {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
                Fordítás AI-val
              </Button>
            </div>
            <div className="space-y-3">
              {(translations[selected] || []).map((t: any) => (
                <div key={t.id} className="border p-3">
                  <div className="text-[10px] uppercase font-black text-primary mb-2">{LANGS.find(l => l.code === t.target_lang)?.label || t.target_lang}</div>
                  {t.hook && <div className="text-sm font-bold mb-1">{t.hook}</div>}
                  <div className="text-xs whitespace-pre-wrap">{t.body}</div>
                  {t.hashtags?.length > 0 && <div className="text-[10px] text-muted-foreground mt-2">{t.hashtags.join(" ")}</div>}
                  {t.cta && <div className="text-xs font-bold mt-2">→ {t.cta}</div>}
                </div>
              ))}
              {(translations[selected]?.length ?? 0) === 0 && <div className="text-xs text-muted-foreground text-center py-4">Még nincs fordítás.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ 4. GROWTH PREDICTOR ============
function GrowthPredictor() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const load = async () => {
    const [c, p] = await Promise.all([
      supabase.from("partner_recruitment_campaigns").select("id,name").order("created_at", { ascending: false }),
      supabase.from("partner_recruitment_predictions").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setCampaigns(c.data || []);
    setPredictions(p.data || []);
  };
  useEffect(() => { load(); }, []);

  const predict = async () => {
    setRunning(true);
    try {
      await invoke("growth_predict", { campaign_id: campaignId || undefined });
      toast({ title: "Előrejelzés elkészült" });
      load();
    } catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setRunning(false); }
  };

  return (
    <div className="space-y-4">
      <div className="border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <Label>Kampány (opcionális)</Label>
          <select className="w-full h-10 border bg-background px-3" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
            <option value="">Általános toborzás</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Button onClick={predict} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LineChart className="h-4 w-4 mr-2" />}
          Előrejelzés generálása
        </Button>
      </div>
      <div className="space-y-3">
        {predictions.length === 0 && <div className="border p-8 text-center text-xs text-muted-foreground">Még nincs előrejelzés.</div>}
        {predictions.map(p => {
          const c = campaigns.find(x => x.id === p.campaign_id);
          return (
            <div key={p.id} className="border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black text-sm">{c?.name || "Általános toborzás"}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString("hu-HU")}</div>
                </div>
                <div className={`px-2 py-1 text-xs font-black ${p.confidence >= 0.7 ? "bg-emerald-500 text-white" : p.confidence >= 0.4 ? "bg-yellow-500 text-black" : "bg-red-500 text-white"}`}>
                  {Math.round((p.confidence || 0) * 100)}% konfidencia
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Metric label="Várható elérés" value={p.predicted_reach?.toLocaleString("hu-HU") || 0} />
                <Metric label="Érdeklődők" value={p.predicted_leads?.toLocaleString("hu-HU") || 0} />
                <Metric label="Jelentkezések" value={p.predicted_signups?.toLocaleString("hu-HU") || 0} />
                <Metric label="Konverzió" value={`${((p.predicted_conversion || 0) * 100).toFixed(1)}%`} />
                <Metric label="Poszt / nap" value={p.recommended_posts_per_day || 0} />
              </div>
              {p.reasoning && <div className="text-xs border-t pt-2 text-muted-foreground">💡 {p.reasoning}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div className="border p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl font-black text-primary">{value}</div>
    </div>
  );
}
