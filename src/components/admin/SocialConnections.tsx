import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
type Result = { ok: boolean; status: number; details?: string; data?: { name?: string; account_status?: number; funding_source_details?: unknown; data?: { user?: { display_name?: string } } }; name?: string };
type Connections = { facebook: Result & { billing_link: string; account_link: string }; tiktok: Result; tiktokPosting: Result; linkedin: Result; inspected_at: string };
export default function SocialConnections() {
  const [result, setResult] = useState<Connections | null>(null);
  const [busy, setBusy] = useState(false);
  const inspect = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("social-connections", { body: { action: "inspect" } });
    setBusy(false);
    if (error) { toast.error(error instanceof FunctionsHttpError ? await error.context.text() : error.message); return; }
    setResult(data);
  };
  return <section className="border-b border-border pb-6 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl">Kapcsolatok és Facebook-hirdetések</h2><Button variant="outline" disabled={busy} onClick={() => void inspect()}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Kapcsolatok ellenőrzése</Button></div>
    <div className="grid gap-4 md:grid-cols-3">
      <article className="border border-border p-4 space-y-3"><h3 className="font-display">Facebook · Horváth Zoltán</h3><p className="text-sm text-muted-foreground">{result ? result.facebook.ok ? `Hirdetési fiók elérhető · ${result.facebook.data?.name ?? "Facebook"}` : "Fiókellenőrzés sikertelen" : "Kapcsolódva · legutóbbi ellenőrzés: hirdetési fizetés inaktív"}</p><p className="text-xs text-muted-foreground">Hirdetésindítás előtt aktív fizetés és külön kampányjóváhagyás szükséges.</p><div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><a href={result?.facebook.billing_link ?? "https://business.facebook.com/billing_hub/payment_settings/?asset_id=1752502632475982"} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-3 w-3" />Fizetés beállítása</a></Button><Button asChild variant="outline" size="sm"><a href={result?.facebook.account_link ?? "https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1752502632475982"} target="_blank" rel="noopener noreferrer">Hirdetéskezelő</a></Button></div>{result?.facebook.details && <p className="text-xs text-destructive break-words">{result.facebook.status}: {result.facebook.details}</p>}</article>
      <article className="border border-border p-4 space-y-3"><h3 className="font-display">TikTok</h3><p className="text-sm">{result?.tiktok.data?.data?.user?.display_name ?? "zoltan.horvath2002"}</p><p className="text-xs text-muted-foreground">{result?.tiktokPosting.ok ? "Posztolási előkészítés elérhető · éles eredmény még nincs igazolva" : "Kapcsolódva · olvasás elérhető · posztolási engedély hiányzik"}</p>{result?.tiktokPosting.details && <p className="text-xs text-destructive break-words">{result.tiktokPosting.status}: {result.tiktokPosting.details}</p>}<Button asChild size="sm" variant="outline"><a href="https://developers.tiktok.com/apps/" target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-3 w-3" />TikTok alkalmazások</a></Button></article>
      <article className="border border-border p-4 space-y-3"><h3 className="font-display">LinkedIn</h3><p className="text-sm">{result?.linkedin.name ?? "Zoltan Horvath"}</p><p className="text-xs text-muted-foreground">{result && !result.linkedin.ok ? "Kapcsolat ellenőrzése sikertelen" : "Kapcsolódva · személyes bejegyzésküldési engedély megadva"}</p><p className="text-xs text-muted-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0" />Minden poszt AEGIS-jóváhagyással.</p></article>
    </div>{result && <p className="text-xs text-muted-foreground">Ellenőrizve: {new Date(result.inspected_at).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}</p>}
  </section>;
}