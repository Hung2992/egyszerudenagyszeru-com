import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Mic, Upload, Play, Trash2, Sparkles, History, Cpu,
  Settings, Shield, Clock, Zap, BookOpen, Megaphone, Smile, Heart, Moon,
} from "lucide-react";

interface TtsModel {
  id: string; slug: string; name: string; provider: string;
  description: string | null; supports_hungarian: boolean;
  is_active: boolean; priority: number;
}
interface TtsVoice {
  id: string; name: string; description: string | null; status: string;
  error_message: string | null; model_id: string; provider_voice_id: string | null;
  created_at: string; expires_at?: string | null;
  moderation_status?: string; virus_scan_status?: string;
  model?: TtsModel;
}
interface TtsGeneration {
  id: string; voice_id: string; text: string;
  audio_storage_path: string | null; generation_time_ms: number | null;
  status: string; error_message: string | null; provider: string | null;
  progress_percent?: number; created_at: string;
}
interface TtsPreset {
  id: string; slug: string; name: string; description: string | null;
  icon: string; category: string; sort_order: number; parameters: any;
}
interface TtsSettings {
  sample_ttl_days: number; generation_ttl_days: number;
  use_custom_gpu: boolean; custom_gpu_endpoint: string | null;
  custom_gpu_secret_name: string | null;
  enable_size_check: boolean; enable_clamav_scan: boolean;
  enable_ai_moderation: boolean; clamav_endpoint: string | null;
  max_sample_size_mb: number; max_sample_duration_sec: number;
}

const ICON_MAP: Record<string, any> = {
  Mic, BookOpen, Megaphone, Smile, Heart, Zap, Moon,
};

export default function AdminTtsStudioV2() {
  const { toast } = useToast();
  const [models, setModels] = useState<TtsModel[]>([]);
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [generations, setGenerations] = useState<TtsGeneration[]>([]);
  const [presets, setPresets] = useState<TtsPreset[]>([]);
  const [settings, setSettings] = useState<TtsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Klónozás
  const [cloneModelSlug, setCloneModelSlug] = useState<string>("xtts-v2");
  const [name, setName] = useState("Saját hang");
  const [desc, setDesc] = useState("Természetes magyar férfi hang");
  const [file, setFile] = useState<File | null>(null);

  // Generálás
  const [activeVoice, setActiveVoice] = useState<string | null>(null);
  const [activePresetSlug, setActivePresetSlug] = useState<string>("hu-podcast");
  const [text, setText] = useState(
    "Üdv! Ez az új kollekciónk — egyszerű, mégis nagyszerű streetwear.",
  );
  const [language, setLanguage] = useState("hu");
  const [stability, setStability] = useState(0.75);
  const [similarity, setSimilarity] = useState(0.85);
  const [style, setStyle] = useState(0.2);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = async () => {
    setLoading(true);
    const [m, v, g, p, s] = await Promise.all([
      supabase.from("tts_models").select("*").eq("is_active", true).order("priority"),
      supabase.from("tts_voices_v2").select("*, model:tts_models(*)").order("created_at", { ascending: false }),
      supabase.from("tts_generations_v2").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("tts_voice_presets").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("tts_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (m.data) setModels(m.data as TtsModel[]);
    if (v.data) setVoices(v.data as TtsVoice[]);
    if (g.data) setGenerations(g.data as TtsGeneration[]);
    if (p.data) setPresets(p.data as TtsPreset[]);
    if (s.data) setSettings(s.data as TtsSettings);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ============ REALTIME FELIRATKOZÁS ============
  useEffect(() => {
    const channel = supabase
      .channel("tts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tts_generations_v2" },
        (payload) => {
          setGenerations((prev) => {
            if (payload.eventType === "INSERT") {
              return [payload.new as TtsGeneration, ...prev].slice(0, 20);
            } else if (payload.eventType === "UPDATE") {
              return prev.map((g) =>
                g.id === (payload.new as any).id ? (payload.new as TtsGeneration) : g,
              );
            } else if (payload.eventType === "DELETE") {
              return prev.filter((g) => g.id !== (payload.old as any).id);
            }
            return prev;
          });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "tts_voices_v2" },
        () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const applyPreset = (slug: string) => {
    const p = presets.find((x) => x.slug === slug);
    if (!p) return;
    setActivePresetSlug(slug);
    const params = p.parameters || {};
    if (params.language) setLanguage(params.language);
    if (typeof params.stability === "number") setStability(params.stability);
    if (typeof params.similarity_boost === "number") setSimilarity(params.similarity_boost);
    if (typeof params.style === "number") setStyle(params.style);
    if (typeof params.speed === "number") setSpeed(params.speed);
    toast({ title: `🎚️ ${p.name} beállítva`, description: p.description || "" });
  };

  const upload = async () => {
    if (!file) return toast({ title: "Válassz fájlt", variant: "destructive" });
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name);
      fd.append("description", desc);
      fd.append("model_slug", cloneModelSlug);

      const { data, error } = await supabase.functions.invoke("tts-clone-voice-v2", { body: fd });
      if (data?.error) throw new Error(data.error);
      if (error) {
        let detail = error.message || "Hiba";
        try {
          const ctx: any = (error as any).context;
          if (ctx?.response) {
            const txt = await ctx.response.clone().text();
            const j = JSON.parse(txt);
            if (j?.error) detail = j.error;
          }
        } catch (_) {}
        throw new Error(detail);
      }
      toast({ title: "✓ Hang klónozva", description: data?.voice?.name });
      setFile(null);
      if (data?.voice?.id) setActiveVoice(data.voice.id);
    } catch (e: any) {
      toast({ title: "Klónozás hiba", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const generate = async () => {
    if (!activeVoice) return toast({ title: "Válassz hangot", variant: "destructive" });
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("tts-gateway", {
        body: {
          voice_id: activeVoice,
          text,
          voice_settings: { language, stability, similarity_boost: similarity, style, speed },
        },
      });
      if (data?.error) throw new Error(data.error);
      if (error) {
        let detail = error.message || "TTS hiba";
        try {
          const ctx: any = (error as any).context;
          if (ctx?.response) {
            const txt = await ctx.response.clone().text();
            const j = JSON.parse(txt);
            if (j?.error) detail = j.error;
          }
        } catch (_) {}
        throw new Error(detail);
      }
      if (!data?.audio_base64) throw new Error("Nem érkezett audio");
      const url = `data:${data.mime};base64,${data.audio_base64}`;
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
      toast({
        title: `✓ Generálva (${data.model_slug})`,
        description: `${data.generation_time_ms}ms • ${data.provider}`,
      });
    } catch (e: any) {
      toast({ title: "TTS hiba", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Biztosan törlöd?")) return;
    await supabase.from("tts_voices_v2").delete().eq("id", id);
  };

  const playGen = async (path: string) => {
    const { data } = await supabase.storage.from("tts-voices-v2").createSignedUrl(path, 3600);
    if (data?.signedUrl && audioRef.current) {
      audioRef.current.src = data.signedUrl;
      await audioRef.current.play();
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabase.from("tts_settings").update(settings).eq("id", 1);
    if (error) {
      toast({ title: "Mentés hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ Beállítások mentve" });
    }
  };

  const runCleanup = async () => {
    const { data, error } = await supabase.functions.invoke("tts-cleanup");
    if (error || data?.error) {
      toast({ title: "Cleanup hiba", description: error?.message || data?.error, variant: "destructive" });
    } else {
      toast({
        title: "✓ Cleanup lefutott",
        description: `${data.voices_deleted} hang, ${data.generations_deleted} generálás törölve`,
      });
    }
  };

  const activeModel = models.find((m) => m.slug === cloneModelSlug);
  const pendingGens = generations.filter((g) => g.status === "running" || g.status === "pending");

  return (
    <Card className="p-4 space-y-6 bg-card border-border">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-black uppercase tracking-wider text-lg">
          Saját TTS Stúdió v2
        </h3>
        <Badge variant="outline" className="text-[10px]">multi-provider</Badge>
        {settings?.use_custom_gpu && (
          <Badge variant="default" className="text-[10px] bg-primary">
            <Cpu className="h-3 w-3 mr-1" /> Saját GPU aktív
          </Badge>
        )}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setShowSettings(!showSettings)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* === BEÁLLÍTÁSOK PANEL === */}
      {showSettings && settings && (
        <div className="border border-primary/40 p-3 space-y-3 bg-primary/5">
          <Label className="text-xs uppercase font-bold flex items-center gap-2">
            <Settings className="h-4 w-4" /> TTS Beállítások
          </Label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase flex items-center gap-1">
                <Clock className="h-3 w-3" /> Minta TTL (nap)
              </Label>
              <Input type="number" min={1} max={365} value={settings.sample_ttl_days}
                onChange={(e) => setSettings({ ...settings, sample_ttl_days: parseInt(e.target.value) || 90 })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase flex items-center gap-1">
                <Clock className="h-3 w-3" /> Generálás TTL (nap)
              </Label>
              <Input type="number" min={1} max={365} value={settings.generation_ttl_days}
                onChange={(e) => setSettings({ ...settings, generation_ttl_days: parseInt(e.target.value) || 30 })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Max minta méret (MB)</Label>
              <Input type="number" min={1} max={100} value={settings.max_sample_size_mb}
                onChange={(e) => setSettings({ ...settings, max_sample_size_mb: parseInt(e.target.value) || 25 })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Max minta hossz (mp)</Label>
              <Input type="number" min={5} max={300} value={settings.max_sample_duration_sec}
                onChange={(e) => setSettings({ ...settings, max_sample_duration_sec: parseInt(e.target.value) || 60 })} />
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <Label className="text-[10px] uppercase font-bold flex items-center gap-1">
              <Shield className="h-3 w-3" /> Tartalomellenőrzés
            </Label>
            <div className="flex items-center justify-between">
              <span className="text-xs">Méret/MIME/hossz check</span>
              <Switch checked={settings.enable_size_check}
                onCheckedChange={(v) => setSettings({ ...settings, enable_size_check: v })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">AI moderáció (Gemini)</span>
              <Switch checked={settings.enable_ai_moderation}
                onCheckedChange={(v) => setSettings({ ...settings, enable_ai_moderation: v })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">ClamAV víruscheck</span>
              <Switch checked={settings.enable_clamav_scan}
                onCheckedChange={(v) => setSettings({ ...settings, enable_clamav_scan: v })} />
            </div>
            {settings.enable_clamav_scan && (
              <Input placeholder="ClamAV REST endpoint URL" value={settings.clamav_endpoint || ""}
                onChange={(e) => setSettings({ ...settings, clamav_endpoint: e.target.value })} />
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <Label className="text-[10px] uppercase font-bold flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Saját GPU Provider
            </Label>
            <div className="flex items-center justify-between">
              <span className="text-xs">Globális kill switch — minden hívás saját GPU-ra</span>
              <Switch checked={settings.use_custom_gpu}
                onCheckedChange={(v) => setSettings({ ...settings, use_custom_gpu: v })} />
            </div>
            <Input placeholder="https://gpu.example.com/tts" value={settings.custom_gpu_endpoint || ""}
              onChange={(e) => setSettings({ ...settings, custom_gpu_endpoint: e.target.value })} />
            <Input placeholder="Secret név (alap: CUSTOM_GPU_TTS_TOKEN)" value={settings.custom_gpu_secret_name || ""}
              onChange={(e) => setSettings({ ...settings, custom_gpu_secret_name: e.target.value })} />
            <p className="text-[10px] text-muted-foreground">
              Kontraktus: POST JSON {`{text, voice_id, speaker_url, language, params}`} → audio binary VAGY {`{audio_base64, mime}`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={saveSettings} className="flex-1 uppercase font-black">
              Mentés
            </Button>
            <Button size="sm" variant="outline" onClick={runCleanup}>
              <Trash2 className="h-3 w-3 mr-1" /> Cleanup most
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Saját, multi-modell TTS rendszer: <strong>XTTS-v2</strong> (legjobb magyar),{" "}
        <strong>F5-TTS</strong> (legmodernebb angol), <strong>Chatterbox</strong> (érzelmek),{" "}
        <strong>ElevenLabs</strong> (fallback). Adatok lokálisan, lejárat automatikus.
      </p>

      {/* === KLÓNOZÁS === */}
      <div className="border border-border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          <Label className="text-xs uppercase font-bold">Új hang klónozása</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs uppercase">TTS modell</Label>
            <Select value={cloneModelSlug} onValueChange={setCloneModelSlug}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.slug} value={m.slug}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{m.name}</span>
                      {m.supports_hungarian && (
                        <Badge variant="secondary" className="text-[9px]">HU</Badge>
                      )}
                      <Badge variant="outline" className="text-[9px]">{m.provider}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeModel?.description && (
              <p className="text-[10px] text-muted-foreground mt-1">{activeModel.description}</p>
            )}
          </div>

          <div>
            <Label className="text-xs uppercase">Hang neve</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase">Leírás</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs uppercase">
              Hangminta ({settings?.max_sample_size_mb || 25}MB max, {settings?.max_sample_duration_sec || 60}mp)
            </Label>
            <Input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <p className="text-[10px] text-muted-foreground mt-1">
              ✓ Méret/MIME check {settings?.enable_ai_moderation && "• ✓ AI moderáció"}
              {settings?.enable_clamav_scan && " • ✓ ClamAV scan"}
            </p>
          </div>
          <div className="md:col-span-2">
            <Button onClick={upload} disabled={!file || uploading} className="w-full uppercase font-black">
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Klónozás...</>
                : <><Upload className="h-4 w-4 mr-2" /> Klónozás {activeModel?.name}-vel</>}
            </Button>
          </div>
        </div>
      </div>

      {/* === HANGLISTA === */}
      <div className="space-y-2">
        <Label className="text-xs uppercase font-bold">Klónozott hangok ({voices.length})</Label>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : voices.length === 0 ? (
          <p className="text-xs text-muted-foreground">Még nincs hang.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {voices.map((v) => {
              const daysLeft = v.expires_at
                ? Math.max(0, Math.ceil((new Date(v.expires_at).getTime() - Date.now()) / 86400000))
                : null;
              return (
                <div key={v.id}
                  className={`flex items-center justify-between border p-2 ${
                    activeVoice === v.id ? "border-primary bg-primary/10" : "border-border"
                  }`}>
                  <button className="flex-1 text-left" onClick={() => setActiveVoice(v.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{v.name}</span>
                      {v.model && <Badge variant="outline" className="text-[9px]">{v.model.name}</Badge>}
                      {daysLeft !== null && daysLeft < 7 && (
                        <Badge variant="destructive" className="text-[9px]">{daysLeft} nap</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {v.status === "ready" ? "✓ Kész"
                        : v.status === "error" ? `✗ ${v.error_message?.slice(0, 80)}`
                        : "⏳ " + v.status}
                    </div>
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => remove(v.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === GENERÁLÁS === */}
      <div className="border border-border p-3 space-y-3">
        <Label className="text-xs uppercase font-bold">Beszédgenerálás</Label>

        {/* PRESET CHIPEK */}
        <div>
          <Label className="text-[10px] uppercase mb-2 block">Hangminőség preset (1 kattintás)</Label>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const Icon = ICON_MAP[p.icon] || Mic;
              const active = activePresetSlug === p.slug;
              return (
                <button key={p.slug} onClick={() => applyPreset(p.slug)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-bold uppercase transition ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                  }`}>
                  <Icon className="h-3 w-3" />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
          placeholder="Mit mondjon a hang?" />

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <Label className="text-[10px] uppercase">Nyelv</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hu">Magyar</SelectItem>
                <SelectItem value="en">Angol</SelectItem>
                <SelectItem value="de">Német</SelectItem>
                <SelectItem value="es">Spanyol</SelectItem>
                <SelectItem value="fr">Francia</SelectItem>
                <SelectItem value="it">Olasz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase">Sebesség: {speed.toFixed(2)}x</Label>
            <Slider value={[speed]} onValueChange={(v) => setSpeed(v[0])} min={0.7} max={1.3} step={0.05} />
          </div>
          <div>
            <Label className="text-[10px] uppercase">Stabilitás: {stability.toFixed(2)}</Label>
            <Slider value={[stability]} onValueChange={(v) => setStability(v[0])} min={0} max={1} step={0.05} />
          </div>
          <div>
            <Label className="text-[10px] uppercase">Hasonlóság: {similarity.toFixed(2)}</Label>
            <Slider value={[similarity]} onValueChange={(v) => setSimilarity(v[0])} min={0} max={1} step={0.05} />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] uppercase">Stílus / érzelem: {style.toFixed(2)}</Label>
            <Slider value={[style]} onValueChange={(v) => setStyle(v[0])} min={0} max={1} step={0.05} />
          </div>
        </div>

        <Button onClick={generate} disabled={!activeVoice || generating} className="w-full uppercase font-black">
          {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generálás...</>
            : <><Play className="h-4 w-4 mr-2" /> Hang generálása</>}
        </Button>

        {/* REALTIME PROGRESS */}
        {pendingGens.length > 0 && (
          <div className="space-y-2 border border-primary/30 p-2 bg-primary/5">
            <Label className="text-[10px] uppercase font-bold flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Folyamatban ({pendingGens.length})
            </Label>
            {pendingGens.map((g) => (
              <div key={g.id} className="space-y-1">
                <div className="text-[10px] truncate">{g.text.slice(0, 80)}</div>
                <Progress value={g.progress_percent || 30} className="h-1" />
              </div>
            ))}
          </div>
        )}

        <audio ref={audioRef} controls className="w-full" />
      </div>

      {/* === ELŐZMÉNYEK === */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <Label className="text-xs uppercase font-bold">Generálási előzmények (realtime)</Label>
        </div>
        {generations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Még nincs generálás.</p>
        ) : (
          <div className="space-y-1">
            {generations.map((g) => (
              <div key={g.id} className="flex items-start gap-2 border border-border p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="truncate">{g.text}</div>
                  <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                    <span>{g.provider}</span>
                    {g.generation_time_ms && <><span>•</span><span>{g.generation_time_ms}ms</span></>}
                    <span>•</span>
                    <span>{new Date(g.created_at).toLocaleString("hu-HU")}</span>
                    {g.status !== "completed" && (
                      <Badge variant={g.status === "failed" ? "destructive" : "secondary"} className="text-[9px]">
                        {g.status}
                      </Badge>
                    )}
                  </div>
                </div>
                {g.audio_storage_path && (
                  <Button size="sm" variant="ghost" onClick={() => playGen(g.audio_storage_path!)}>
                    <Play className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
