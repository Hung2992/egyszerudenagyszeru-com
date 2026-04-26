import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Upload, Scissors, Download, Loader2, Film, Type as TypeIcon,
  Volume2, VolumeX, Crop, Sparkles, Wand2, Image as ImageIcon,
  Music, Gauge, Layers as LayersIcon, RefreshCw, Play, Brain, Zap,
  Wand, Camera, Rocket,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ===================================================================
// AI MARKETING VIDEÓ SZERKESZTŐ
// - Saját videó feltöltése (mp4/mov/webm)
// - Trim (start/end)
// - Aspect / crop preset (9:16, 1:1, 4:5, 16:9) – platformonként
// - Hang ki/be / volume
// - Sebesség (0.5x – 2x)
// - Felirat ráégetés (burned-in subtitle)
// - Watermark / brand szöveg overlay
// - Filter (fade in/out, brightness, contrast)
// - AI script + felirat generálás (Lovable AI)
// - Thumbnail kivágás (1 frame -> jpg)
// - Export MP4
// ===================================================================

interface Props {
  platformLabel: string;
  defaultAspect: string; // pl. "9:16"
}

const ASPECT_PRESETS: Record<string, { w: number; h: number; label: string }> = {
  "9:16": { w: 1080, h: 1920, label: "9:16 Reel/Short/Story" },
  "1:1": { w: 1080, h: 1080, label: "1:1 Feed" },
  "4:5": { w: 1080, h: 1350, label: "4:5 Instagram Feed" },
  "16:9": { w: 1920, h: 1080, label: "16:9 YouTube/landscape" },
  "2:3": { w: 1000, h: 1500, label: "2:3 Pinterest" },
};

const AdminVideoEditor = ({ platformLabel, defaultAspect }: Props) => {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logLine, setLogLine] = useState<string>("");

  // Source
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Output
  const [outputUrl, setOutputUrl] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");

  // Edit params
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [aspect, setAspect] = useState<string>(
    ASPECT_PRESETS[defaultAspect.split(",")[0].trim()] ? defaultAspect.split(",")[0].trim() : "9:16"
  );
  const [muted, setMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(100);
  const [speed, setSpeed] = useState<number>(1);
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1);
  const [saturation, setSaturation] = useState<number>(1);
  const [fadeIn, setFadeIn] = useState<number>(0);
  const [fadeOut, setFadeOut] = useState<number>(0);

  // Watermark / overlay
  const [watermarkText, setWatermarkText] = useState<string>("");
  const [watermarkPos, setWatermarkPos] = useState<string>("bottom-right");
  const [watermarkSize, setWatermarkSize] = useState<number>(36);

  // Subtitle (burn-in)
  const [subtitleText, setSubtitleText] = useState<string>("");
  const [subtitleSize, setSubtitleSize] = useState<number>(48);

  // AI script
  const [aiScriptOutput, setAiScriptOutput] = useState<string>("");
  const [loadingScript, setLoadingScript] = useState(false);

  // Load ffmpeg
  useEffect(() => {
    (async () => {
      try {
        const ffmpeg = new FFmpeg();
        ffmpeg.on("log", ({ message }) => {
          setLogLine(message);
        });
        ffmpeg.on("progress", ({ progress }) => {
          setProgress(Math.round(progress * 100));
        });
        const base = "https://unpkg.com/@ffmpeg/[email protected]/dist/umd";
        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
        });
        ffmpegRef.current = ffmpeg;
        setReady(true);
      } catch (e: any) {
        toast({ title: "FFmpeg betöltési hiba", description: e.message, variant: "destructive" });
      }
    })();
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 200 * 1024 * 1024) {
      toast({ title: "Túl nagy fájl", description: "Max 200 MB.", variant: "destructive" });
      return;
    }
    setSourceFile(f);
    const url = URL.createObjectURL(f);
    setSourceUrl(url);
    setOutputUrl("");
    setThumbnailUrl("");
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      setTrimEnd(d);
    }
  };

  const escapeForDrawText = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/"/g, '\\"');

  const buildFilter = (): string => {
    const filters: string[] = [];
    const ar = ASPECT_PRESETS[aspect] || ASPECT_PRESETS["9:16"];
    // Scale + pad to target aspect (kitölt fekete háttérrel ha kell, vagy crop)
    filters.push(
      `scale=${ar.w}:${ar.h}:force_original_aspect_ratio=increase,crop=${ar.w}:${ar.h}`
    );
    // EQ (brightness/contrast/saturation)
    if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
      filters.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`);
    }
    // Speed (video)
    if (speed !== 1) {
      filters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
    }
    // Fade in/out
    if (fadeIn > 0) {
      filters.push(`fade=t=in:st=0:d=${fadeIn}`);
    }
    if (fadeOut > 0) {
      const trimDur = (trimEnd - trimStart) / speed;
      const start = Math.max(0, trimDur - fadeOut);
      filters.push(`fade=t=out:st=${start.toFixed(2)}:d=${fadeOut}`);
    }
    // Watermark
    if (watermarkText.trim()) {
      const txt = escapeForDrawText(watermarkText.trim());
      const posMap: Record<string, string> = {
        "top-left": "x=40:y=40",
        "top-right": "x=w-tw-40:y=40",
        "bottom-left": "x=40:y=h-th-40",
        "bottom-right": "x=w-tw-40:y=h-th-40",
        "center": "x=(w-tw)/2:y=(h-th)/2",
      };
      filters.push(
        `drawtext=text='${txt}':fontsize=${watermarkSize}:fontcolor=white:borderw=3:bordercolor=black@0.7:${posMap[watermarkPos]}`
      );
    }
    // Subtitle (burn-in, központosítva alul)
    if (subtitleText.trim()) {
      const lines = subtitleText.split("\n").filter((l) => l.trim());
      lines.forEach((line, i) => {
        const txt = escapeForDrawText(line);
        const yOffset = 120 + (lines.length - 1 - i) * (subtitleSize + 16);
        filters.push(
          `drawtext=text='${txt}':fontsize=${subtitleSize}:fontcolor=white:borderw=4:bordercolor=black:x=(w-tw)/2:y=h-${yOffset}`
        );
      });
    }
    return filters.join(",");
  };

  const exportVideo = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !sourceFile) {
      toast({ title: "Nincs forrás videó", variant: "destructive" });
      return;
    }
    setLoading(true);
    setProgress(0);
    setOutputUrl("");
    try {
      const inputName = "input." + (sourceFile.name.split(".").pop() || "mp4");
      await ffmpeg.writeFile(inputName, await fetchFile(sourceFile));

      const vf = buildFilter();
      const args: string[] = ["-i", inputName];
      if (trimStart > 0) args.push("-ss", trimStart.toFixed(2));
      if (trimEnd > 0 && trimEnd < duration) {
        args.push("-to", trimEnd.toFixed(2));
      }
      args.push("-vf", vf);

      // Audio
      if (muted) {
        args.push("-an");
      } else {
        const audioFilters: string[] = [];
        if (speed !== 1) {
          // atempo csak 0.5–2 közt – ha kívül esne, daraboljuk
          let s = speed;
          while (s > 2) { audioFilters.push("atempo=2"); s /= 2; }
          while (s < 0.5) { audioFilters.push("atempo=0.5"); s *= 2; }
          audioFilters.push(`atempo=${s.toFixed(3)}`);
        }
        if (volume !== 100) {
          audioFilters.push(`volume=${(volume / 100).toFixed(2)}`);
        }
        if (audioFilters.length) args.push("-af", audioFilters.join(","));
      }

      args.push(
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "output.mp4"
      );

      await ffmpeg.exec(args);
      const data = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      setOutputUrl(URL.createObjectURL(blob));
      toast({ title: "Kész!", description: `Méret: ${(blob.size / 1024 / 1024).toFixed(2)} MB` });
    } catch (e: any) {
      toast({ title: "Export hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const captureThumbnail = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !sourceFile) {
      toast({ title: "Nincs forrás videó", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const inputName = "thumb_in." + (sourceFile.name.split(".").pop() || "mp4");
      await ffmpeg.writeFile(inputName, await fetchFile(sourceFile));
      const ar = ASPECT_PRESETS[aspect];
      const t = (trimStart + (trimEnd - trimStart) * 0.3).toFixed(2);
      await ffmpeg.exec([
        "-ss", t,
        "-i", inputName,
        "-frames:v", "1",
        "-vf", `scale=${ar.w}:${ar.h}:force_original_aspect_ratio=increase,crop=${ar.w}:${ar.h}`,
        "-q:v", "3",
        "thumb.jpg",
      ]);
      const data = (await ffmpeg.readFile("thumb.jpg")) as Uint8Array;
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "image/jpeg" });
      setThumbnailUrl(URL.createObjectURL(blob));
      toast({ title: "Thumbnail kész" });
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateAdScript = async () => {
    setLoadingScript(true);
    setAiScriptOutput("");
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;
      const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Te a világ legjobb ${platformLabel} reklám copywriter + videó forgatókönyv-író vagy.
Hossz: ${(trimEnd - trimStart).toFixed(0)} mp. Aspect: ${aspect}.
KÖTELEZŐ KIMENET:
🎬 HOOK (0-2 mp): figyelemfelkeltő mondat
📝 SUBTITLE SOROK (egy/sor, max 8 szó/sor, ráégetésre kész) – másold a Felirat mezőbe
💧 WATERMARK SZÖVEG javaslat (rövid, brand)
🎯 CTA végszó
🎵 ZENE javaslat (BPM, hangulat)
✂️ VÁGÁSI RITMUS (mp/snippet javaslat)`,
            },
            {
              role: "user",
              content: `Generálj reklám forgatókönyvet ${platformLabel}-ra ${(trimEnd - trimStart).toFixed(0)} mp-es saját videómhoz, ${aspect} aspect ratio-ban. Magyar piacra.`,
            },
          ],
        }),
      });
      if (!resp.ok || !resp.body) throw new Error("AI hiba");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") continue;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setAiScriptOutput(acc);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast({ title: "AI hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoadingScript(false);
    }
  };

  const downloadOutput = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `${platformLabel.toLowerCase().replace(/\s/g, "-")}-${aspect.replace(":", "x")}-${Date.now()}.mp4`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`rounded-none uppercase ${ready ? "bg-emerald-600" : "bg-amber-500"} text-white`}>
          {ready ? "FFmpeg ✓ kész" : "FFmpeg betöltés..."}
        </Badge>
        <Badge className="rounded-none uppercase bg-foreground text-background">
          <Film className="h-3 w-3 mr-1" /> {platformLabel} reklám editor
        </Badge>
        {loading && <Badge className="rounded-none bg-blue-600 text-white">{progress}%</Badge>}
      </div>

      {/* UPLOAD */}
      <div className="border-2 border-dashed border-foreground/40 p-4 text-center">
        <Label className="cursor-pointer block">
          <Upload className="h-6 w-6 mx-auto mb-2" />
          <div className="text-sm font-bold uppercase tracking-wider">
            {sourceFile ? sourceFile.name : "Tölts fel saját videót (mp4/mov/webm, max 200 MB)"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {sourceFile ? `${(sourceFile.size / 1024 / 1024).toFixed(1)} MB · ${duration.toFixed(1)} mp` : "Kattints vagy húzd ide"}
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={onFileChange} />
        </Label>
      </div>

      {sourceUrl && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* PREVIEW */}
          <div className="space-y-2">
            <Label className="text-xs uppercase">Eredeti</Label>
            <video
              ref={videoRef}
              src={sourceUrl}
              controls
              onLoadedMetadata={onLoadedMetadata}
              className="w-full border bg-black max-h-[400px]"
            />
          </div>
          {/* OUTPUT */}
          <div className="space-y-2">
            <Label className="text-xs uppercase">Eredmény</Label>
            {outputUrl ? (
              <>
                <video src={outputUrl} controls className="w-full border bg-black max-h-[400px]" />
                <Button onClick={downloadOutput} className="w-full rounded-none uppercase font-bold">
                  <Download className="h-4 w-4 mr-2" /> Letöltés MP4
                </Button>
              </>
            ) : (
              <div className="border bg-muted/30 h-[300px] flex items-center justify-center text-xs text-muted-foreground">
                Nyomd meg az "Export" gombot
              </div>
            )}
          </div>
        </div>
      )}

      {sourceFile && (
        <Tabs defaultValue="trim" className="space-y-3">
          <TabsList className="rounded-none w-full grid grid-cols-3 md:grid-cols-6 h-auto">
            <TabsTrigger value="trim" className="rounded-none uppercase text-[10px] py-2"><Scissors className="h-3 w-3 mr-1" />Trim</TabsTrigger>
            <TabsTrigger value="aspect" className="rounded-none uppercase text-[10px] py-2"><Crop className="h-3 w-3 mr-1" />Aspect</TabsTrigger>
            <TabsTrigger value="audio" className="rounded-none uppercase text-[10px] py-2"><Volume2 className="h-3 w-3 mr-1" />Hang</TabsTrigger>
            <TabsTrigger value="effects" className="rounded-none uppercase text-[10px] py-2"><Wand2 className="h-3 w-3 mr-1" />FX</TabsTrigger>
            <TabsTrigger value="text" className="rounded-none uppercase text-[10px] py-2"><TypeIcon className="h-3 w-3 mr-1" />Felirat</TabsTrigger>
            <TabsTrigger value="ai" className="rounded-none uppercase text-[10px] py-2"><Sparkles className="h-3 w-3 mr-1" />AI script</TabsTrigger>
          </TabsList>

          {/* TRIM */}
          <TabsContent value="trim" className="space-y-3 border p-3">
            <Label className="text-xs uppercase">Kezdés: {trimStart.toFixed(1)} mp</Label>
            <Slider value={[trimStart]} min={0} max={duration} step={0.1} onValueChange={(v) => setTrimStart(v[0])} />
            <Label className="text-xs uppercase">Vég: {trimEnd.toFixed(1)} mp</Label>
            <Slider value={[trimEnd]} min={0} max={duration} step={0.1} onValueChange={(v) => setTrimEnd(v[0])} />
            <div className="text-xs text-muted-foreground">Hossz: {(trimEnd - trimStart).toFixed(1)} mp</div>
            <Label className="text-xs uppercase">Sebesség: {speed.toFixed(2)}x</Label>
            <Slider value={[speed]} min={0.25} max={3} step={0.05} onValueChange={(v) => setSpeed(v[0])} />
          </TabsContent>

          {/* ASPECT */}
          <TabsContent value="aspect" className="space-y-3 border p-3">
            <Label className="text-xs uppercase">Aspect / Crop</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(ASPECT_PRESETS).map(([k, v]) => (
                <Button
                  key={k}
                  variant={aspect === k ? "default" : "outline"}
                  className="rounded-none uppercase text-[10px] h-auto py-2 flex-col"
                  onClick={() => setAspect(k)}
                >
                  <div className="font-bold">{k}</div>
                  <div className="text-[9px] opacity-70">{v.w}×{v.h}</div>
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              A videó a középről lesz vágva (crop), hogy kitöltse a kívánt arányt.
            </p>
          </TabsContent>

          {/* AUDIO */}
          <TabsContent value="audio" className="space-y-3 border p-3">
            <Button
              onClick={() => setMuted(!muted)}
              variant={muted ? "destructive" : "outline"}
              className="rounded-none uppercase font-bold"
            >
              {muted ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
              {muted ? "Hang KIKAPCSOLVA" : "Hang BE"}
            </Button>
            {!muted && (
              <>
                <Label className="text-xs uppercase">Hangerő: {volume}%</Label>
                <Slider value={[volume]} min={0} max={300} step={5} onValueChange={(v) => setVolume(v[0])} />
              </>
            )}
          </TabsContent>

          {/* EFFECTS */}
          <TabsContent value="effects" className="space-y-3 border p-3">
            <Label className="text-xs uppercase">Fényerő: {brightness.toFixed(2)}</Label>
            <Slider value={[brightness]} min={-0.5} max={0.5} step={0.05} onValueChange={(v) => setBrightness(v[0])} />
            <Label className="text-xs uppercase">Kontraszt: {contrast.toFixed(2)}</Label>
            <Slider value={[contrast]} min={0.5} max={2} step={0.05} onValueChange={(v) => setContrast(v[0])} />
            <Label className="text-xs uppercase">Telítettség: {saturation.toFixed(2)}</Label>
            <Slider value={[saturation]} min={0} max={3} step={0.05} onValueChange={(v) => setSaturation(v[0])} />
            <Label className="text-xs uppercase">Fade in: {fadeIn.toFixed(1)} mp</Label>
            <Slider value={[fadeIn]} min={0} max={3} step={0.1} onValueChange={(v) => setFadeIn(v[0])} />
            <Label className="text-xs uppercase">Fade out: {fadeOut.toFixed(1)} mp</Label>
            <Slider value={[fadeOut]} min={0} max={3} step={0.1} onValueChange={(v) => setFadeOut(v[0])} />
          </TabsContent>

          {/* TEXT */}
          <TabsContent value="text" className="space-y-3 border p-3">
            <Label className="text-xs uppercase">Watermark / brand szöveg</Label>
            <Input
              className="rounded-none"
              placeholder="pl. @brandnev / weboldal.hu"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="border rounded-none p-2 text-sm bg-background"
                value={watermarkPos}
                onChange={(e) => setWatermarkPos(e.target.value)}
              >
                <option value="top-left">Bal felső</option>
                <option value="top-right">Jobb felső</option>
                <option value="bottom-left">Bal alsó</option>
                <option value="bottom-right">Jobb alsó</option>
                <option value="center">Közép</option>
              </select>
              <div>
                <Label className="text-[10px] uppercase">Méret: {watermarkSize}px</Label>
                <Slider value={[watermarkSize]} min={20} max={120} step={2} onValueChange={(v) => setWatermarkSize(v[0])} />
              </div>
            </div>

            <Label className="text-xs uppercase mt-3 block">Felirat (egy sor / képernyő, ráégetve)</Label>
            <Textarea
              className="rounded-none"
              rows={5}
              placeholder="Egy sor / képernyő felirat&#10;Max ~8 szó / sor jól olvasható"
              value={subtitleText}
              onChange={(e) => setSubtitleText(e.target.value)}
            />
            <Label className="text-xs uppercase">Felirat méret: {subtitleSize}px</Label>
            <Slider value={[subtitleSize]} min={24} max={96} step={2} onValueChange={(v) => setSubtitleSize(v[0])} />
            <p className="text-[11px] text-muted-foreground">
              ⚠ A felirat középre, alulra ráég a képbe. Több sor egyszerre jelenik meg.
            </p>
          </TabsContent>

          {/* AI SCRIPT */}
          <TabsContent value="ai" className="space-y-3 border p-3">
            <Button
              onClick={generateAdScript}
              disabled={loadingScript}
              className="w-full rounded-none uppercase font-bold"
            >
              {loadingScript ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {loadingScript ? "Generálás..." : `AI reklám forgatókönyv + felirat sorok ${platformLabel}-ra`}
            </Button>
            <Textarea
              className="rounded-none min-h-[300px] font-mono text-xs"
              value={aiScriptOutput}
              onChange={(e) => setAiScriptOutput(e.target.value)}
              placeholder="Hook, felirat sorok, watermark javaslat, CTA, zene..."
            />
            {aiScriptOutput && (
              <Button
                variant="outline"
                className="rounded-none uppercase text-xs"
                onClick={() => {
                  // try extract subtitle lines automatically
                  const m = aiScriptOutput.match(/SUBTITLE[^]*?:([^]*?)(?:💧|🎯|🎵|✂|$)/i);
                  if (m) {
                    const cleaned = m[1].split("\n").map((l) => l.replace(/^[\s\-•*\d.)]+/, "").trim()).filter(Boolean).slice(0, 6).join("\n");
                    setSubtitleText(cleaned);
                    toast({ title: "Felirat sorok átemelve" });
                  } else {
                    toast({ title: "Nem találtam felirat blokkot" });
                  }
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Felirat sorok átemelése
              </Button>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* EXPORT */}
      {sourceFile && (
        <div className="border-2 border-foreground p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={exportVideo}
              disabled={loading || !ready}
              className="flex-1 rounded-none uppercase font-bold"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Film className="h-4 w-4 mr-2" />}
              {loading ? `Renderelés... ${progress}%` : `Export MP4 → ${platformLabel} reklám`}
            </Button>
            <Button
              onClick={captureThumbnail}
              disabled={loading || !ready}
              variant="outline"
              className="rounded-none uppercase font-bold"
            >
              <ImageIcon className="h-4 w-4 mr-2" /> Thumbnail
            </Button>
          </div>
          {logLine && (
            <div className="text-[10px] font-mono text-muted-foreground line-clamp-1">
              {logLine}
            </div>
          )}
          {thumbnailUrl && (
            <div>
              <Label className="text-xs uppercase">Thumbnail</Label>
              <img src={thumbnailUrl} alt="thumb" className="border max-w-xs" />
              <Button
                size="sm"
                variant="outline"
                className="rounded-none uppercase text-xs mt-2"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = thumbnailUrl;
                  a.download = "thumbnail.jpg";
                  a.click();
                }}
              >
                <Download className="h-3 w-3 mr-1" /> Thumbnail letöltés
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminVideoEditor;
