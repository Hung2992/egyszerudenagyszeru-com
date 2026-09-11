import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { ShoppingBag, Store } from "lucide-react";
import MediaImage from "@/components/partner/MediaImage";

interface Item {
  id: string;
  title: string;
  slug: string;
  price_huf: number;
  compare_price_huf: number | null;
  images: string[] | null;
  brandName: string;
  brandSlug: string | null;
}

interface Props {
  limit?: number;
  title?: string;
  subtitle?: string;
}

const PartnerProductsShowcase = ({
  limit = 8,
  title = "Partner márkák",
  subtitle = "Friss termékek a platformon értékesítő márkáktól",
}: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: prods } = await supabase
        .from("partner_products")
        .select("id, title, slug, price_huf, compare_price_huf, images, partner_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit);

      const list = prods || [];
      if (!list.length) {
        if (alive) { setItems([]); setLoading(false); }
        return;
      }

      const partnerIds = Array.from(new Set(list.map((p: any) => p.partner_id)));
      const { data: stores } = await supabase
        .from("partner_storefronts")
        .select("partner_id, slug, display_name, is_published")
        .in("partner_id", partnerIds);

      const map = new Map<string, any>();
      (stores || []).forEach((s: any) => map.set(s.partner_id, s));

      const mapped: Item[] = list.map((p: any) => {
        const s = map.get(p.partner_id);
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          price_huf: p.price_huf,
          compare_price_huf: p.compare_price_huf ?? null,
          images: Array.isArray(p.images) ? p.images : [],
          brandName: s?.display_name || "Partner márka",
          brandSlug: s?.is_published ? s.slug : null,
        };
      });

      if (alive) { setItems(mapped); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [limit]);

  if (loading || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 border-t border-border">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">
            <Store className="h-3.5 w-3.5" /> Partner shop
          </div>
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((p) => {
          const href = p.brandSlug ? `/b/${p.brandSlug}/termek/${p.slug}` : null;
          const card = (
            <>
              <div className="aspect-square overflow-hidden bg-muted">
                {p.images?.[0] ? (
                  <MediaImage
                    bucket="partner-product-images"
                    path={p.images[0]}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <ShoppingBag className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground line-clamp-1">
                  {p.brandName}
                </div>
                <div className="font-bold text-sm uppercase tracking-wider line-clamp-2 mt-1">{p.title}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-bold text-primary">{p.price_huf.toLocaleString("hu-HU")} Ft</span>
                  {p.compare_price_huf && (
                    <span className="text-xs line-through text-muted-foreground">
                      {p.compare_price_huf.toLocaleString("hu-HU")} Ft
                    </span>
                  )}
                </div>
              </div>
            </>
          );

          return href ? (
            <Link key={p.id} to={href} className="group block border border-border hover:border-primary transition-colors">
              {card}
            </Link>
          ) : (
            <div key={p.id} className="group block border border-border">{card}</div>
          );
        })}
      </div>
    </section>
  );
};

export default PartnerProductsShowcase;
