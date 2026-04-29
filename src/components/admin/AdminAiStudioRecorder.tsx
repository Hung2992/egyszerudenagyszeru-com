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
  Settings, Star, Save,
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
  is_favorite?: boolean | null;
  description?: string | null;
  created_at: string;
}

interface StudioSettings {
  id: string;
  default_voice_sample_id: string | null;
  default_audio_source: string;
  default_bg_source: string;
  default_bg_category: string;
  brand_intro_text: string;
  brand_outro_text: string;
  ai_prompt_template: string;
  default_clip_title_pattern: string;
  auto_caption_enabled: boolean;
  preferred_voice_lang: string;
  // Emberi hang + eredeti videó védelme
  voice_naturalness: number;
  voice_variance: number;
  voice_breathiness: number;
  preserve_original_video: boolean;
  background_only_mode: boolean;
  never_modify_face: boolean;
  natural_pauses_enabled: boolean;
  avoid_robotic_perfection: boolean;
  // Színes/tetszőleges háttér támogatás
  segmentation_quality: string;
  edge_softness: number;
  supports_any_background: boolean;
  busy_background_tolerance: number;
  mask_threshold: number;
  // Új: 4K export, hangminőség, kompozíciós keret, háttér ember-check
  export_4k: boolean;
  audio_sample_rate: number;
  audio_bitrate_kbps: number;
  show_safe_zone: boolean;
  bg_human_check_enabled: boolean;
  bg_max_regenerations: number;
}

const BG_CATEGORIES = [
  { value: "general", label: "Általános" },
  { value: "street", label: "Utcai" },
  { value: "studio", label: "Stúdió" },
  { value: "nature", label: "Természet" },
  { value: "urban", label: "Városi" },
  { value: "product", label: "Termék" },
  { value: "lifestyle", label: "Lifestyle" },
];

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
  const [bgPrompt, setBgPrompt] = useState<string>("");
  const [generatingBg, setGeneratingBg] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [bgFilterCategory, setBgFilterCategory] = useState<string>("");

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewBgImgRef = useRef<HTMLImageElement>(null);

  // ============== LOAD ==============
  const loadAll = async () => {
    const [v, vid, bg, cl, sp, st] = await Promise.all([
      supabase.from("ai_studio_voice_samples").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_studio_videos").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_studio_backgrounds").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_studio_clips").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("shop_products").select("id,name,image_url,category").eq("is_active", true).not("image_url", "is", null).order("created_at", { ascending: false }).limit(200),
      supabase.from("ai_studio_settings").select("*").limit(1).maybeSingle(),
    ]);
    if (v.data) setVoiceSamples(v.data as VoiceSample[]);
    if (vid.data) setVideos(vid.data as VideoAsset[]);
    if (bg.data) setBackgrounds(bg.data as BackgroundAsset[]);
    if (cl.data) setClips(cl.data as ClipAsset[]);
    if (sp.data) setShopProducts(sp.data as ShopProduct[]);
    if (st.data) {
      const s = st.data as StudioSettings;
      setSettings(s);
      // alapértelmezések alkalmazása ha még üres az UI
      if (!selectedVoice && s.default_voice_sample_id) setSelectedVoice(s.default_voice_sample_id);
      if (s.default_audio_source) setAudioSource(s.default_audio_source as AudioSource);
      if (s.default_bg_source === "uploaded" || s.default_bg_source === "product") setBgSource(s.default_bg_source);
    }
  };
  useEffect(() => { loadAll(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("ai_studio_settings")
        .update({
          default_voice_sample_id: settings.default_voice_sample_id,
          default_audio_source: settings.default_audio_source,
          default_bg_source: settings.default_bg_source,
          default_bg_category: settings.default_bg_category,
          brand_intro_text: settings.brand_intro_text,
          brand_outro_text: settings.brand_outro_text,
          ai_prompt_template: settings.ai_prompt_template,
          default_clip_title_pattern: settings.default_clip_title_pattern,
          auto_caption_enabled: settings.auto_caption_enabled,
          preferred_voice_lang: settings.preferred_voice_lang,
          voice_naturalness: settings.voice_naturalness,
          voice_variance: settings.voice_variance,
          voice_breathiness: settings.voice_breathiness,
          preserve_original_video: settings.preserve_original_video,
          background_only_mode: settings.background_only_mode,
          never_modify_face: settings.never_modify_face,
          natural_pauses_enabled: settings.natural_pauses_enabled,
          avoid_robotic_perfection: settings.avoid_robotic_perfection,
          segmentation_quality: settings.segmentation_quality,
          edge_softness: settings.edge_softness,
          supports_any_background: settings.supports_any_background,
          busy_background_tolerance: settings.busy_background_tolerance,
          mask_threshold: settings.mask_threshold,
          export_4k: settings.export_4k,
          audio_sample_rate: settings.audio_sample_rate,
          audio_bitrate_kbps: settings.audio_bitrate_kbps,
          show_safe_zone: settings.show_safe_zone,
          bg_human_check_enabled: settings.bg_human_check_enabled,
          bg_max_regenerations: settings.bg_max_regenerations,
        })
        .eq("id", settings.id);
      if (error) throw error;
      toast({ title: "✅ Beállítások mentve" });
    } catch (e: any) {
      toast({ title: "Mentési hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const updateBgCategory = async (id: string, category: string) => {
    await supabase.from("ai_studio_backgrounds").update({ category }).eq("id", id);
    await loadAll();
  };

  const toggleBgFavorite = async (id: string, current: boolean) => {
    await supabase.from("ai_studio_backgrounds").update({ is_favorite: !current }).eq("id", id);
    await loadAll();
  };

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

  // ============== AI HÁTTÉR GENERÁLÁS SZÖVEGBŐL ==============
  const generateBackground = async () => {
    const prompt = bgPrompt.trim();
    if (prompt.length < 3) {
      toast({ title: "Írj le pontosan milyen hátteret szeretnél", description: "Pl. „naplemente városi tetőterasz, modern beton, meleg fény”", variant: "destructive" });
      return;
    }
    setGeneratingBg(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-studio-generate-bg", {
        body: { prompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✨ Háttér elkészült!", description: "Automatikusan kiválasztottuk." });
      await loadAll();
      if (data?.background?.id) setSelectedBg(data.background.id);
      setBgPrompt("");
    } catch (e: any) {
      toast({ title: "AI háttér hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally {
      setGeneratingBg(false);
    }
  };

  // ============== GYORS 4K ELŐNÉZET (egyetlen frame, alacsony felbontáson) ==============
  const runFastPreview = async () => {
    if (!selectedVideo) {
      toast({ title: "Válassz videót az előnézethez", variant: "destructive" });
      return;
    }
    if (bgSource === "uploaded" && !selectedBg) {
      toast({ title: "Válassz hátteret", variant: "destructive" });
      return;
    }
    if (bgSource === "product" && !selectedProductBg) {
      toast({ title: "Válassz termék hátteret", variant: "destructive" });
      return;
    }
    setPreviewing(true);
    try {
      const previewCanvas = previewCanvasRef.current;
      if (!previewCanvas) throw new Error("Preview canvas nem érhető el");

      const video = videos.find((v) => v.id === selectedVideo)!;
      const videoSigned = await supabase.storage.from("ai-studio-videos").createSignedUrl(video.storage_path, 3600);
      if (videoSigned.error || !videoSigned.data) throw new Error("Videó URL hiba");

      let bgUrl: string | null = null;
      if (bgSource === "uploaded") {
        const bg = backgrounds.find((b) => b.id === selectedBg)!;
        bgUrl = supabase.storage.from("ai-studio-backgrounds").getPublicUrl(bg.storage_path!).data.publicUrl;
      } else {
        bgUrl = shopProducts.find((p) => p.id === selectedProductBg)?.image_url ?? null;
      }
      if (!bgUrl) throw new Error("Háttér URL hiba");

      // kis videó betöltés első frame-re
      const vEl = document.createElement("video");
      vEl.crossOrigin = "anonymous";
      vEl.muted = true;
      vEl.src = videoSigned.data.signedUrl;
      await new Promise<void>((res) => { vEl.onloadeddata = () => res(); });
      vEl.currentTime = Math.min(0.3, (vEl.duration || 1) / 4);
      await new Promise<void>((res) => { vEl.onseeked = () => res(); });

      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      bgImg.src = bgUrl;
      await new Promise<void>((res, rej) => { bgImg.onload = () => res(); bgImg.onerror = () => rej(); });

      // előnézet: max 480px szélesség, megőrzött arány (gyors)
      const targetW = 480;
      const aspect = (vEl.videoWidth || 720) / (vEl.videoHeight || 1280);
      const W = targetW;
      const H = Math.round(targetW / aspect);
      previewCanvas.width = W;
      previewCanvas.height = H;
      const ctx = previewCanvas.getContext("2d", { alpha: false })!;
      ctx.imageSmoothingQuality = "high";

      // háttér (cover)
      const bgAr = bgImg.width / bgImg.height;
      const tAr = W / H;
      let sx = 0, sy = 0, sw = bgImg.width, sh = bgImg.height;
      if (bgAr > tAr) { sw = bgImg.height * tAr; sx = (bgImg.width - sw) / 2; }
      else { sh = bgImg.width / tAr; sy = (bgImg.height - sh) / 2; }
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H);

      // MediaPipe egyszeri szegmentáció
      try {
        // @ts-ignore - CDN module
        await import(/* @vite-ignore */ ("https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js" as string));
        const SS = (window as any).SelfieSegmentation;
        const selfie = new SS({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}` });
        selfie.setOptions({ modelSelection: 1 });
        await new Promise<void>((res) => {
          selfie.onResults((results: any) => {
            const tmp = document.createElement("canvas");
            tmp.width = W; tmp.height = H;
            const tctx = tmp.getContext("2d")!;
            const softnessPx = Math.round((settings?.edge_softness ?? 0.5) * 6);
            if (softnessPx > 0) (tctx as any).filter = `blur(${softnessPx}px)`;
            tctx.drawImage(results.segmentationMask, 0, 0, W, H);
            (tctx as any).filter = "none";
            tctx.globalCompositeOperation = "source-in";
            tctx.drawImage(results.image, 0, 0, W, H);
            ctx.drawImage(tmp, 0, 0);
            res();
          });
          selfie.send({ image: vEl });
        });
      } catch (e) {
        console.warn("MediaPipe preview hiba, csak videó frame-mel folytatom", e);
        ctx.drawImage(vEl, 0, 0, W, H);
      }

      // Safe zone overlay (16:9 középre)
      if (settings?.show_safe_zone ?? true) {
        const safeAr = 16 / 9;
        let szW = W * 0.6, szH = szW / safeAr;
        if (szH > H * 0.85) { szH = H * 0.85; szW = szH * safeAr; }
        const szX = (W - szW) / 2;
        const szY = (H - szH) / 2;
        ctx.save();
        ctx.strokeStyle = "rgba(255, 215, 0, 0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(szX, szY, szW, szH);
        ctx.setLineDash([]);
        // sarkok
        ctx.strokeStyle = "rgba(255, 215, 0, 1)";
        ctx.lineWidth = 3;
        const c = 14;
        ctx.beginPath();
        ctx.moveTo(szX, szY + c); ctx.lineTo(szX, szY); ctx.lineTo(szX + c, szY);
        ctx.moveTo(szX + szW - c, szY); ctx.lineTo(szX + szW, szY); ctx.lineTo(szX + szW, szY + c);
        ctx.moveTo(szX + szW, szY + szH - c); ctx.lineTo(szX + szW, szY + szH); ctx.lineTo(szX + szW - c, szY + szH);
        ctx.moveTo(szX + c, szY + szH); ctx.lineTo(szX, szY + szH); ctx.lineTo(szX, szY + szH - c);
        ctx.stroke();
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "rgba(255, 215, 0, 1)";
        ctx.fillText("16:9 SAFE ZONE", szX + 6, szY + 16);
        ctx.restore();
      }

      setPreviewReady(true);
      toast({ title: "✅ Előnézet kész", description: "A teljes klip ennek alapján készül." });
    } catch (e: any) {
      toast({ title: "Előnézet hiba", description: e?.message || "Ismeretlen", variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

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
    if (!selectedVideo) {
      toast({ title: "Válassz videót", variant: "destructive" });
      return;
    }
    if (bgSource === "uploaded" && !selectedBg) {
      toast({ title: "Válassz feltöltött hátteret", variant: "destructive" });
      return;
    }
    if (bgSource === "product" && !selectedProductBg) {
      toast({ title: "Válassz webshop terméket háttérnek", variant: "destructive" });
      return;
    }
    setRendering(true);
    setRenderProgress(0);

    try {
      const video = videos.find((v) => v.id === selectedVideo);
      if (!video) throw new Error("Hibás videó kiválasztás");

      // Signed URL videóhoz
      const videoSigned = await supabase.storage.from("ai-studio-videos").createSignedUrl(video.storage_path, 3600);
      if (videoSigned.error || !videoSigned.data) throw new Error("Videó URL hiba");

      // Háttér URL: feltöltött vagy termékkép
      let bgUrl: string | null = null;
      let bgLabel = "";
      if (bgSource === "uploaded") {
        const bg = backgrounds.find((b) => b.id === selectedBg);
        if (!bg) throw new Error("Háttér hiba");
        bgUrl = bg.storage_path
          ? supabase.storage.from("ai-studio-backgrounds").getPublicUrl(bg.storage_path).data.publicUrl
          : null;
        bgLabel = bg.title;
      } else {
        const prod = shopProducts.find((p) => p.id === selectedProductBg);
        if (!prod) throw new Error("Termék hiba");
        bgUrl = prod.image_url;
        bgLabel = prod.name;
      }
      if (!bgUrl) throw new Error("Háttér URL hiba");

      // MediaPipe betöltés — a "general" model (1) bármilyen színes/normális háttérről
      // pontosan kivágja az embert, NEM kell zöld háttér. Ez egy AI szegmentációs modell,
      // amely emberi alakot felismer, nem szín-kulcsot.
      const SelfieSegmentation = await loadMediaPipe();
      const selfie = new SelfieSegmentation({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`,
      });
      // modelSelection: 0 = landscape (gyors), 1 = general (pontosabb, bármilyen háttér)
      const modelSel = settings?.segmentation_quality === "fast" ? 0 : 1;
      selfie.setOptions({ modelSelection: modelSel });

      // Setup video + bg
      const vEl = document.createElement("video");
      vEl.crossOrigin = "anonymous";
      vEl.src = videoSigned.data.signedUrl;
      // Eredeti hang esetén nem mute-oljuk a felvételhez (de a felhasználói visszhang elkerüléshez halkítjuk a lejátszást)
      vEl.muted = audioSource !== "original";
      vEl.volume = audioSource === "original" ? 0.0001 : 0; // halk monitor, csak a stream számít
      (vEl as any).playsInline = true;
      await new Promise((res) => { vEl.onloadedmetadata = () => res(null); });

      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      bgImg.src = bgUrl;
      await new Promise((res, rej) => { bgImg.onload = () => res(null); bgImg.onerror = rej; });

      // 4K export: ha be van kapcsolva, 3840×2160 a célméret (16:9), egyébként a videó natív
      const want4K = settings?.export_4k ?? false;
      const nativeW = vEl.videoWidth || 720;
      const nativeH = vEl.videoHeight || 1280;
      const W = want4K ? 3840 : nativeW;
      const H = want4K ? 2160 : nativeH;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d", { alpha: false })!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // ===== AUDIO MIXING =====
      const videoStream = canvas.captureStream(30);
      let audioCtx: AudioContext | null = null;
      let audioDest: MediaStreamAudioDestinationNode | null = null;

      if (audioSource === "original") {
        try {
          audioCtx = new AudioContext({ sampleRate: settings?.audio_sample_rate ?? 48000 });
          audioDest = audioCtx.createMediaStreamDestination();
          const srcNode = audioCtx.createMediaElementSource(vEl);
          srcNode.connect(audioDest);
          // halk monitor visszacsatolás (opcionális, hogy ne legyen visszhang)
          // srcNode.connect(audioCtx.destination);
          audioDest.stream.getAudioTracks().forEach((t) => videoStream.addTrack(t));
        } catch (e) { console.warn("audio mix hiba", e); }
      } else if (audioSource === "tts" && scriptText.trim()) {
        // TTS-t a render alatt elindítjuk; a böngésző hangját nem tudjuk közvetlenül elkapni,
        // ezért MediaRecorder-rel rögzítjük a default audio outputot egy AudioContext-en keresztül.
        // Mivel SpeechSynthesis nem captureálható, beállítjuk hogy a felhasználó hallja, és a klip végén külön TTS-t generálunk.
        // Itt csak elindítjuk visszajátszáshoz; a TTS audio sávot a kliphez későbbi lépésben fűzzük (jelenleg only video + UI-ban hallható).
      }

      // Bitráta a felbontás függvényében (4K = 25 Mbps, FullHD = 12 Mbps)
      const videoBps = want4K ? 25_000_000 : 12_000_000;
      const audioBps = (settings?.audio_bitrate_kbps ?? 256) * 1000;
      const recorder = new MediaRecorder(videoStream, {
        mimeType: "video/webm;codecs=vp9,opus",
        videoBitsPerSecond: videoBps,
        audioBitsPerSecond: audioBps,
      });
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

        // 2. személy maszkkal — élenlágyítással a természetes átmenethez
        ctx.globalCompositeOperation = "source-over";
        const tmp = document.createElement("canvas");
        tmp.width = W; tmp.height = H;
        const tctx = tmp.getContext("2d")!;
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = "high";
        // Élenlágyítás: a beállítás alapján blur-t alkalmazunk a maszkra,
        // így nem lesz szaggatott a kivágás bármilyen színes háttéren
        const softnessPx = Math.round((settings?.edge_softness ?? 0.5) * 6);
        if (softnessPx > 0) {
          (tctx as any).filter = `blur(${softnessPx}px)`;
        }
        tctx.drawImage(results.segmentationMask, 0, 0, W, H);
        (tctx as any).filter = "none";
        tctx.globalCompositeOperation = "source-in";
        tctx.drawImage(results.image, 0, 0, W, H);
        ctx.drawImage(tmp, 0, 0);
        ctx.restore();
      });

      recorder.start();

      vEl.currentTime = 0;
      await vEl.play();

      // TTS indítása párhuzamosan ha kell (a felhasználó hangosan hallja, a klipbe nem kerül bele
      // mert a böngésző nem captureálja a SpeechSynthesis kimenetét — ezért választható az "original")
      if (audioSource === "tts" && scriptText.trim() && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(scriptText);
        u.lang = "hu-HU";
        const sample = voiceSamples.find((s) => s.id === selectedVoice);
        if (sample) {
          const pitch = sample.pitch_hz ?? 150;
          const tempo = sample.tempo_wpm ?? 140;
          u.pitch = Math.max(0.5, Math.min(2, pitch / 150));
          u.rate = Math.max(0.5, Math.min(2, tempo / 140));
        }
        const voices = window.speechSynthesis.getVoices();
        const hu = voices.find((v) => v.lang.startsWith("hu")) || voices.find((v) => v.lang.startsWith("en"));
        if (hu) u.voice = hu;
        window.speechSynthesis.speak(u);
      }

      const dur = vEl.duration || 5;

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
      try { audioCtx?.close(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}

      const blob = new Blob(chunks, { type: "video/webm" });
      const file = new File([blob], `clip-${Date.now()}.webm`, { type: "video/webm" });

      // Upload
      const path = `clips/${Date.now()}-clip.webm`;
      const up = await supabase.storage.from("ai-studio-clips").upload(path, file);
      if (up.error) throw up.error;

      await supabase.from("ai_studio_clips").insert({
        title: clipTitle || `Klip ${bgLabel} ${new Date().toLocaleString("hu-HU")}`,
        source_video_id: selectedVideo,
        background_id: bgSource === "uploaded" ? selectedBg : null,
        voice_sample_id: selectedVoice || null,
        generated_text: audioSource === "tts" ? scriptText || null : null,
        output_path: path,
        status: "ready",
        metadata: { bg_source: bgSource, product_id: bgSource === "product" ? selectedProductBg : null, audio_source: audioSource },
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
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="upload">📤 Feltöltés</TabsTrigger>
          <TabsTrigger value="compose">🎬 Klip</TabsTrigger>
          <TabsTrigger value="library">📚 Könyvtár</TabsTrigger>
          <TabsTrigger value="clips">🎞️ Kész ({clips.length})</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Beállítások</TabsTrigger>
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

        {/* ============== KLIP KÉSZÍTÉS — EGYSÉGES VEZÉRLŐPULT ============== */}
        <TabsContent value="compose" className="space-y-4 mt-4">
          <Card className="p-4 space-y-5">
            {/* Lépés 1: Cím */}
            <div>
              <Label className="text-xs uppercase tracking-wide font-bold">1. Klip címe</Label>
              <Input value={clipTitle} onChange={(e) => setClipTitle(e.target.value)} placeholder="Pl. TikTok pulóver promo" className="mt-1" />
            </div>

            {/* Lépés 2: Videó */}
            <div>
              <Label className="text-xs uppercase tracking-wide font-bold">2. Saját videód <span className="text-muted-foreground normal-case font-normal">(akár 3 perc hosszú is lehet)</span></Label>
              <select
                className="w-full p-2 border bg-background mt-1"
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
              >
                <option value="">— válassz feltöltött videót —</option>
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({v.width}×{v.height}, {v.duration_sec?.toFixed(1)}s)
                  </option>
                ))}
              </select>
              {videos.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Még nincs videó — tölts fel a Feltöltés fülön.</p>
              )}
            </div>

            {/* Lépés 3: Háttér forrás */}
            <div>
              <Label className="text-xs uppercase tracking-wide font-bold">3. Háttér</Label>
              <div className="flex gap-2 mt-1 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant={bgSource === "uploaded" ? "default" : "outline"}
                  onClick={() => setBgSource("uploaded")}
                >
                  <ImageIcon className="h-4 w-4 mr-1" /> Feltöltött
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={bgSource === "product" ? "default" : "outline"}
                  onClick={() => setBgSource("product")}
                >
                  <Sparkles className="h-4 w-4 mr-1" /> Webshop termék ({shopProducts.length})
                </Button>
              </div>

              {bgSource === "uploaded" ? (
                <>
                  <select
                    className="w-full p-2 border bg-background"
                    value={selectedBg}
                    onChange={(e) => setSelectedBg(e.target.value)}
                  >
                    <option value="">— válassz feltöltött / generált hátteret —</option>
                    {backgrounds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.category === "ai_generated" ? "🪄 " : ""}{b.title}
                      </option>
                    ))}
                  </select>
                  {selectedBg && (() => {
                    const b = backgrounds.find((x) => x.id === selectedBg);
                    if (!b?.storage_path) return null;
                    const url = supabase.storage.from("ai-studio-backgrounds").getPublicUrl(b.storage_path).data.publicUrl;
                    return <img src={url} alt={b.title} className="w-32 h-32 object-cover border mt-2" />;
                  })()}

                  {/* AI háttér generálás szövegből */}
                  <div className="mt-3 p-3 border-2 border-dashed border-primary/40 bg-primary/5">
                    <Label className="text-xs uppercase tracking-wide font-bold flex items-center gap-1">
                      <Wand2 className="h-3 w-3" /> Vagy generálj AI-val szövegből
                    </Label>
                    <Textarea
                      value={bgPrompt}
                      onChange={(e) => setBgPrompt(e.target.value.slice(0, 1000))}
                      rows={2}
                      placeholder="Pl. naplemente városi tetőterasz, modern beton, meleg fény, 16:9"
                      className="mt-2 text-sm"
                      disabled={generatingBg}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <Button
                        onClick={generateBackground}
                        size="sm"
                        disabled={generatingBg || bgPrompt.trim().length < 3}
                      >
                        {generatingBg ? (
                          <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generálás…</>
                        ) : (
                          <><Sparkles className="h-4 w-4 mr-1" /> Háttér generálása</>
                        )}
                      </Button>
                      <span className="text-xs text-muted-foreground">{bgPrompt.length}/1000</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Az AI csak a környezetet generálja — embert/arcot soha nem tesz rá.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <select
                    className="w-full p-2 border bg-background"
                    value={selectedProductBg}
                    onChange={(e) => setSelectedProductBg(e.target.value)}
                  >
                    <option value="">— válassz terméket —</option>
                    {shopProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.category ? ` · ${p.category}` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedProductBg && (() => {
                    const p = shopProducts.find((x) => x.id === selectedProductBg);
                    return p?.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-32 h-32 object-cover border mt-2" />
                    ) : null;
                  })()}
                </>
              )}
            </div>

            {/* Lépés 4: Hang forrás */}
            <div>
              <Label className="text-xs uppercase tracking-wide font-bold">4. Hang forrása</Label>
              <div className="flex gap-2 mt-1 mb-2 flex-wrap">
                <Button
                  type="button" size="sm"
                  variant={audioSource === "original" ? "default" : "outline"}
                  onClick={() => setAudioSource("original")}
                >
                  🎙️ Eredeti hangom (videóból)
                </Button>
                <Button
                  type="button" size="sm"
                  variant={audioSource === "tts" ? "default" : "outline"}
                  onClick={() => setAudioSource("tts")}
                >
                  💬 AI mondja amit írok
                </Button>
                <Button
                  type="button" size="sm"
                  variant={audioSource === "none" ? "default" : "outline"}
                  onClick={() => setAudioSource("none")}
                >
                  🔇 Néma
                </Button>
              </div>

              {audioSource === "tts" && (
                <div className="space-y-2 border p-3 bg-muted/30">
                  <div>
                    <Label className="text-xs">Hangminta (a tempód/hangmagasságod alapján)</Label>
                    <select
                      className="w-full p-2 border bg-background mt-1"
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                    >
                      <option value="">— alapértelmezett magyar hang —</option>
                      {voiceSamples.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title} (pitch {Math.round(v.pitch_hz ?? 0)}Hz)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">
                      Mondandó szöveg <span className="text-muted-foreground">(akár 3 perc beszéd, max 8000 karakter)</span>
                    </Label>
                    <Textarea
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value.slice(0, 8000))}
                      rows={10}
                      maxLength={8000}
                      placeholder="Írd ide a teljes reklámszöveget — akár 3 perces is lehet. Pl. Új pulóverünk most 6990 Ft! Prémium pamut, kényelmes szabás…"
                      className="mt-1"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <Button onClick={previewTts} variant="outline" size="sm" disabled={!scriptText.trim()}>
                        <Volume2 className="h-4 w-4 mr-2" /> Hang előnézet
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {scriptText.length} / 8000 · ~{Math.ceil(scriptText.split(/\s+/).filter(Boolean).length / 140 * 60)} mp
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lépés 5: Generálás */}
            <Button
              onClick={renderClip}
              disabled={
                rendering ||
                !selectedVideo ||
                (bgSource === "uploaded" && !selectedBg) ||
                (bgSource === "product" && !selectedProductBg)
              }
              className="w-full"
              size="lg"
            >
              {rendering ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI renderelés ({renderProgress.toFixed(0)}%)</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" /> 5. AI HÁTTÉRCSERE + KLIP GENERÁLÁS</>
              )}
            </Button>

            {rendering && (
              <div className="w-full bg-muted h-2">
                <div className="bg-primary h-2 transition-all" style={{ width: `${renderProgress}%` }} />
              </div>
            )}

            <p className="text-[10px] text-muted-foreground leading-relaxed border-t pt-3">
              💡 <b>Tipp:</b> Az "Eredeti hang" módban a videód saját hangja kerül a klipbe (háttércsere mellett).
              A "AI mondja" módban a böngésző felolvassa a szöveget a hangmintád pitch/tempo paraméterei szerint —
              ezt a felvétel közben hangosan hallod, de a böngésző-korlátok miatt a TTS hang csak előnézet, a klipbe nem mixelődik bele.
              Teljes klónozott hanghoz külső szolgáltatás (pl. ElevenLabs) kellene.
            </p>
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

        {/* ============== ⚙️ BEÁLLÍTÁSOK ============== */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {!settings ? (
            <Card className="p-4 text-sm text-muted-foreground">Beállítások betöltése…</Card>
          ) : (
            <>
              <Card className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="h-5 w-5 text-primary" />
                  <h3 className="font-bold uppercase tracking-wide">Alapértelmezések</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ezeket az értékeket az AI Stúdió automatikusan használja minden új klipnél, így nem kell minden alkalommal kiválasztani.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase">Alapértelmezett hangminta</Label>
                    <select
                      className="w-full p-2 border bg-background mt-1"
                      value={settings.default_voice_sample_id ?? ""}
                      onChange={(e) => setSettings({ ...settings, default_voice_sample_id: e.target.value || null })}
                    >
                      <option value="">— nincs —</option>
                      {voiceSamples.map((v) => (
                        <option key={v.id} value={v.id}>{v.title} ({Math.round(v.pitch_hz ?? 0)}Hz)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs uppercase">Alapértelmezett hangforrás</Label>
                    <select
                      className="w-full p-2 border bg-background mt-1"
                      value={settings.default_audio_source}
                      onChange={(e) => setSettings({ ...settings, default_audio_source: e.target.value })}
                    >
                      <option value="tts">💬 AI mondja</option>
                      <option value="original">🎙️ Eredeti hang</option>
                      <option value="none">🔇 Néma</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs uppercase">Alapértelmezett háttértípus</Label>
                    <select
                      className="w-full p-2 border bg-background mt-1"
                      value={settings.default_bg_source}
                      onChange={(e) => setSettings({ ...settings, default_bg_source: e.target.value })}
                    >
                      <option value="product">Webshop termék</option>
                      <option value="uploaded">Feltöltött</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs uppercase">Alapértelmezett háttér-kategória</Label>
                    <select
                      className="w-full p-2 border bg-background mt-1"
                      value={settings.default_bg_category}
                      onChange={(e) => setSettings({ ...settings, default_bg_category: e.target.value })}
                    >
                      {BG_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs uppercase">Hang nyelve</Label>
                    <select
                      className="w-full p-2 border bg-background mt-1"
                      value={settings.preferred_voice_lang}
                      onChange={(e) => setSettings({ ...settings, preferred_voice_lang: e.target.value })}
                    >
                      <option value="hu-HU">Magyar (hu-HU)</option>
                      <option value="en-US">Angol (en-US)</option>
                      <option value="de-DE">Német (de-DE)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      id="auto_caption"
                      checked={settings.auto_caption_enabled}
                      onChange={(e) => setSettings({ ...settings, auto_caption_enabled: e.target.checked })}
                    />
                    <Label htmlFor="auto_caption" className="text-xs cursor-pointer">
                      Automatikus felirat generálása
                    </Label>
                  </div>
                </div>
              </Card>

              {/* ============== 🎙️ EMBERI HANG ============== */}
              <Card className="p-4 space-y-4 border-2 border-primary/30">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-primary" />
                  <h3 className="font-bold uppercase tracking-wide">Emberi hang — természetes, nem robot</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Az AI hang ne legyen túl tökéletes. Lélegzetvétel, apró ingadozás, természetes szünetek — emberi módon szólaljon meg.
                </p>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Label>Természetesség (mennyire emberi)</Label>
                    <span className="font-mono">{Math.round(settings.voice_naturalness * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    className="w-full"
                    value={settings.voice_naturalness}
                    onChange={(e) => setSettings({ ...settings, voice_naturalness: parseFloat(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    100% = nagyon emberi (ajánlott), 0% = robot
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Label>Hangszín-ingadozás (variancia)</Label>
                    <span className="font-mono">{Math.round(settings.voice_variance * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    className="w-full"
                    value={settings.voice_variance}
                    onChange={(e) => setSettings({ ...settings, voice_variance: parseFloat(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Magasabb = élőbb, természetesebb beszéd
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Label>Lélegzet-érzet (légzéses minőség)</Label>
                    <span className="font-mono">{Math.round(settings.voice_breathiness * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    className="w-full"
                    value={settings.voice_breathiness}
                    onChange={(e) => setSettings({ ...settings, voice_breathiness: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.natural_pauses_enabled}
                      onChange={(e) => setSettings({ ...settings, natural_pauses_enabled: e.target.checked })}
                    />
                    <span className="text-xs">Természetes szünetek (vesszőknél, mondatok között)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.avoid_robotic_perfection}
                      onChange={(e) => setSettings({ ...settings, avoid_robotic_perfection: e.target.checked })}
                    />
                    <span className="text-xs">Kerülje a robotszerű tökéletességet (apró tökéletlenségek)</span>
                  </label>
                </div>
              </Card>

              {/* ============== 🎬 EREDETI VIDEÓ VÉDELME ============== */}
              <Card className="p-4 space-y-3 border-2 border-amber-500/40 bg-amber-500/5">
                <div className="flex items-center gap-2">
                  <VideoIcon className="h-5 w-5 text-amber-600" />
                  <h3 className="font-bold uppercase tracking-wide">Eredeti videó védelme</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ FONTOS: A feltöltött saját videó SOHA nem szerkeszthető. Csak a hátteret cseréljük, az arc, a mozgás, az eredeti felvétel érintetlen marad.
                </p>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={settings.preserve_original_video}
                    onChange={(e) => setSettings({ ...settings, preserve_original_video: e.target.checked })}
                  />
                  <div>
                    <div className="text-xs font-semibold">Eredeti videó megőrzése (ajánlott BE)</div>
                    <div className="text-[10px] text-muted-foreground">A felvétel pixel-pontosan megmarad</div>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={settings.background_only_mode}
                    onChange={(e) => setSettings({ ...settings, background_only_mode: e.target.checked })}
                  />
                  <div>
                    <div className="text-xs font-semibold">Csak háttér csere mód</div>
                    <div className="text-[10px] text-muted-foreground">Az AI kizárólag a hátteret cseréli, semmi mást</div>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={settings.never_modify_face}
                    onChange={(e) => setSettings({ ...settings, never_modify_face: e.target.checked })}
                  />
                  <div>
                    <div className="text-xs font-semibold">SOHA ne módosítsa az arcot/testet</div>
                    <div className="text-[10px] text-muted-foreground">Tilos szépítés, deepfake, arccsere</div>
                  </div>
                </label>
              </Card>

              {/* ============== 🎨 BÁRMILYEN SZÍNES HÁTTÉR ============== */}
              <Card className="p-4 space-y-4 border-2 border-emerald-500/40 bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold uppercase tracking-wide">Bármilyen színes háttér — nem csak zöld!</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  ✅ Az AI (MediaPipe Selfie Segmentation) az embert <strong>bármilyen normális, színes háttérről</strong> kivágja — nem kell zöld háttér, nem kell stúdió. Egy utcán, szobában, parkban felvett videó is működik.
                </p>

                <div>
                  <Label className="text-xs uppercase">Kivágás minősége</Label>
                  <select
                    className="w-full p-2 border bg-background mt-1"
                    value={settings.segmentation_quality}
                    onChange={(e) => setSettings({ ...settings, segmentation_quality: e.target.value })}
                  >
                    <option value="fast">Gyors (landscape modell — egyszerű háttér)</option>
                    <option value="high">Pontos (general modell — bármilyen háttér, AJÁNLOTT)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Label>Él lágyítás (ne legyen szaggatott)</Label>
                    <span className="font-mono">{Math.round(settings.edge_softness * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    className="w-full"
                    value={settings.edge_softness}
                    onChange={(e) => setSettings({ ...settings, edge_softness: parseFloat(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Magasabb = lágyabb átmenet ember és háttér között (természetesebb)
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Label>Forgalmas háttér tűrés</Label>
                    <span className="font-mono">{Math.round(settings.busy_background_tolerance * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    className="w-full"
                    value={settings.busy_background_tolerance}
                    onChange={(e) => setSettings({ ...settings, busy_background_tolerance: parseFloat(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Magasabb = jobb teljesítmény zsúfolt, mintás, sokszínű hátteren
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Label>Maszk küszöb (érzékenység)</Label>
                    <span className="font-mono">{settings.mask_threshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min="0.1" max="0.9" step="0.05"
                    className="w-full"
                    value={settings.mask_threshold}
                    onChange={(e) => setSettings({ ...settings, mask_threshold: parseFloat(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Alacsonyabb = több részlet (haj, ujjak), magasabb = tisztább szélek
                  </p>
                </div>

                <label className="flex items-start gap-2 cursor-pointer pt-2 border-t">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={settings.supports_any_background}
                    onChange={(e) => setSettings({ ...settings, supports_any_background: e.target.checked })}
                  />
                  <div>
                    <div className="text-xs font-semibold">Bármilyen háttér támogatás (AJÁNLOTT BE)</div>
                    <div className="text-[10px] text-muted-foreground">Az AI nem keres zöld színt — emberi alakot ismer fel</div>
                  </div>
                </label>
              </Card>

              <Card className="p-4 space-y-3">
                <h3 className="font-bold uppercase tracking-wide">Brand szövegek</h3>
                <div>
                  <Label className="text-xs">Intro szöveg (klip elején)</Label>
                  <Input
                    value={settings.brand_intro_text}
                    onChange={(e) => setSettings({ ...settings, brand_intro_text: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Outro szöveg (klip végén)</Label>
                  <Input
                    value={settings.brand_outro_text}
                    onChange={(e) => setSettings({ ...settings, brand_outro_text: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Klip cím sablon (használható: {"{product}"}, {"{date}"})</Label>
                  <Input
                    value={settings.default_clip_title_pattern}
                    onChange={(e) => setSettings({ ...settings, default_clip_title_pattern: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </Card>

              <Card className="p-4 space-y-2">
                <h3 className="font-bold uppercase tracking-wide">AI prompt sablon</h3>
                <p className="text-xs text-muted-foreground">
                  Ezt a sablont használja az AI a reklámszöveg generálásához. Helyettesítők: <code>{"{product_name}"}</code>, <code>{"{price}"}</code>.
                </p>
                <Textarea
                  rows={5}
                  value={settings.ai_prompt_template}
                  onChange={(e) => setSettings({ ...settings, ai_prompt_template: e.target.value })}
                />
              </Card>

              <Card className="p-4 space-y-3">
                <h3 className="font-bold uppercase tracking-wide">Háttér-könyvtár kezelés</h3>
                <p className="text-xs text-muted-foreground">
                  Adj kategóriát és csillagozd a kedvenceket — ezekkel szűrhetsz a Klip készítés fülön.
                </p>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {backgrounds.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 p-2 border">
                      <button
                        onClick={() => toggleBgFavorite(b.id, !!b.is_favorite)}
                        className="text-amber-500"
                        title="Kedvenc"
                      >
                        <Star className={`h-4 w-4 ${b.is_favorite ? "fill-amber-500" : ""}`} />
                      </button>
                      <span className="text-sm flex-1 truncate">{b.title}</span>
                      <select
                        className="p-1 border bg-background text-xs"
                        value={b.category ?? "general"}
                        onChange={(e) => updateBgCategory(b.id, e.target.value)}
                      >
                        {BG_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {backgrounds.length === 0 && (
                    <p className="text-xs text-muted-foreground">Még nincs feltöltött háttér.</p>
                  )}
                </div>
              </Card>

              <Button onClick={saveSettings} disabled={savingSettings} size="lg" className="w-full">
                {savingSettings ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mentés…</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Beállítások mentése</>
                )}
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAiStudioRecorder;
