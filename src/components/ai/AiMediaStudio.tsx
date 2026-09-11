import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, Video, Sparkles } from "lucide-react";

interface Props {
  partnerId?: string | null;
  title?: string;
}

interface GeneratedItem {
  kind: "image" | "video";
  url: string;
  prompt: string;
  source: string;
  provider: string;
}

export default function AiMediaStudio({ partnerId = null, title = "AI kép és videó készítő" }: Props) {
  const [kind, setKind] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(5);
  const [size, setSize] = useState("1024x1024");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GeneratedItem[]>([]);

  const generate = async () => {
    const text = prompt.trim();
    if (text.length < 3) return toast.error("Írd le, mit szeretnél látni.");
    setLoading(true);
    const [w, h] = size.split("x").map((n) => Number(n));
    const { data, error } = await supabase.functions.invoke("ai-media-generate", {
      body: {
        kind,
        prompt: text,
        width: w,
        height: h,
        seconds,
        partner_id: partnerId,
      },
    });
    setLoading(false);

    if (error) {
      let msg = "A generálás nem sikerült.";
      const res = (error as { context?: Response }).context;
      if (res && typeof res.json === "function") {
        try {
          const body = await res.json();
          if (body?.message) msg = body.message;
        } catch { /* marad az alap üzenet */ }
      }
      return toast.error(msg);
    }
    if (!data?.ok) return toast.error(data?.message || "A generálás nem sikerült.");

    setItems((prev) => [
      { kind, url: data.url, prompt: text, source: data.source, provider: data.provider },
      ...prev,
    ]);
    toast.success(
      data.source === "local"
        ? `Kész — saját szerveren, ingyen (${data.provider})`
        : "Kész — felhő AI-val",
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={kind === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => setKind("image")}
          >
            <ImageIcon className="h-4 w-4 mr-1" /> Kép
          </Button>
          <Button
            type="button"
            variant={kind === "video" ? "default" : "outline"}
            size="sm"
            onClick={() => setKind("video")}
          >
            <Video className="h-4 w-4 mr-1" /> Videó
          </Button>
        </div>

        <div>
          <Label>Mit készítsen?</Label>
          <Textarea
            rows={3}
            placeholder="Pl.: fekete pamut póló arany logóval, stúdió háttér, terméktfotó"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={1500}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {kind === "image" ? (
            <div>
              <Label>Méret</Label>
              <select
                className="w-full h-10 border border-input bg-background px-3 text-sm"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                <option value="1024x1024">Négyzet (1024×1024)</option>
                <option value="1280x720">Fekvő (1280×720)</option>
                <option value="720x1280">Álló / mobil (720×1280)</option>
              </select>
            </div>
          ) : (
            <div>
              <Label>Hossz (másodperc)</Label>
              <Input
                type="number"
                min={2}
                max={20}
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
              />
            </div>
          )}
          <div className="flex items-end">
            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Elkészítem
            </Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((it, i) => (
              <div key={i} className="border border-border p-2 space-y-2">
                {it.kind === "image" ? (
                  <img src={it.url} alt={it.prompt} loading="lazy" className="w-full object-cover" />
                ) : (
                  <video src={it.url} controls playsInline className="w-full" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={it.source === "local" ? "default" : "secondary"}>
                    {it.source === "local" ? "Saját szerver (ingyen)" : "Felhő AI"}
                  </Badge>
                  <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                    Megnyitás
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          A képek és videók a saját gépeden futó ingyenes AI szerveren készülnek, ha be van kötve.
          Videóhoz saját videó szerver szükséges.
        </p>
      </CardContent>
    </Card>
  );
}
