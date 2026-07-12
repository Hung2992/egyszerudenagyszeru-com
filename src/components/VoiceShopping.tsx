import { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2, Volume2, X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { recordWav, stopRecordingNow } from "@/lib/voice-recorder";

type Phase = "idle" | "recording" | "transcribing" | "thinking" | "speaking" | "done" | "error";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  color?: string;
  size?: string;
}

export default function VoiceShopping() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const startedAtRef = useRef(0);
  const queryIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  const reset = () => {
    setPhase("idle");
    setTranscript("");
    setReply("");
    setProducts([]);
    setErrorMsg("");
    queryIdRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  };

  const start = useCallback(async () => {
    try {
      reset();
      setPhase("recording");
      startedAtRef.current = performance.now();
      const { blob, durationMs } = await recordWav(15);
      if (blob.size < 3000) {
        setPhase("error"); setErrorMsg("Túl rövid felvétel. Beszélj legalább egy másodpercig.");
        return;
      }
      setPhase("transcribing");
      const form = new FormData();
      form.append("file", blob, "voice.wav");
      const { data: sess } = await supabase.auth.getSession();
      const authHeader = sess?.session?.access_token ? { Authorization: `Bearer ${sess.session.access_token}` } : undefined;
      const url = `https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/voice-transcribe`;
      const trRes = await fetch(url, {
        method: "POST",
        headers: {
          apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
          ...(authHeader ?? {}),
        },
        body: form,
      });
      const trJson = await trRes.json().catch(() => ({}));
      if (!trRes.ok) {
        setPhase("error");
        setErrorMsg(trJson?.message ?? "Nem sikerült felismerni a szöveget.");
        return;
      }
      const text = String(trJson.text || "").trim();
      setTranscript(text);
      if (!text) { setPhase("error"); setErrorMsg("Nem érzékeltem szöveget."); return; }

      // Log query (best-effort)
      try {
        const { data: log } = await supabase
          .from("voice_shopping_queries")
          .insert({
            transcript: text,
            user_id: sess?.session?.user?.id ?? null,
            duration_ms: durationMs,
          })
          .select("id").single();
        queryIdRef.current = log?.id ?? null;
      } catch { /* ignore */ }

      // Shopping assistant hívás
      setPhase("thinking");
      const { data: ai, error: aiErr } = await supabase.functions.invoke("shopping-assistant", {
        body: { message: text, history: [] },
      });
      if (aiErr) { setPhase("error"); setErrorMsg("AI válasz sikertelen: " + aiErr.message); return; }
      const replyText = ai?.reply ?? ai?.response ?? ai?.message ?? "Rendben.";
      setReply(replyText);
      setProducts(Array.isArray(ai?.products) ? ai.products : []);

      if (queryIdRef.current) {
        supabase.from("voice_shopping_queries")
          .update({ response_text: replyText })
          .eq("id", queryIdRef.current)
          .then(() => {}, () => {});
      }

      // TTS
      setPhase("speaking");
      try {
        const ttsRes = await fetch(`https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/voice-tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
            ...(authHeader ?? {}),
          },
          body: JSON.stringify({ text: replyText }),
        });
        if (ttsRes.ok) {
          const buf = await ttsRes.arrayBuffer();
          const audioBlob = new Blob([buf], { type: "audio/mpeg" });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => setPhase("done");
          audio.onerror = () => setPhase("done");
          await audio.play().catch(() => setPhase("done"));
        } else {
          setPhase("done");
        }
      } catch {
        setPhase("done");
      }
    } catch (e: any) {
      setPhase("error");
      if (e?.name === "NotAllowedError") setErrorMsg("A mikrofonhoz nincs engedély. Engedélyezd a böngésző beállításaiban.");
      else setErrorMsg(e?.message || "Ismeretlen hiba.");
    }
  }, []);

  const stopMic = () => stopRecordingNow();

  const openProduct = async (p: Product) => {
    if (queryIdRef.current) {
      await supabase
        .from("voice_shopping_queries")
        .update({ clicked_product_ids: [p.id] })
        .eq("id", queryIdRef.current)
        .then(() => {}, () => {});
    }
    setOpen(false);
    navigate(`/product/${p.id}`);
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); }}
        aria-label="Hangalapú keresés"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-none bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 md:bottom-6 md:right-24"
      >
        <Mic className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md p-0 gap-0 rounded-none">
          <DialogTitle className="sr-only">Hangalapú vásárlás</DialogTitle>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              <span className="font-semibold">Hangalapú vásárlás</span>
            </div>
            <button onClick={() => { setOpen(false); reset(); }} aria-label="Bezár"><X className="h-5 w-5" /></button>
          </div>

          <div className="p-6 min-h-[380px] flex flex-col items-center justify-center gap-4">
            {phase === "idle" && (
              <>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Nyomd meg a mikrofont és mondd el mit keresel. Pl:<br />
                  <span className="italic">"Fekete férfi póló, XL, 8000 Ft alatt"</span>
                </p>
                <Button onClick={start} size="lg" className="rounded-none h-16 w-16 p-0">
                  <Mic className="h-7 w-7" />
                </Button>
              </>
            )}

            {phase === "recording" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                  <Button onClick={stopMic} size="lg" className="rounded-none h-16 w-16 p-0 bg-red-600 hover:bg-red-700 relative">
                    <Square className="h-6 w-6" fill="currentColor" />
                  </Button>
                </div>
                <p className="text-sm">🎙️ Beszélj most... (max 15 mp)</p>
                <p className="text-xs text-muted-foreground">Kattints a stopra ha végeztél.</p>
              </>
            )}

            {phase === "transcribing" && (
              <><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm">Szövegre alakítás...</p></>
            )}

            {phase === "thinking" && (
              <div className="w-full space-y-2">
                <div className="text-xs text-muted-foreground uppercase">Te mondtad</div>
                <div className="text-sm border border-border p-3 bg-muted/30">{transcript}</div>
                <div className="flex items-center gap-2 pt-2"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Keresek termékeket...</span></div>
              </div>
            )}

            {(phase === "speaking" || phase === "done") && (
              <div className="w-full space-y-3 max-h-[70vh] overflow-y-auto">
                <div className="text-xs text-muted-foreground uppercase">Te mondtad</div>
                <div className="text-sm border border-border p-3 bg-muted/30">{transcript}</div>

                <div className="text-xs text-muted-foreground uppercase flex items-center gap-2">
                  AI válasz {phase === "speaking" && <Volume2 className="h-3 w-3 animate-pulse" />}
                </div>
                <div className="text-sm prose prose-sm max-w-none">
                  <ReactMarkdown>{reply}</ReactMarkdown>
                </div>

                {products.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs text-muted-foreground uppercase">Ajánlott termékek</div>
                    {products.slice(0, 5).map((p) => (
                      <Card key={p.id} onClick={() => openProduct(p)}
                        className="flex items-center gap-3 p-2 rounded-none cursor-pointer hover:bg-muted/40">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="h-14 w-14 object-cover" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.color && <span>{p.color}</span>}{p.color && p.size && " · "}{p.size}
                          </div>
                          <div className="text-sm font-bold">{Number(p.price).toLocaleString("hu-HU")} Ft</div>
                        </div>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      </Card>
                    ))}
                  </div>
                )}

                <Button onClick={start} variant="outline" className="w-full rounded-none mt-3">
                  <Mic className="h-4 w-4 mr-2" /> Új kérdés
                </Button>
              </div>
            )}

            {phase === "error" && (
              <div className="text-center space-y-3">
                <p className="text-sm text-destructive">{errorMsg}</p>
                <Button onClick={start} variant="outline" className="rounded-none">Újra</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
