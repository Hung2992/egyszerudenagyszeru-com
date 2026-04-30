import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mic, Upload, Play, Trash2, Volume2 } from "lucide-react";

interface ClonedVoice {
  id: string;
  name: string;
  description: string | null;
  elevenlabs_voice_id: string | null;
  status: string;
  error_message: string | null;
  is_default: boolean;
  created_at: string;
}

/**
 * AI Marketing Stúdió — Hangklónozás (ElevenLabs Instant Voice Clone)
 * - MP3/WAV feltöltés (max 25MB, lehetőleg 30s+ tiszta beszéd)
 * - eleven_multilingual_v2 modell magyarra
 * - Természetes, emberi hangzás (stability/style/similarity finomhangolás)
 */
export default function AdminAiStudioVoiceCloning({
  onVoiceSelected,
}: {
  onVoiceSelected?: (voiceId: string) => void;
}) {
  const { toast } = useToast();
  const [voices, setVoices] = useState<ClonedVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [name, setName] = useState("Saját hang");
  const [desc, setDesc] = useState("Természetes magyar férfi hang");
  const [file, setFile] = useState<File | null>(null);
  const [activeVoice, setActiveVoice] = useState<string | null>(null);

  const [text, setText] = useState(
    "Sziasztok! Ez az új kollekciónk — egyszerű, mégis nagyszerű streetwear, készletben elérhető.",
  );
  const [stability, setStability] = useState(0.45);
  const [similarity, setSimilarity] = useState(0.85);
  const [style, setStyle] = useState(0.35);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_studio_voices")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setVoices(data as ClonedVoice[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const upload = async () => {
    if (!file) {
      toast({ title: "Válassz ki egy MP3/WAV fájlt", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name);
      fd.append("description", desc);

      const { data, error } = await supabase.functions.invoke(
        "ai-studio-clone-voice",
        { body: fd },
      );
      if (error) throw error;
      toast({ title: "✓ Hang klónozva", description: data?.voice?.name });
      setFile(null);
      await load();
      if (data?.voice?.id) {
        setActiveVoice(data.voice.id);
        onVoiceSelected?.(data.voice.id);
      }
    } catch (e: any) {
      toast({
        title: "Hiba a klónozáskor",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Biztosan törlöd ezt a hangot?")) return;
    await supabase.from("ai_studio_voices").delete().eq("id", id);
    await load();
  };

  const speak = async () => {
    if (!activeVoice) {
      toast({ title: "Válassz egy klónozott hangot", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-studio-tts", {
        body: {
          voice_id: activeVoice,
          text,
          stability,
          similarity_boost: similarity,
          style,
          speed,
          model_id: "eleven_multilingual_v2",
        },
      });
      if (error) throw error;
      const url = `data:${data.mime};base64,${data.audio_base64}`;
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (e: any) {
      toast({
        title: "TTS hiba",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="p-4 space-y-4 bg-card border-border">
      <div className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-primary" />
        <h3 className="font-black uppercase tracking-wider text-lg">
          Saját hang klónozása
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Tölts fel egy <strong>30 másodperces+ tiszta MP3/WAV</strong> mintát a saját
        hangodról (csendes szoba, egy beszélő). Az AI ezután hibrid magyar hangon
        olvas fel bármilyen szöveget — emberinek hangzik, nem robotosan.
      </p>

      {/* Feltöltő */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-border p-3">
        <div>
          <Label className="text-xs uppercase">Hang neve</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs uppercase">Leírás</Label>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs uppercase">Hangminta (MP3/WAV, max 25MB)</Label>
          <Input
            type="file"
            accept="audio/mpeg,audio/wav,audio/mp3,audio/x-m4a,audio/mp4"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <div className="md:col-span-2">
          <Button
            onClick={upload}
            disabled={!file || uploading}
            className="w-full uppercase font-black"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Klónozás...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Feltöltés és klónozás
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hanglista */}
      <div className="space-y-2">
        <Label className="text-xs uppercase">Klónozott hangok</Label>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : voices.length === 0 ? (
          <p className="text-xs text-muted-foreground">Még nincs klónozott hang.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {voices.map((v) => (
              <div
                key={v.id}
                className={`flex items-center justify-between border p-2 ${
                  activeVoice === v.id
                    ? "border-primary bg-primary/10"
                    : "border-border"
                }`}
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    setActiveVoice(v.id);
                    onVoiceSelected?.(v.id);
                  }}
                >
                  <div className="font-bold text-sm">{v.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.status === "ready"
                      ? "✓ Kész"
                      : v.status === "error"
                      ? `✗ ${v.error_message?.slice(0, 80)}`
                      : "⏳ " + v.status}
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(v.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TTS teszt */}
      <div className="border border-border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <Label className="text-xs uppercase">Tesztelés a saját hangoddal</Label>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Mit mondjon a hangod?"
        />
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <Label>Stabilitás: {stability.toFixed(2)}</Label>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[stability]}
              onValueChange={(v) => setStability(v[0])}
            />
            <p className="text-muted-foreground mt-1">
              Alacsony = több érzelem, magas = monotonabb
            </p>
          </div>
          <div>
            <Label>Hasonlóság: {similarity.toFixed(2)}</Label>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[similarity]}
              onValueChange={(v) => setSimilarity(v[0])}
            />
            <p className="text-muted-foreground mt-1">
              Magas = pont a te hangod
            </p>
          </div>
          <div>
            <Label>Stílus: {style.toFixed(2)}</Label>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[style]}
              onValueChange={(v) => setStyle(v[0])}
            />
          </div>
          <div>
            <Label>Tempó: {speed.toFixed(2)}×</Label>
            <Slider
              min={0.7}
              max={1.2}
              step={0.05}
              value={[speed]}
              onValueChange={(v) => setSpeed(v[0])}
            />
          </div>
        </div>
        <Button
          onClick={speak}
          disabled={!activeVoice || generating}
          className="w-full uppercase font-black"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generálás...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" /> Felolvasás a saját hangoddal
            </>
          )}
        </Button>
        <audio ref={audioRef} controls className="w-full" />
      </div>
    </Card>
  );
}
