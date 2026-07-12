// AI stílus ajánló panel — a 3D viewer ✨ gombja nyitja meg
import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { trackAiEvent } from "@/lib/ai-analytics";

type Suggestion = { category: string; keywords: string[]; why: string };
type Matched = {
  suggestion: Suggestion;
  products: Array<{ id: string; name: string; price: number; category: string; image_url: string | null }>;
};
type Result = { outfit_tip: string; suggestions: Suggestion[]; matched_products: Matched[] };

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productCategory?: string;
  productColors?: string[];
};

export default function AiStyleRecommender({
  open,
  onClose,
  productId,
  productName,
  productCategory,
  productColors,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [occasion, setOccasion] = useState("hétköznapi");

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("ar-style-recommend", {
        body: {
          product_id: productId,
          product_name: productName,
          product_category: productCategory,
          product_colors: productColors,
          occasion,
        },
      });
      if (error) throw error;
      setResult(data as Result);
    } catch (e) {
      setError((e as Error).message || "Hiba történt");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-2xl border border-border bg-background p-6 sm:mx-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Stílus Ajánló</h3>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Milyen alkalomra?
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {["hétköznapi", "buli", "randi", "sport", "iroda"].map((o) => (
                <button
                  key={o}
                  className={`border px-3 py-1 text-sm ${
                    occasion === o
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                  onClick={() => setOccasion(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={run} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI gondolkodik...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Ehhez mit vegyek fel?
              </>
            )}
          </Button>

          {error && <div className="border border-destructive bg-destructive/10 p-3 text-sm">{error}</div>}

          {result && (
            <div className="space-y-4">
              {result.outfit_tip && (
                <div className="border-l-2 border-primary bg-muted/40 p-3 text-sm italic">
                  "{result.outfit_tip}"
                </div>
              )}

              {result.matched_products.map((m, idx) => (
                <div key={idx} className="border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="font-medium">{m.suggestion.category}</div>
                    <div className="text-xs text-muted-foreground">{m.suggestion.why}</div>
                  </div>
                  {m.products.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {m.products.map((p) => (
                        <Link
                          key={p.id}
                          to={`/shop/${p.id}`}
                          onClick={() => trackAiEvent("assistant_product_click", "style_recommender", { source: "ar" }, p.id)}
                          className="group border border-border bg-background hover:border-primary"
                        >
                          {p.image_url && (
                            <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" loading="lazy" />
                          )}
                          <div className="p-2">
                            <div className="text-xs font-medium line-clamp-1">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.price.toLocaleString("hu-HU")} Ft</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Nincs pontos találat — keresd: {m.suggestion.keywords.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
