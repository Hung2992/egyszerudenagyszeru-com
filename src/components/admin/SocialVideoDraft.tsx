import { useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Copy, Film, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Job = { id: string; status: string; progress?: number; url?: string | null; error?: string };
const readError = async (e: unknown) => e instanceof FunctionsHttpError ? await e.context.text() : (e as Error).message;

export default function SocialVideoDraft({ topic, text }: { topic: string; text: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setJob(null); }, [topic, text]);
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke("social-video", { body: { action: "status", id: job.id } });
      if (error) { toast.error(await readError(error)); setJob({ ...job, status: "failed", error: "Állapot nem kérhető le" }); return; }
      setJob(data);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [job]);
  const start = async () => {
    if (!window.confirm("8 másodperces álló TikTok-videót készítsek ehhez a szöveghez? AI-kreditet használ; közzététel nem történik.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("social-video", { body: { action: "start", topic, text } });
    setBusy(false);
    if (error) { toast.error(await readError(error)); return; }
    setJob(data);
  };
  const running = job && job.status !== "completed" && job.status !== "failed";
  return <div className="space-y-2">
    {!job || job.status === "failed" ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void start()}>{busy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Film className="mr-2 h-3 w-3" />}Videó készítése</Button> : null}
    {running && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Videó készül · {Math.round(job.progress ?? 0)}%</p>}
    {job?.status === "failed" && <p className="text-xs text-destructive break-words">{job.error ?? "A videó nem készült el."}</p>}
    {job?.url && <div className="space-y-2"><video src={job.url} controls playsInline className="w-full max-w-[220px] aspect-[9/16] bg-muted" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><a href={job.url} target="_blank" rel="noopener noreferrer" download>Letöltés</a></Button><Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(job.url!); toast.success("Videó link másolva · 7 napig érvényes"); } catch { toast.error("Másolás sikertelen"); } }}><Copy className="mr-2 h-3 w-3" />Link a Havi tervhez</Button></div><p className="text-xs text-muted-foreground">Tervezet · ellenőrizd jóváhagyás előtt. A link 7 napig érvényes.</p></div>}
  </div>;
}
