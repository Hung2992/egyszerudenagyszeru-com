import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, Clock, Copy, Loader2 } from "lucide-react";

interface Offer {
  id: string;
  product_name: string;
  original_price: number;
  offered_price: number;
  discount_percent: number;
  coupon_code: string;
  expires_at: string;
  reasoning: string;
}

interface Props {
  productId: string;
  productName?: string;
  price: number;
  cartValue?: number;
  className?: string;
}

/**
 * 💰 AI Áralku gomb – termékoldalon
 * A gombnak MEGVAN a jogosultsága, hogy megnyissa a modalt, de az árat
 * KIZÁRÓLAG a szerveroldali Rules Engine dönti el (`price-negotiate` edge fn).
 * A frontend semmit nem befolyásol az árban.
 */
export default function AiPriceNegotiateButton({ productId, productName, price, cartValue, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [result, setResult] = useState<{ granted: boolean; offer?: Offer; message: string } | null>(null);

  const requestOffer = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("price-negotiate", {
        body: {
          product_id: productId,
          cart_value: cartValue ?? price,
          user_message: userMessage.trim() || undefined,
          session_id: typeof window !== "undefined" ? window.sessionStorage.getItem("session_id") ?? undefined : undefined,
        },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Nem sikerült ajánlatot kérni");
    } finally {
      setLoading(false);
    }
  };

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Kupon vágólapra másolva!");
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => { setOpen(true); setResult(null); setUserMessage(""); }}
        className={className}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        AI áralku
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> 💰 Kérj személyes ajánlatot
            </DialogTitle>
            <DialogDescription>
              Az AI megnézi a termék készletét, a te vásárlói előéletedet és a szabályokat, majd adhat egy diszkréten skálázott, időzített kedvezményt.
            </DialogDescription>
          </DialogHeader>

          {!result && (
            <div className="space-y-3">
              <Input
                placeholder="Írj egy mondatot (opcionális): pl. 'Régóta figyelem, most vinném'"
                value={userMessage}
                onChange={e => setUserMessage(e.target.value)}
                maxLength={200}
              />
              <Button onClick={requestOffer} disabled={loading} className="w-full">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Elemzés…</> : "Ajánlat kérése"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Az AI SOHA nem lépheti át az admin által beállított kereteket. Minden kérés naplózásra kerül.
              </p>
            </div>
          )}

          {result && result.granted && result.offer && (
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Személyes ajánlat</div>
                <div className="text-4xl font-bold text-primary mt-1">-{result.offer.discount_percent}%</div>
                <div className="mt-2 text-sm">
                  <span className="line-through text-muted-foreground">{result.offer.original_price.toLocaleString()} Ft</span>
                  {" → "}
                  <span className="font-bold">{result.offer.offered_price.toLocaleString()} Ft</span>
                </div>
              </div>

              <div className="text-sm bg-muted p-3 rounded">
                <div className="text-xs text-muted-foreground mb-1">Kuponkód:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono font-bold text-lg">{result.offer.coupon_code}</code>
                  <Button size="icon" variant="ghost" onClick={() => copyCoupon(result.offer!.coupon_code)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Érvényes: {new Date(result.offer.expires_at).toLocaleString("hu-HU")}
              </div>

              <p className="text-xs italic text-muted-foreground">{result.offer.reasoning}</p>
            </div>
          )}

          {result && !result.granted && (
            <div className="text-center py-4 space-y-2">
              <div className="text-4xl">🙏</div>
              <p className="text-sm text-muted-foreground">{result.message}</p>
              <Button variant="outline" onClick={() => setResult(null)}>Rendben</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
