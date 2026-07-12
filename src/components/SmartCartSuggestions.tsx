// Smart Cart Suggestions - AI-alapú kosár kiegészítők
import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Sparkles, Package, Plus } from "lucide-react";
import { trackAiEvent } from "@/lib/ai-analytics";

interface Suggestion {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category: string | null;
}

interface Bundle {
  id: string;
  name: string;
  discount_percent: number;
  product_ids: string[];
}

const SmartCartSuggestions = () => {
  const { items, addItem } = useCart();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    setLoading(true);
    const cart_product_ids = items.map(i => i.productId);

    supabase.functions.invoke("smart-cart-suggestions", {
      body: { cart_product_ids },
    }).then(({ data }) => {
      if (data) {
        setSuggestions(data.suggestions || []);
        setBundles(data.bundles || []);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [items.length]);

  if (items.length === 0 || (suggestions.length === 0 && bundles.length === 0)) return null;

  return (
    <div className="px-5 py-3 border-t space-y-4">
      {bundles.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-2 flex items-center gap-1.5">
            <Package className="h-3 w-3" />
            Csomagajánlat - Kedvezmény érhető el!
          </p>
          {bundles.map(b => (
            <div key={b.id} className="border border-accent bg-accent/5 p-3 mb-2">
              <p className="text-xs font-bold">{b.name}</p>
              <p className="text-[10px] text-muted-foreground">
                Vedd meg a teljes csomagot és kapsz {b.discount_percent}% kedvezményt.
              </p>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent" />
            AI ajánlás {loading && <span className="text-[9px] normal-case">(betöltés...)</span>}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.slice(0, 6).map(s => (
              <div key={s.id} className="flex-shrink-0 w-24 border bg-card">
                {s.image_url && (
                  <img src={s.image_url} alt={s.name} className="h-20 w-full object-cover" />
                )}
                <div className="p-1.5 text-center">
                  <p className="text-[10px] font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-[10px] text-accent font-bold">{Number(s.price).toLocaleString()} Ft</p>
                  <button
                    onClick={() => addItem({
                      productId: s.id,
                      name: s.name,
                      price: Number(s.price),
                      image_url: s.image_url,
                      size: "M",
                      color: "fekete",
                    }, 1)}
                    className="mt-1 w-full text-[9px] uppercase tracking-wider bg-foreground text-background py-1 flex items-center justify-center gap-0.5 hover:bg-accent hover:text-accent-foreground transition-all"
                  >
                    <Plus className="w-2.5 h-2.5" /> Kosárba
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCartSuggestions;
