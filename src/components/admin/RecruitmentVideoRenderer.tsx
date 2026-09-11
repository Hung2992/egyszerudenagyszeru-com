import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Film, Download, Volume2, Play, Square, RefreshCw, Layers } from "lucide-react";

interface Scene {
  scene: number;
  text_overlay?: string | null;
  voiceover?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
}

interface Variant {
  key: string;
  label: string;
  voice: string;
  style: string;
  scenes: Scene[];
}

interface Props {
  video: any;
  onUpdated: () => void;
}

const VOICES = [
  { v: "alloy", l: "Alloy (semleges)" },
  { v: "verse", l: "Verse (energikus)" },
  { v: "sage", l: "Sage (nyugodt)" },
  { v: "ballad", l: "Ballad (meleg)" },
  { v: "coral", l: "Coral (barátságos)" },
];

const STYLES = [
  { v: "cinematic", l: "Mozis" },
  { v: "minimal", l: "Letisztult" },
  { v: "documentary", l: "Dokumentum" },
];

type SceneSetting = { enabled: boolean; dur: number | null };

// Minden jelenet (kép) legalább ennyi ideig látszik
const MIN_SCENE_SEC = 60;

const loadImage = (url: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
};

const RecruitmentVideoRenderer = ({ video, onUpdated }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopRef = useRef(false);
  const [voice, setVoice] = useState("alloy");
  const [style, setStyle] = useState("cinematic");
  const [busy, setBusy] = useState<"assets" | "render" | "preview" | "variants" | string | null>(null);
  const [progress, setProgress] = useState(0);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [variantKey, setVariantKey] = useState<string>("base");
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const variants: Variant[] = Array.isArray(video.variants) ? video.variants : [];
  const baseScenes: Scene[] = Array.isArray(video.scene_images) ? video.scene_images : [];
  const scenes: Scene[] = useMemo(() => {
    if (variantKey === "base") return baseScenes;
    return variants.find((v) => v.key === variantKey)?.scenes ?? [];
  }, [variantKey, video]);

  const savedTiming = (video.timing && typeof video.timing === "object" ? video.timing : {}) as any;
  const [gap, setGap] = useState<number>(Number(savedTiming.gap ?? 0.3));
  const [settings, setSettings] = useState<Record<number, SceneSetting>>(
    (savedTiming.scenes as Record<number, SceneSetting>) || {},
  );

  useEffect(() => {
    setDrafts({});
  }, [variantKey]);

  const isSquare = video.platform === "facebook";
  const W = 1080;
  const H = isSquare ? 1080 : 1920;

  const setting = (n: number): SceneSetting => settings[n] ?? { enabled: true, dur: null };
  const patchSetting = (n: number, p: Partial<SceneSetting>) =>
    setSettings((s) => ({ ...s, [n]: { ...setting(n), ...p } }));

  const makeAssets = async () => {
    setBusy("assets");
    try {
      const { data, error } = await supabase.functions.invoke("partner-recruitment-agent", {
        body: { action: "video_assets", video_id: video.id, voice, style },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Képek és narráció elkészültek" });
      onUpdated();
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Nem sikerült", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const makeVariants = async () => {
    setBusy("variants");
    const presets = ["energetic", "calm"];
    let done = 0;
    try {
      for (const preset of presets) {
        const { data, error } = await supabase.functions.invoke("partner-recruitment-agent", {
          body: { action: "video_variants", video_id: video.id, preset },
        });
        if (error) throw new Error((data as any)?.error || error.message);
        if ((data as any)?.error) throw new Error((data as any).error);
        done++;
        toast({ title: `Változat kész (${done}/${presets.length})` });
        onUpdated();
      }
    } catch (e: any) {
      toast({
        title: "Hiba",
        description: done
          ? `${done} változat elkészült, a többi nem: ${e?.message || "ismeretlen hiba"}`
          : e?.message || "Nem sikerült",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const regenScene = async (s: Scene) => {
    const text = (drafts[s.scene] ?? s.voiceover ?? "").trim();
    if (text.length < 2) {
      toast({ title: "Írj be narrációt", variant: "destructive" });
      return;
    }
    setBusy(`scene-${s.scene}`);
    try {
      const { data, error } = await supabase.functions.invoke("partner-recruitment-agent", {
        body: {
          action: "scene_audio",
          video_id: video.id,
          scene: s.scene,
          text,
          voice,
          variant_key: variantKey === "base" ? null : variantKey,
        },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: `${s.scene}. jelenet hangja frissült` });
      onUpdated();
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Nem sikerült", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveTiming = async () => {
    try {
      await supabase.functions.invoke("partner-recruitment-agent", {
        body: { action: "video_timing", video_id: video.id, timing: { gap, scenes: settings } },
      });
    } catch { /* időzítés mentése nem kritikus */ }
  };

  // Közös lejátszó: előnézet (recording=false) és felvétel (recording=true)
  const runSequence = async (recording: boolean) => {
    const active = scenes.filter((s) => setting(s.scene).enabled);
    if (!active.length) {
      toast({ title: "Nincs bekapcsolt jelenet", variant: "destructive" });
      return;
    }
    stopRef.current = false;
    setBusy(recording ? "render" : "preview");
    setProgress(0);
    try {
      const canvas = canvasRef.current!;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const AudioCtx: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const dest = recording ? audioCtx.createMediaStreamDestination() : null;

      const prepared = await Promise.all(
        active.map(async (s) => {
          const img = s.image_url ? await loadImage(s.image_url) : null;
          let buffer: AudioBuffer | null = null;
          if (s.audio_url) {
            try {
              const res = await fetch(s.audio_url);
              buffer = await audioCtx.decodeAudioData(await res.arrayBuffer());
            } catch { buffer = null; }
          }
          return { ...s, img, buffer };
        }),
      );

      let rec: MediaRecorder | null = null;
      let done: Promise<Blob> | null = null;
      if (recording && dest) {
        const stream = canvas.captureStream(60);
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
        const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm";
        const chunks: BlobPart[] = [];
        rec = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: 12_000_000,
          audioBitsPerSecond: 192_000,
        });
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        done = new Promise<Blob>((resolve) => {
          rec!.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
        });
        rec.start(200);
      }
      await audioCtx.resume();

      const drawScene = (s: any, idx: number, t: number, dur: number) => {
        const p = Math.min(1, t / dur);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, W, H);
        if (s.img) {
          const zoom = 1.05 + p * 0.1;
          const scale = Math.max(W / s.img.width, H / s.img.height) * zoom;
          const dw = s.img.width * scale;
          const dh = s.img.height * scale;
          ctx.drawImage(s.img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        }
        const grad = ctx.createLinearGradient(0, H * 0.45, 0, H);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, H * 0.45, W, H * 0.55);

        const label = s.text_overlay || s.voiceover || "";
        if (label) {
          ctx.font = `900 ${Math.round(W / 14)}px "Space Grotesk", system-ui, sans-serif`;
          ctx.textAlign = "center";
          const lines = wrapText(ctx, String(label).slice(0, 160), W * 0.86).slice(0, 4);
          const lh = Math.round(W / 11);
          let y = H - 140 - (lines.length - 1) * lh;
          for (const ln of lines) {
            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillText(ln, W / 2 + 3, y + 3);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(ln, W / 2, y);
            y += lh;
          }
        }
        ctx.fillStyle = "#d4af37";
        ctx.fillRect(0, H - 8, W * ((idx + p) / prepared.length), 8);
      };

      for (let i = 0; i < prepared.length; i++) {
        if (stopRef.current) break;
        const s = prepared[i];
        const override = setting(s.scene).dur;
        const auto = s.buffer ? Math.max(1.6, s.buffer.duration + 0.35) : 3;
        const base = override && override > 0 ? override : auto;
        const dur = Math.max(MIN_SCENE_SEC, base) + Math.max(0, gap);
        if (s.buffer) {
          const src = audioCtx.createBufferSource();
          src.buffer = s.buffer;
          src.connect(dest ?? audioCtx.destination);
          src.start();
        }
        const start = performance.now();
        await new Promise<void>((resolve) => {
          const tick = () => {
            const t = (performance.now() - start) / 1000;
            drawScene(s, i, t, dur);
            setProgress(Math.round(((i + Math.min(1, t / dur)) / prepared.length) * 100));
            if (t >= dur || stopRef.current) return resolve();
            requestAnimationFrame(tick);
          };
          tick();
        });
      }

      if (!recording) {
        audioCtx.close();
        return;
      }

      rec!.stop();
      const blob = await done!;
      audioCtx.close();

      const url = URL.createObjectURL(blob);
      setLocalUrl(url);
      await saveTiming();

      const path = `recruitment/videos/${video.id}-${variantKey}-${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, blob, { contentType: "video/webm", upsert: false });
      if (upErr) {
        toast({ title: "Videó kész", description: "A mentés nem sikerült, de letöltheted." });
      } else {
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
        await supabase
          .from("partner_recruitment_videos")
          .update({ video_url: pub.publicUrl, status: "rendered", rendered_at: new Date().toISOString() })
          .eq("id", video.id);
        toast({ title: "Videó elkészült és elmentve" });
        onUpdated();
      }
    } catch (e: any) {
      toast({
        title: recording ? "Renderelési hiba" : "Előnézeti hiba",
        description: e?.message || "Ismeretlen hiba",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      setProgress(0);
      stopRef.current = false;
    }
  };

  const playing = busy === "preview" || busy === "render";

  return (
    <div className="border-t pt-3 space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Hang</div>
          <select
            className="h-9 border bg-background px-2 text-xs"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
          >
            {VOICES.map((v) => <option key={v.v} value={v.v}>{v.l}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Képi stílus</div>
          <select
            className="h-9 border bg-background px-2 text-xs"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            {STYLES.map((v) => <option key={v.v} value={v.v}>{v.l}</option>)}
          </select>
        </div>
        <Button size="sm" variant="outline" onClick={makeAssets} disabled={busy !== null}>
          {busy === "assets" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Volume2 className="h-4 w-4 mr-2" />}
          Képek + narráció készítése
        </Button>
        <Button size="sm" variant="outline" onClick={makeVariants} disabled={busy !== null}>
          {busy === "variants" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}
          2 videóváltozat generálása
        </Button>
      </div>

      {variants.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase text-muted-foreground">Változat</span>
          {[{ key: "base", label: "Alap" }, ...variants].map((v: any) => (
            <button
              key={v.key}
              onClick={() => setVariantKey(v.key)}
              className={`h-8 px-3 border text-xs uppercase tracking-wider ${
                variantKey === v.key ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {!scenes.length && (
        <div className="text-[11px] text-muted-foreground">
          Előbb készíttesd el a képeket és a narrációt — utána szerkeszthető és renderelhető a videó.
        </div>
      )}

      {scenes.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Szünet jelenetek közt (mp)</div>
              <Input
                type="number" min={0} max={3} step={0.1} value={gap}
                onChange={(e) => setGap(Math.max(0, Math.min(3, Number(e.target.value) || 0)))}
                className="h-9 w-24 text-xs"
              />
            </div>
            <Button size="sm" onClick={() => runSequence(false)} disabled={busy !== null}>
              <Play className="h-4 w-4 mr-2" /> Előnézet
            </Button>
            {playing && (
              <Button size="sm" variant="outline" onClick={() => { stopRef.current = true; }}>
                <Square className="h-4 w-4 mr-2" /> Leállítás
              </Button>
            )}
            <Button size="sm" onClick={() => runSequence(true)} disabled={busy !== null}>
              {busy === "render" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Film className="h-4 w-4 mr-2" />}
              {busy === "render" ? `Videó készül… ${progress}%` : "Videó elkészítése hanggal"}
            </Button>
            {(localUrl || video.video_url) && (
              <a
                href={localUrl || video.video_url}
                download={`toborzo-video-${video.id}.webm`}
                className="inline-flex items-center h-9 px-3 border text-xs uppercase tracking-wider"
              >
                <Download className="h-4 w-4 mr-2" /> Letöltés
              </a>
            )}
          </div>

          <div className="space-y-2">
            {scenes.map((s) => {
              const st = setting(s.scene);
              return (
                <div key={s.scene} className="flex gap-3 border p-2">
                  {s.image_url
                    ? <img src={s.image_url} alt={`${s.scene}. jelenet`} loading="lazy" className="w-16 h-24 object-cover border" />
                    : <div className="w-16 h-24 border bg-muted" />}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-semibold">{s.scene}. jelenet</span>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={st.enabled}
                          onChange={(e) => patchSetting(s.scene, { enabled: e.target.checked })}
                        />
                        Benne a videóban
                      </label>
                      <span className="text-muted-foreground">Hossz (mp):</span>
                      <Input
                        type="number" min={0} max={20} step={0.5}
                        value={st.dur ?? ""}
                        placeholder="auto"
                        onChange={(e) =>
                          patchSetting(s.scene, { dur: e.target.value === "" ? null : Number(e.target.value) })}
                        className="h-7 w-20 text-xs"
                      />
                    </div>
                    <Textarea
                      value={drafts[s.scene] ?? s.voiceover ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [s.scene]: e.target.value }))}
                      rows={2}
                      className="text-xs"
                      placeholder="Narráció szövege…"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => regenScene(s)}
                        disabled={busy !== null}
                      >
                        {busy === `scene-${s.scene}`
                          ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                        Hang újragenerálása
                      </Button>
                      {s.audio_url && <audio src={s.audio_url} controls className="h-7" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(localUrl || video.video_url) && (
        <video src={localUrl || video.video_url} controls playsInline className="w-56 border" />
      )}

      <canvas
        ref={canvasRef}
        className={playing ? "w-40 border" : "hidden"}
      />
    </div>
  );
};

export default RecruitmentVideoRenderer;
