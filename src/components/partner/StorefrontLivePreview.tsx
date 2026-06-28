import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { ExternalLink, Smartphone, Monitor, RefreshCw, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  storefrontId: string | null;
  slug: string;
  draft: any;
  /** Bump this number to force a cache-busted iframe reload (publish, DNS verified, etc.) */
  refreshKey?: number;
}

const StorefrontLivePreview = ({ storefrontId, slug, draft, refreshKey = 0 }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState<number>(() => Date.now());

  // Bump cache-bust query when a meaningful refresh trigger arrives (publish / DNS change).
  // We do NOT bump on every draft keystroke — those go via postMessage targeted update.
  useEffect(() => {
    if (refreshKey > 0) setCacheBust(Date.now());
  }, [refreshKey]);

  const iframeSrc = useMemo(
    () => slug ? `/b/${slug}?preview=editor&v=${cacheBust}` : "",
    [slug, cacheBust]
  );

  // Push draft state into iframe via postMessage on every change (targeted live update, no reload).
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage({ type: "storefront-preview-update", draft }, "*");
    } catch { /* ignore */ }
  }, [draft]);

  const reloadFrame = () => {
    setCacheBust(Date.now());
  };

  const createShareToken = async () => {
    if (!storefrontId) { toast({ title: "Először mentsd a storefrontot" }); return; }
    const { data, error } = await supabase
      .from("partner_storefront_preview_tokens")
      .insert({ storefront_id: storefrontId })
      .select("token")
      .maybeSingle();
    if (error || !data) { toast({ title: "Hiba", description: error?.message, variant: "destructive" }); return; }
    setShareToken(data.token);
    const url = `${window.location.origin}/b/${slug}?preview=${data.token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast({ title: "Megosztható előnézet link létrehozva", description: "Vágólapra másolva. Lejár 2 óra múlva." });
  };

  if (!slug) return <p className="text-sm text-muted-foreground p-4">Add meg a slug-ot, hogy az élő előnézet betöltsön.</p>;

  return (
    <div className="space-y-2 sticky top-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          <Button size="sm" variant={device === "desktop" ? "default" : "outline"} className="rounded-none" onClick={() => setDevice("desktop")}>
            <Monitor className="h-3 w-3" />
          </Button>
          <Button size="sm" variant={device === "mobile" ? "default" : "outline"} className="rounded-none" onClick={() => setDevice("mobile")}>
            <Smartphone className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="rounded-none" onClick={reloadFrame}><RefreshCw className="h-3 w-3" /></Button>
          <Button size="sm" variant="outline" className="rounded-none" onClick={createShareToken}>
            <Link2 className="h-3 w-3 mr-1" /> Megoszt
          </Button>
          <Button size="sm" variant="outline" className="rounded-none" asChild>
            <a href={iframeSrc} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
          </Button>
        </div>
      </div>
      <div className="border border-foreground/20 bg-muted flex justify-center p-2">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="Live preview"
          className="bg-background"
          style={{
            width: device === "mobile" ? 390 : "100%",
            height: device === "mobile" ? 720 : 720,
            border: "none",
          }}
        />
      </div>
      {shareToken && (
        <div className="text-[11px] font-mono text-muted-foreground break-all">
          Token: {shareToken} (2 órán át érvényes)
        </div>
      )}
    </div>
  );
};

export default StorefrontLivePreview;
