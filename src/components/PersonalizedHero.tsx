import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface PersonalData {
  greeting: string;
  subtitle: string;
  products: Product[];
}

const CACHE_KEY = "personal_home_v1";
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export default function PersonalizedHero() {
  const navigate = useNavigate();
  const [data, setData] = useState<PersonalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        if (active) setLoading(false);
        return;
      }

      // Warm start from cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < CACHE_TTL) {
            if (active) {
              setData(parsed.data);
              setLoading(false);
            }
          }
        }
      } catch { /* ignore */ }

      try {
        const { data: res, error } = await supabase.functions.invoke("personal-home");
        if (error || !res) throw error;

        // Hydrate products
        const ids: string[] = res.product_ids ?? [];
        if (ids.length === 0) {
          if (active) setLoading(false);
          return;
        }
        const { data: prods } = await supabase
          .from("shop_products")
          .select("id, name, price, image_url")
          .in("id", ids);

        // Preserve AI ordering
        const ordered = ids
          .map((id) => (prods ?? []).find((p: any) => p.id === id))
          .filter(Boolean) as Product[];

        const final: PersonalData = {
          greeting: res.greeting,
          subtitle: res.subtitle,
          products: ordered,
        };
        if (active) {
          setData(final);
          setLoading(false);
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: final }));
      } catch (e) {
        console.error("PersonalizedHero", e);
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  if (loading || !data || data.products.length === 0) return null;

  return (
    <section className="bg-gradient-to-b from-background to-background/50 border-y border-border/50 py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-4 text-accent">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs uppercase tracking-[0.2em] font-bold">Neked</span>
        </div>
        <h2 className="font-heading text-2xl md:text-4xl font-black uppercase tracking-tight mb-2">
          {data.greeting}
        </h2>
        <p className="text-muted-foreground mb-6 md:mb-8">{data.subtitle}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {data.products.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/termek/${p.id}`)}
              className="group text-left focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <div className="aspect-square bg-muted overflow-hidden mb-2">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                    Nincs kép
                  </div>
                )}
              </div>
              <p className="text-xs md:text-sm font-bold uppercase truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.price?.toLocaleString("hu-HU")} Ft</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
