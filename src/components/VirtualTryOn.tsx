// Sprint B.4 — Virtual Try-On client widget
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Camera, Upload, Download, Share2, ShoppingBag, Sparkles, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  productId?: string;
  productSource?: string;
  productName: string;
  productImageUrl?: string;
  onAddToCart?: () => void;
};

function getSessionId() {
  try {
    let s = localStorage.getItem("tryon_session");
    if (!s) { s = crypto.randomUUID(); localStorage.setItem("tryon_session", s); }
    return s;
  } catch { return null; }
}

async function logEvent(event_type: string, extra: Record<string, unknown> = {}) {
  try {
    await supabase.from("tryon_events").insert({
      event_type,
      session_id: getSessionId(),
      device_type: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
      ...extra,
    } as any);
  } catch { /* silent */ }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function VirtualTryOn({ productId, productSource, productName, productImageUrl, onAddToCart }: Props) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openDialog = async () => {
    setOpen(true);
    await logEvent("tryon_open", { product_id: productId ?? null, product_source: productSource ?? null });
  };

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast({ title: "Túl nagy kép", description: "Max 8 MB.", variant: "destructive" });
      return;
    }
    const b64 = await fileToBase64(f);
    setPhoto(b64);
    setResult(null);
    await logEvent("tryon_photo_upload", { product_id: productId ?? null });
  };

  const generate = async () => {
    if (!photo) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Bejelentkezés szükséges", description: "A virtuális próba használatához jelentkezz be.", variant: "destructive" });
        setBusy(false); return;
      }
      const { data, error } = await supabase.functions.invoke("virtual-tryon", {
        body: {
          photo_base64: photo,
          product_id: productId,
          product_source: productSource,
          product_name: productName,
          product_image_url: productImageUrl,
          session_id: getSessionId(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult((data as any).image_base64);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("rate_limited")) toast({ title: "Túl sok kérés", description: "Várj pár percet.", variant: "destructive" });
      else if (msg.includes("credits")) toast({ title: "AI kredit elfogyott", description: "Kérjük próbáld később.", variant: "destructive" });
      else toast({ title: "Hiba", description: msg.slice(0, 120), variant: "destructive" });
    } finally { setBusy(false); }
  };

  const download = async () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result; a.download = `tryon-${productName}.png`; a.click();
    await logEvent("tryon_download", { product_id: productId ?? null });
  };

  const share = async () => {
    if (!result) return;
    await logEvent("tryon_share", { product_id: productId ?? null });
    try {
      const blob = await (await fetch(result)).blob();
      const file = new File([blob], "tryon.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: productName });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link vágólapra másolva" });
      }
    } catch { /* user cancel */ }
  };

  const addCart = async () => {
    await logEvent("tryon_add_to_cart", { product_id: productId ?? null });
    onAddToCart?.();
  };

  return (
    <>
      <Button onClick={openDialog} variant="outline" className="gap-2">
        <Sparkles className="h-4 w-4" /> Virtuális próba
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Virtuális próba — {productName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!photo && (
              <div className="border-2 border-dashed p-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Tölts fel egy egészalakos fotót magadról. Természetes fény, sima háttér a legjobb.</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={pick} className="gap-2"><Upload className="h-4 w-4" /> Fotó feltöltése</Button>
                  <Button onClick={() => { if (inputRef.current) { inputRef.current.setAttribute("capture", "user"); inputRef.current.click(); } }} variant="outline" className="gap-2">
                    <Camera className="h-4 w-4" /> Kamera
                  </Button>
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              </div>
            )}

            {photo && !result && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1 text-muted-foreground">Te</p>
                  <img src={photo} alt="you" className="w-full h-64 object-cover" />
                </div>
                <div>
                  <p className="text-xs mb-1 text-muted-foreground">Termék</p>
                  {productImageUrl
                    ? <img src={productImageUrl} alt={productName} className="w-full h-64 object-contain bg-muted" />
                    : <div className="w-full h-64 bg-muted flex items-center justify-center text-xs">Nincs kép</div>}
                </div>
              </div>
            )}

            {result && (
              <div>
                <p className="text-xs mb-1 text-muted-foreground">AI Próba előnézet</p>
                <img src={result} alt="tryon" className="w-full max-h-[500px] object-contain bg-muted" />
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-end">
              {photo && !result && (
                <>
                  <Button onClick={() => { setPhoto(null); }} variant="ghost" className="gap-1"><X className="h-4 w-4" />Mégse</Button>
                  <Button onClick={generate} disabled={busy} className="gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {busy ? "Generálás…" : "Próba generálása"}
                  </Button>
                </>
              )}
              {result && (
                <>
                  <Button onClick={() => { setResult(null); }} variant="ghost">Új próba</Button>
                  <Button onClick={download} variant="outline" className="gap-2"><Download className="h-4 w-4" />Letöltés</Button>
                  <Button onClick={share} variant="outline" className="gap-2"><Share2 className="h-4 w-4" />Megosztás</Button>
                  {onAddToCart && (
                    <Button onClick={addCart} className="gap-2"><ShoppingBag className="h-4 w-4" />Kosárba</Button>
                  )}
                </>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              A generált kép AI vizuális előnézet — a valós szabás és méret eltérhet.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
