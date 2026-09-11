import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Film, Download, Volume2 } from "lucide-react";

interface Scene {
  scene: number;
  text_overlay?: string | null;
  voiceover?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
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
  const [voice, setVoice] = useState("alloy");
  const [busy, setBusy] = useState<"assets" | "render" | null>(null);
  const [progress, setProgress] = useState(0);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  const scenes: Scene[] = Array.isArray(video.scene_images) ? video.scene_images : [];
  const isSquare = video.platform === "facebook";
  const W = isSquare ? 1080 : 720;
  const H = isSquare ? 1080 : 1280;

  const makeAssets = async () => {
    setBusy("assets");
    try {
      const { data, error } = await supabase.functions.invoke("partner-recruitment-agent", {
        body: { action: "video_assets", video_id: video.id, voice },
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

  const render = async () => {
    if (!scenes.length) return;
    setBusy("render");
    setProgress(0);
    try {
      const canvas = canvasRef.current!;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const AudioCtx: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();

      const prepared = await Promise.all(
        scenes.map(async (s) => {
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

      const stream = canvas.captureStream(30);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const chunks: BlobPart[] = [];
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });
      rec.start(200);
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
        const s = prepared[i];
        const dur = s.buffer ? Math.max(1.6, s.buffer.duration + 0.35) : 3;
        if (s.buffer) {
          const src = audioCtx.createBufferSource();
          src.buffer = s.buffer;
          src.connect(dest);
          src.start();
        }
        const start = performance.now();
        await new Promise<void>((resolve) => {
          const tick = () => {
            const t = (performance.now() - start) / 1000;
            drawScene(s, i, t, dur);
            setProgress(Math.round(((i + Math.min(1, t / dur)) / prepared.length) * 100));
            if (t >= dur) return resolve();
            requestAnimationFrame(tick);
          };
          tick();
        });
      }

      rec.stop();
      const blob = await done;
      audioCtx.close();

      const url = URL.createObjectURL(blob);
      setLocalUrl(url);

      const path = `recruitment/videos/${video.id}-${Date.now()}.webm`;
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
      toast({ title: "Renderelési hiba", description: e?.message || "Ismeretlen hiba", variant: "destructive" });
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

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
        <Button size="sm" variant="outline" onClick={makeAssets} disabled={busy !== null}>
          {busy === "assets" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Volume2 className="h-4 w-4 mr-2" />}
          Képek + narráció készítése
        </Button>
        <Button size="sm" onClick={render} disabled={busy !== null || !scenes.length}>
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

      {!scenes.length && (
        <div className="text-[11px] text-muted-foreground">
          Előbb készíttesd el a képeket és a narrációt — utána renderelhető a videó.
        </div>
      )}

      {scenes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {scenes.map((s) => (
            <div key={s.scene} className="w-20 shrink-0">
              {s.image_url
                ? <img src={s.image_url} alt={`jelenet ${s.scene}`} loading="lazy" className="w-20 border" />
                : <div className="w-20 h-32 border bg-muted" />}
              {s.audio_url && <audio src={s.audio_url} controls className="w-20 mt-1 h-6" />}
            </div>
          ))}
        </div>
      )}

      {(localUrl || video.video_url) && (
        <video src={localUrl || video.video_url} controls playsInline className="w-56 border" />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default RecruitmentVideoRenderer;
