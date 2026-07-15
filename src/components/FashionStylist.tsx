// Sprint B.5 — Fashion Stylist AI kliens komponens
// Chat-szerű felület: alkalom + stílus + budget → teljes outfit valós termékekkel + "mind kosárba" + try-on link
import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, X, ShoppingBag, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { trackAiEvent } from "@/lib/ai-analytics";
import { setActiveStylistSession } from "@/lib/stylist-session";

const VirtualTryOn = lazy(() => import("./VirtualTryOn"));

type StylistItem = {
  slot: string;
  description: string;
  keywords: string[];
  why: string;
  products: Array<{ id: string; name: string; price: number; category: string; image_url: string | null }>;
};
type Result = { session_id: string | null; outfit_tip: string; items: StylistItem[]; total_price: number };

const OCCASIONS = ["hétköznapi", "randi", "buli", "esküvő", "sport", "iroda", "utcai"];
const STYLES = ["streetwear", "minimalista", "elegáns", "sportos", "vintage"];

type Props = { open: boolean; onClose: () => void };

export default function FashionStylist({ open, onClose }: Props) {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const [occasion, setOccasion] = useState("hétköznapi");
  const [style, setStyle] = useState("streetwear");
  const [budget, setBudget] = useState<string>("");
  const [prompt, setPrompt] = useState("");

  if (!open) return null;

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const { data, error } = await supabase.functions.invoke("fashion-stylist", {
        body: {
          occasion,
          style,
          budget_max: budget ? Number(budget) : null,
          user_prompt: prompt || null,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as Result);
      trackAiEvent("assistant_recommend" as any, "fashion_stylist", { occasion, style, items: (data as Result).items?.length ?? 0 });
    } catch (e: any) {
      setError(e?.message || "Hiba történt");
    } finally {
      setLoading(false);
    }
  };

  const addAllToCart = async () => {
    if (!result) return;
    let added = 0;
    for (const it of result.items) {
      const p = it.products[0];
      if (!p) continue;
      addItem({
        productId: p.id,
        name: p.name,
        price: Number(p.price),
        image_url: p.image_url,
        size: "M",
        color: "-",
      }, 1);
      added++;
    }
    if (result.session_id) {
      await supabase.from("ai_stylist_sessions").update({ added_to_cart: true }).eq("id", result.session_id);
      setActiveStylistSession(result.session_id);
    }
    trackAiEvent("cart_suggestion_added" as any, "fashion_stylist", { count: added, stylist_session_id: result.session_id });
    toast({ title: `${added} termék hozzáadva a kosárhoz`, description: "AI stylist szett aktív — a rendelésed hozzá lesz kapcsolva." });
  };

  const addSingleToCart = (p: { id: string; name: string; price: number; image_url: string | null }) => {
    addItem({
      productId: p.id,
      name: p.name,
      price: Number(p.price),
      image_url: p.image_url,
      size: "M",
      color: "-",
    }, 1);
    if (result?.session_id) setActiveStylistSession(result.session_id);
    trackAiEvent("cart_suggestion_added" as any, "fashion_stylist_item", { product_id: p.id, stylist_session_id: result?.session_id });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-3">
      <div className="w-full max-w-3xl bg-background border border-border shadow-2xl my-6">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            <h2 className="text-lg font-bold uppercase tracking-wide">AI Fashion Stylist</h2>
          </div>
          <button onClick={onClose} aria-label="Bezárás" className="p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Mondd el mire készülsz — a stylist összeállít egy teljes szettet a boltból.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase">Alkalom</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {OCCASIONS.map(o => (
                  <button key={o} type="button" onClick={() => setOccasion(o)}
                    className={`text-xs px-2 py-1 border ${occasion === o ? "bg-foreground text-background" : "border-border"}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase">Stílus</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {STYLES.map(s => (
                  <button key={s} type="button" onClick={() => setStyle(s)}
                    className={`text-xs px-2 py-1 border ${style === s ? "bg-foreground text-background" : "border-border"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase">Költségkeret (Ft)</Label>
              <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="pl. 40000" />
            </div>
            <div>
              <Label className="text-xs uppercase">Extra kérés</Label>
              <Input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="pl. fekete alapú, nem kirívó" />
            </div>
          </div>

          <Button onClick={run} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Stylist gondolkodik…</> : <><Sparkles className="h-4 w-4 mr-2" />Szett generálása</>}
          </Button>

          {error && <div className="border border-destructive text-destructive p-3 text-sm">{error}</div>}

          {result && (
            <div className="space-y-3">
              {result.outfit_tip && (
                <div className="border border-border p-3 bg-muted/30">
                  <div className="text-xs uppercase text-muted-foreground mb-1">Stylist tipp</div>
                  <div className="text-sm">{result.outfit_tip}</div>
                </div>
              )}

              <div className="space-y-2">
                {result.items.map((it, i) => (
                  <div key={i} className="border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">{it.slot}</div>
                        <div className="font-bold">{it.description}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{it.why}</div>
                    {it.products.length ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {it.products.slice(0, 3).map(p => (
                            <Link key={p.id} to={`/termek/${p.id}`} className="border border-border p-2 hover:bg-muted/50">
                              {p.image_url && (
                                <img src={p.image_url} alt={p.name} className="w-full aspect-square object-cover mb-1" loading="lazy" />
                              )}
                              <div className="text-xs font-medium line-clamp-2">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{Number(p.price).toLocaleString("hu-HU")} Ft</div>
                            </Link>
                          ))}
                        </div>
                        {it.products[0] && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => addSingleToCart(it.products[0])}>
                              <ShoppingBag className="h-3 w-3 mr-1" />Kosárba
                            </Button>
                            <Suspense fallback={null}>
                              <VirtualTryOn
                                productId={it.products[0].id}
                                productName={it.products[0].name}
                                productImageUrl={it.products[0].image_url ?? undefined}
                                stylistSessionId={result.session_id ?? null}
                                onAddToCart={() => addSingleToCart(it.products[0])}
                              />
                            </Suspense>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">Erre a darabra nincs jelenleg passzoló termék a boltban.</div>
                    )}
                  </div>
                ))}
              </div>

              {result.total_price > 0 && (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="text-sm">Szett ára (első match): <strong>{result.total_price.toLocaleString("hu-HU")} Ft</strong></div>
                  <Button onClick={addAllToCart}><ShoppingBag className="h-4 w-4 mr-2" />Teljes szett kosárba</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
