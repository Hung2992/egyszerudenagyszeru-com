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
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Mic, Upload, Play, Trash2, Sparkles, History, Cpu,
} from "lucide-react";

interface TtsModel {
  id: string;
  slug: string;
  name: string;
  provider: string;
  description: string | null;
  supports_hungarian: boolean;
  is_active: boolean;
  priority: number;
}

interface TtsVoice {
  id: string;
  name: string;
  description: string | null;
  status: string;
  error_message: string | null;
  model_id: string;
  provider_voice_id: string | null;
  created_at: string;
  model?: TtsModel;
}

interface TtsGeneration {
  id: string;
  voice_id: string;
  text: string;
  audio_storage_path: string | null;
  generation_time_ms: number | null;
  status: string;
  error_message: string | null;
  provider: string | null;
  created_at: string;
}

/**
 * Saját TTS Stúdió v2 — multi-provider, multi-modell
 * Független a külső szolgáltatóktól (ElevenLabs csak fallback)
 */
export default function AdminTtsStudioV2() {
  const { toast } = useToast();
  const [models, setModels] = useState<TtsModel[]>([]);
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [generations, setGenerations] = useState<TtsGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Klónozás
  const [cloneModelSlug, setCloneModelSlug] = useState<string>("xtts-v2");
  const [name, setName] = useState("Saját hang");
  const [desc, setDesc] = useState("Természetes magyar férfi hang");
  const [file, setFile] = useState<File | null>(null);

  // Generálás
  const [activeVoice, setActiveVoice] = useState<string | null>(null);
  const [text, setText] = useState(
    "Üdv! Ez az új kollekciónk — egyszerű, mégis nagyszerű streetwear.",
  );
  const [language, setLanguage] = useState("hu");
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.85);
  const [style, setStyle] = useState(0.3);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = async () => {
    setLoading(true);
    const [m, v, g] = await Promise.all([
      supabase.from("tts_models").select("*").eq("is_active", true).order("priority"),
      supabase.from("tts_voices_v2").select("*, model:tts_models(*)").order("created_at", { ascending: false }),
      supabase.from("tts_generations_v2").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (m.data) setModels(m.data as TtsModel[]);
    if (v.data) setVoices(v.data as TtsVoice[]);
    if (g.data) setGenerations(g.data as TtsGeneration[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

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
      await load();
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
      await load();
    } catch (e: any) {
      toast({ title: "TTS hiba", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Biztosan törlöd?")) return;
    await supabase.from("tts_voices_v2").delete().eq("id", id);
    await load();
  };

  const playGen = async (path: string) => {
    const { data } = await supabase.storage.from("tts-voices-v2").createSignedUrl(path, 3600);
    if (data?.signedUrl && audioRef.current) {
      audioRef.current.src = data.signedUrl;
      await audioRef.current.play();
    }
  };

  const activeModel = models.find((m) => m.slug === cloneModelSlug);

  return (
    <Card className="p-4 space-y-6 bg-card border-border">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-black uppercase tracking-wider text-lg">
          Saját TTS Stúdió v2
        </h3>
        <Badge variant="outline" className="text-[10px]">multi-provider</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Saját, multi-modell TTS rendszer: <strong>XTTS-v2</strong> (legjobb magyar),{" "}
        <strong>F5-TTS</strong> (legmodernebb angol), <strong>Chatterbox</strong> (érzelmek),{" "}
        <strong>ElevenLabs</strong> (fallback). Minden adat a saját adatbázisunkban.
      </p>

      {/* === MODELL VÁLASZTÓ + KLÓNOZÁS === */}
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
            <Label className="text-xs uppercase">Hangminta (10mp+, max 25MB)</Label>
            <Input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
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
            {voices.map((v) => (
              <div
                key={v.id}
                className={`flex items-center justify-between border p-2 ${
                  activeVoice === v.id ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <button className="flex-1 text-left" onClick={() => setActiveVoice(v.id)}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{v.name}</span>
                    {v.model && (
                      <Badge variant="outline" className="text-[9px]">{v.model.name}</Badge>
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
            ))}
          </div>
        )}
      </div>

      {/* === GENERÁLÁS === */}
      <div className="border border-border p-3 space-y-3">
        <Label className="text-xs uppercase font-bold">Beszédgenerálás</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Mit mondjon a hang?"
        />

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <Label className="text-[10px] uppercase">Nyelv (XTTS-v2)</Label>
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
        <audio ref={audioRef} controls className="w-full" />
      </div>

      {/* === ELŐZMÉNYEK === */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <Label className="text-xs uppercase font-bold">Generálási előzmények</Label>
        </div>
        {generations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Még nincs generálás.</p>
        ) : (
          <div className="space-y-1">
            {generations.map((g) => (
              <div key={g.id} className="flex items-start gap-2 border border-border p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="truncate">{g.text}</div>
                  <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{g.provider}</span>
                    <span>•</span>
                    <span>{g.generation_time_ms}ms</span>
                    <span>•</span>
                    <span>{new Date(g.created_at).toLocaleString("hu-HU")}</span>
                    {g.status !== "completed" && (
                      <Badge variant="destructive" className="text-[9px]">{g.status}</Badge>
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
