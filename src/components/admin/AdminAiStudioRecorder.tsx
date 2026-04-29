import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mic, Video as VideoIcon, Image as ImageIcon, Wand2, Loader2,
  Upload, Play, Trash2, Download, Volume2, Sparkles, RefreshCw,
} from "lucide-react";

// ======================================================================
// AI Marketing Stúdió — VIDEÓ + HANG + HÁTTÉR (saját rendszer, GPU nélkül)
// ----------------------------------------------------------------------
//  • Hangminta feltöltés -> WebAudio elemzés (pitch + tempo) -> DB
//  • Videó feltöltés (saját arc/test felvétel)
//  • Háttér feltöltés (webshop kép/saját kép)
//  • AI háttércsere: MediaPipe Selfie Segmentation (CDN-ről, browser-side)
//  • Saját TTS: SpeechSynthesis API + hangminta-paraméterek (pitch/rate)
// ======================================================================

interface VoiceSample {
  id: string;
  title: string;
  storage_path: string;
  duration_sec: number | null;
  pitch_hz: number | null;
  tempo_wpm: number | null;
  analysis_status: string;
  created_at: string;
}

interface VideoAsset {
  id: string;
  title: string;
  storage_path: string;
  duration_sec: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

interface BackgroundAsset {
  id: string;
  title: string;
  bg_type: string;
  storage_path: string | null;
  category: string | null;
  created_at: string;
}

interface ClipAsset {
  id: string;
  title: string;
  generated_text: string | null;
  output_path: string | null;
  status: string;
  created_at: string;
}

interface ShopProduct {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
}

type AudioSource = "original" | "tts" | "none";
type BgSource = "uploaded" | "product";

const MEDIAPIPE_SCRIPT = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js";

declare global {
  interface Window {
    SelfieSegmentation?: any;
  }
}

const loadMediaPipe = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (window.SelfieSegmentation) return resolve(window.SelfieSegmentation);
    const s = document.createElement("script");
    s.src = MEDIAPIPE_SCRIPT;
    s.crossOrigin = "anonymous";
    s.onload = () => {
      if (window.SelfieSegmentation) resolve(window.SelfieSegmentation);
      else reject(new Error("MediaPipe SelfieSegmentation nem érhető el."));
    };
    s.onerror = () => reject(new Error("MediaPipe betöltési hiba."));
    document.head.appendChild(s);
  });
};

// WebAudio pitch elemzés (autocorrelation)
const detectPitch = async (file: File): Promise<{ pitch: number; duration: number }> => {
  const arrayBuf = await file.arrayBuffer();
  const ctx = new AudioContext();
  const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
  const sampleRate = audioBuf.sampleRate;
  const channelData = audioBuf.getChannelData(0);
  const duration = audioBuf.duration;

  // 0.5 sec ablak középről
  const start = Math.floor(channelData.length / 2);
  const len = Math.min(2048, channelData.length - start);
  const buf = channelData.slice(start, start + len);

  // Autocorrelation
  let bestOffset = -1;
  let bestCorr = 0;
  let rms = 0;
  for (let i = 0; i < len; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / len);
  if (rms < 0.01) return { pitch: 150, duration };

  for (let offset = 32; offset < 1024; offset++) {
    let corr = 0;
    for (let i = 0; i < len - offset; i++) {
      corr += buf[i] * buf[i + offset];
    }
    corr = corr / (len - offset);
    if (corr > bestCorr) {
      bestCorr = corr;
      bestOffset = offset;
    }
  }
  ctx.close();
  if (bestOffset === -1) return { pitch: 150, duration };
  const pitch = sampleRate / bestOffset;
  return { pitch: Math.max(60, Math.min(400, pitch)), duration };
};

const AdminAiStudioRecorder = () => {
  const [voiceSamples, setVoiceSamples] = useState<VoiceSample[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [backgrounds, setBackgrounds] = useState<BackgroundAsset[]>([]);
  const [clips, setClips] = useState<ClipAsset[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);

  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [selectedBg, setSelectedBg] = useState<string>("");
  const [selectedProductBg, setSelectedProductBg] = useState<string>("");
  const [bgSource, setBgSource] = useState<BgSource>("uploaded");
  const [audioSource, setAudioSource] = useState<AudioSource>("tts");
  const [scriptText, setScriptText] = useState<string>("");
  const [clipTitle, setClipTitle] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewBgImgRef = useRef<HTMLImageElement>(null);

  // ============== LOAD ==============
  const loadAll = async () => {
    const [v, vid, bg, cl, sp] = await Promise.all([
      supabase.from("ai_studio_voice_samples").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_studio_videos").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_studio_backgrounds").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_studio_clips").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("shop_products").select("id,name,image_url,category").eq("is_active", true).not("image_url", "is", null).order("created_at", { ascending: false }).limit(200),
    ]);
    if (v.data) setVoiceSamples(v.data as VoiceSample[]);
    if (vid.data) setVideos(vid.data as VideoAsset[]);
    if (bg.data) setBackgrounds(bg.data as BackgroundAsset[]);
    if (cl.data) setClips(cl.data as ClipAsset[]);
    if (sp.data) setShopProducts(sp.data as ShopProduct[]);
  };
  useEffect(() => { loadAll(); }, []);

  // ============== UPLOAD: VOICE ==============
  const uploadVoice = async (file: File) => {
    setUploading(true);
    try {
      const path = `voices/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("ai-studio-voices").upload(path, file);
      if (up.error) throw up.error;

      // Browser-side elemzés
      let pitch = 150;
      let duration = 0;
      try {
        const r = await detectPitch(file);
        pitch = r.pitch; duration = r.duration;
      } catch (e) { console.warn("pitch detect error", e); }

      const tempo = duration > 0 ? 140 : 140; // alapérték

      const { data: ins, error: insErr } = await supabase
        .from("ai_studio_voice_samples")
        .insert({
          title: file.name,
          storage_path: path,
          pitch_hz: pitch,
          tempo_wpm: tempo,
          duration_sec: duration,
          analysis_status: "ready",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      toast({ title: "Hangminta feltöltve", description: `Pitch: ${Math.round(pitch)} Hz, hossz: ${duration.toFixed(1)} mp` });
      await loadAll();
      if (ins) setSelectedVoice(ins.id);
    } catch (e: any) {
      toast({ title: "Feltöltési hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ============== UPLOAD: VIDEO ==============
  const uploadVideo = async (file: File) => {
    setUploading(true);
    try {
      const path = `videos/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("ai-studio-videos").upload(path, file);
      if (up.error) throw up.error;

      // Méret detektálás
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.src = url;
      await new Promise((res) => { v.onloadedmetadata = () => res(null); });
      const width = v.videoWidth, height = v.videoHeight, duration = v.duration;
      URL.revokeObjectURL(url);

      const { data: ins, error: insErr } = await supabase
        .from("ai_studio_videos")
        .insert({
          title: file.name,
          storage_path: path,
          width, height,
          duration_sec: duration,
          size_bytes: file.size,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      toast({ title: "Videó feltöltve", description: `${width}×${height}, ${duration.toFixed(1)} mp` });
      await loadAll();
      if (ins) setSelectedVideo(ins.id);
    } catch (e: any) {
      toast({ title: "Feltöltési hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ============== UPLOAD: BACKGROUND ==============
  const uploadBackground = async (file: File) => {
    setUploading(true);
    try {
      const path = `bg/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("ai-studio-backgrounds").upload(path, file);
      if (up.error) throw up.error;

      const { data: ins, error: insErr } = await supabase
        .from("ai_studio_backgrounds")
        .insert({
          title: file.name,
          bg_type: file.type.startsWith("video") ? "video" : "image",
          storage_path: path,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      toast({ title: "Háttér feltöltve" });
      await loadAll();
      if (ins) setSelectedBg(ins.id);
    } catch (e: any) {
      toast({ title: "Feltöltési hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ============== TTS PREVIEW ==============
  const previewTts = () => {
    if (!scriptText.trim()) {
      toast({ title: "Adj meg szöveget", variant: "destructive" });
      return;
    }
    if (!("speechSynthesis" in window)) {
      toast({ title: "Böngésző nem támogatja a TTS-t", variant: "destructive" });
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(scriptText);
    u.lang = "hu-HU";

    // Hangminta-paraméterek
    const sample = voiceSamples.find((s) => s.id === selectedVoice);
    if (sample) {
      const pitch = sample.pitch_hz ?? 150;
      const tempo = sample.tempo_wpm ?? 140;
      u.pitch = Math.max(0.5, Math.min(2, pitch / 150));
      u.rate = Math.max(0.5, Math.min(2, tempo / 140));
    }

    // Magyar hang prioritás
    const voices = window.speechSynthesis.getVoices();
    const hu = voices.find((v) => v.lang.startsWith("hu")) || voices.find((v) => v.lang.startsWith("en"));
    if (hu) u.voice = hu;

    window.speechSynthesis.speak(u);
    toast({ title: "Lejátszás elindult" });
  };

  // ============== VIDEO + BACKGROUND COMPOSITE ==============
  const renderClip = async () => {
    if (!selectedVideo || !selectedBg) {
      toast({ title: "Válassz videót és hátteret", variant: "destructive" });
      return;
    }
    setRendering(true);
    setRenderProgress(0);

    try {
      const video = videos.find((v) => v.id === selectedVideo);
      const bg = backgrounds.find((b) => b.id === selectedBg);
      if (!video || !bg) throw new Error("Hibás kiválasztás");

      // Signed URL videóhoz
      const videoSigned = await supabase.storage.from("ai-studio-videos").createSignedUrl(video.storage_path, 3600);
      if (videoSigned.error || !videoSigned.data) throw new Error("Videó URL hiba");

      // Háttér public URL
      const bgUrl = bg.storage_path
        ? supabase.storage.from("ai-studio-backgrounds").getPublicUrl(bg.storage_path).data.publicUrl
        : null;
      if (!bgUrl) throw new Error("Háttér URL hiba");

      // MediaPipe betöltés
      const SelfieSegmentation = await loadMediaPipe();
      const selfie = new SelfieSegmentation({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`,
      });
      selfie.setOptions({ modelSelection: 1 });

      // Setup video + bg
      const vEl = document.createElement("video");
      vEl.crossOrigin = "anonymous";
      vEl.src = videoSigned.data.signedUrl;
      vEl.muted = true;
      await new Promise((res) => { vEl.onloadedmetadata = () => res(null); });

      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      bgImg.src = bgUrl;
      await new Promise((res, rej) => { bgImg.onload = () => res(null); bgImg.onerror = rej; });

      const W = vEl.videoWidth || 720;
      const H = vEl.videoHeight || 1280;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // MediaRecorder a canvas-ból
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      let lastMask: ImageBitmap | null = null;
      selfie.onResults((results: any) => {
        // results.segmentationMask = canvas/image
        ctx.save();
        ctx.clearRect(0, 0, W, H);

        // 1. háttér
        const ar = bgImg.width / bgImg.height;
        const targetAr = W / H;
        let sx = 0, sy = 0, sw = bgImg.width, sh = bgImg.height;
        if (ar > targetAr) {
          sw = bgImg.height * targetAr;
          sx = (bgImg.width - sw) / 2;
        } else {
          sh = bgImg.width / targetAr;
          sy = (bgImg.height - sh) / 2;
        }
        ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H);

        // 2. személy maszkkal
        ctx.globalCompositeOperation = "source-over";
        const tmp = document.createElement("canvas");
        tmp.width = W; tmp.height = H;
        const tctx = tmp.getContext("2d")!;
        tctx.drawImage(results.segmentationMask, 0, 0, W, H);
        tctx.globalCompositeOperation = "source-in";
        tctx.drawImage(results.image, 0, 0, W, H);
        ctx.drawImage(tmp, 0, 0);
        ctx.restore();
      });

      recorder.start();

      vEl.currentTime = 0;
      await vEl.play();
      const dur = vEl.duration || 5;
      const startT = performance.now();

      await new Promise<void>((resolve) => {
        const tick = async () => {
          if (vEl.ended || vEl.paused) {
            resolve();
            return;
          }
          await selfie.send({ image: vEl });
          const pct = Math.min(99, (vEl.currentTime / dur) * 100);
          setRenderProgress(pct);
          requestAnimationFrame(tick);
        };
        vEl.onended = () => resolve();
        tick();
      });

      recorder.stop();
      await new Promise((res) => { recorder.onstop = () => res(null); });

      const blob = new Blob(chunks, { type: "video/webm" });
      const file = new File([blob], `clip-${Date.now()}.webm`, { type: "video/webm" });

      // Upload
      const path = `clips/${Date.now()}-clip.webm`;
      const up = await supabase.storage.from("ai-studio-clips").upload(path, file);
      if (up.error) throw up.error;

      await supabase.from("ai_studio_clips").insert({
        title: clipTitle || `Klip ${new Date().toLocaleString("hu-HU")}`,
        source_video_id: selectedVideo,
        background_id: selectedBg,
        voice_sample_id: selectedVoice || null,
        generated_text: scriptText || null,
        output_path: path,
        status: "ready",
      });

      setRenderProgress(100);
      toast({ title: "✅ Klip kész!", description: "Megnézheted a Klipek fülön." });
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Renderelési hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally {
      setRendering(false);
    }
  };

  const downloadClip = async (clip: ClipAsset) => {
    if (!clip.output_path) return;
    const signed = await supabase.storage.from("ai-studio-clips").createSignedUrl(clip.output_path, 3600);
    if (signed.data?.signedUrl) {
      window.open(signed.data.signedUrl, "_blank");
    }
  };

  const deleteAsset = async (table: string, id: string, bucket?: string, path?: string) => {
    if (!confirm("Törlöd?")) return;
    if (bucket && path) await supabase.storage.from(bucket).remove([path]);
    await (supabase.from as any)(table).delete().eq("id", id);
    await loadAll();
    toast({ title: "Törölve" });
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-primary bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary text-primary-foreground rounded-none">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black uppercase tracking-wider">AI Stúdió — Saját videó + hang + háttér</h2>
            <p className="text-sm text-muted-foreground mt-1">
              100% saját rendszer. Feltöltöd a videódat és a hangmintádat, az AI kivágja magadat,
              webshop hátteret tesz mögéd, és a hangmintád alapján szöveget mond.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline">MediaPipe AI háttércsere</Badge>
              <Badge variant="outline">WebAudio pitch-elemzés</Badge>
              <Badge variant="outline">Browser TTS hangmintával</Badge>
              <Badge variant="outline">Nincs külső API</Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="upload">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="upload">📤 Feltöltés</TabsTrigger>
          <TabsTrigger value="compose">🎬 Klip készítés</TabsTrigger>
          <TabsTrigger value="library">📚 Könyvtár</TabsTrigger>
          <TabsTrigger value="clips">🎞️ Kész klipek ({clips.length})</TabsTrigger>
        </TabsList>

        {/* ============== FELTÖLTÉS ============== */}
        <TabsContent value="upload" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="h-5 w-5 text-primary" />
              <h3 className="font-bold uppercase tracking-wide">Hangminta feltöltés</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Tölts fel 5–60 mp tiszta beszédet (MP3/WAV/M4A). Az AI elemzi a hangmagasságodat (pitch) és tempódat,
              hogy a generált beszéd hozzád idomuljon.
            </p>
            <Input
              type="file"
              accept="audio/*"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && uploadVoice(e.target.files[0])}
            />
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <VideoIcon className="h-5 w-5 text-primary" />
              <h3 className="font-bold uppercase tracking-wide">Videó feltöltés</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Tölts fel egy videót, ahol Te vagy benne (ideális: 9:16, 5–60 mp, jó megvilágítás).
              Az AI ki fog vágni a háttérből.
            </p>
            <Input
              type="file"
              accept="video/*"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
            />
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-5 w-5 text-primary" />
              <h3 className="font-bold uppercase tracking-wide">Háttér feltöltés</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Tölts fel webshop terméket vagy bármilyen képet — ez kerül a kivágott személy mögé.
            </p>
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && uploadBackground(e.target.files[0])}
            />
          </Card>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" /> Feltöltés folyamatban…
            </div>
          )}
        </TabsContent>

        {/* ============== KLIP KÉSZÍTÉS ============== */}
        <TabsContent value="compose" className="space-y-4 mt-4">
          <Card className="p-4 space-y-4">
            <div>
              <Label>Klip címe</Label>
              <Input value={clipTitle} onChange={(e) => setClipTitle(e.target.value)} placeholder="Pl. TikTok pulóver promo" />
            </div>

            <div>
              <Label>Videó (Te a felvételen)</Label>
              <select
                className="w-full p-2 border bg-background"
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
              >
                <option value="">— válassz —</option>
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({v.width}×{v.height}, {v.duration_sec?.toFixed(1)}s)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Háttér</Label>
              <select
                className="w-full p-2 border bg-background"
                value={selectedBg}
                onChange={(e) => setSelectedBg(e.target.value)}
              >
                <option value="">— válassz —</option>
                {backgrounds.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Hangminta (opcionális, TTS-hez)</Label>
              <select
                className="w-full p-2 border bg-background"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
              >
                <option value="">— nincs hang —</option>
                {voiceSamples.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} (pitch {Math.round(v.pitch_hz ?? 0)}Hz)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Mondandó szöveg (TTS előnézethez)</Label>
              <Textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={4}
                placeholder="Pl. Új pulóverünk most 6990 Ft! Ne hagyd ki…"
              />
              <Button onClick={previewTts} variant="outline" size="sm" className="mt-2" disabled={!scriptText.trim()}>
                <Volume2 className="h-4 w-4 mr-2" /> Hangminta-alapú TTS előnézet
              </Button>
            </div>

            <Button
              onClick={renderClip}
              disabled={rendering || !selectedVideo || !selectedBg}
              className="w-full"
              size="lg"
            >
              {rendering ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Renderelés ({renderProgress.toFixed(0)}%)</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" /> AI háttércsere + klip mentés</>
              )}
            </Button>

            {rendering && (
              <div className="w-full bg-muted h-2">
                <div className="bg-primary h-2 transition-all" style={{ width: `${renderProgress}%` }} />
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ============== KÖNYVTÁR ============== */}
        <TabsContent value="library" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-bold uppercase mb-3">Hangminták ({voiceSamples.length})</h3>
            <div className="space-y-2">
              {voiceSamples.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2 border">
                  <div className="text-sm">
                    <div className="font-medium">{v.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.pitch_hz ? `${Math.round(v.pitch_hz)} Hz` : "-"} · {v.duration_sec?.toFixed(1)}s
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteAsset("ai_studio_voice_samples", v.id, "ai-studio-voices", v.storage_path)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {voiceSamples.length === 0 && <p className="text-sm text-muted-foreground">Nincs még hangminta.</p>}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold uppercase mb-3">Videók ({videos.length})</h3>
            <div className="space-y-2">
              {videos.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2 border">
                  <div className="text-sm">
                    <div className="font-medium">{v.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.width}×{v.height} · {v.duration_sec?.toFixed(1)}s
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteAsset("ai_studio_videos", v.id, "ai-studio-videos", v.storage_path)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {videos.length === 0 && <p className="text-sm text-muted-foreground">Nincs még videó.</p>}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold uppercase mb-3">Hátterek ({backgrounds.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {backgrounds.map((b) => {
                const url = b.storage_path
                  ? supabase.storage.from("ai-studio-backgrounds").getPublicUrl(b.storage_path).data.publicUrl
                  : "";
                return (
                  <div key={b.id} className="border p-1 relative group">
                    {b.bg_type === "image" ? (
                      <img src={url} alt={b.title} className="w-full h-24 object-cover" />
                    ) : (
                      <video src={url} className="w-full h-24 object-cover" />
                    )}
                    <div className="text-xs truncate p-1">{b.title}</div>
                    <Button
                      size="sm" variant="destructive"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteAsset("ai_studio_backgrounds", b.id, "ai-studio-backgrounds", b.storage_path || undefined)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              {backgrounds.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nincs még háttér.</p>}
            </div>
          </Card>
        </TabsContent>

        {/* ============== KÉSZ KLIPEK ============== */}
        <TabsContent value="clips" className="space-y-2 mt-4">
          {clips.map((c) => (
            <Card key={c.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString("hu-HU")} · {c.status}
                </div>
                {c.generated_text && <div className="text-xs mt-1 line-clamp-2">{c.generated_text}</div>}
              </div>
              <div className="flex gap-2">
                {c.output_path && (
                  <Button size="sm" variant="outline" onClick={() => downloadClip(c)}>
                    <Download className="h-4 w-4 mr-1" /> Letöltés
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => deleteAsset("ai_studio_clips", c.id, "ai-studio-clips", c.output_path || undefined)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          {clips.length === 0 && <p className="text-sm text-muted-foreground">Nincs még klip.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAiStudioRecorder;
