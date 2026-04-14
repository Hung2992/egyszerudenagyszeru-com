import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { Heart, ShoppingCart } from "lucide-react";

interface SharedProduct {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  stock: number;
  category: string;
}

const SharedWishlist = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [title, setTitle] = useState("Kívánságlista");
  const [products, setProducts] = useState<SharedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!token) { setNotFound(true); setLoading(false); return; }

      const { data: share } = await (supabase.from("wishlist_shares" as any) as any)
        .select("user_id, title")
        .eq("share_token", token)
        .eq("is_public", true)
        .maybeSingle();

      if (!share) { setNotFound(true); setLoading(false); return; }
      setTitle(share.title || "Kívánságlista");

      const { data: wishlistItems } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", share.user_id);

      if (wishlistItems && wishlistItems.length > 0) {
        const ids = wishlistItems.map((w: any) => w.product_id);
        const { data: prods } = await supabase
          .from("shop_products")
          .select("id, name, price, original_price, image_url, stock, category")
          .in("id", ids);
        setProducts((prods || []) as SharedProduct[]);
      }
      setLoading(false);
    };
    fetch();
  }, [token]);

  const addToCart = (p: SharedProduct) => {
    addItem({ productId: p.id, name: p.name, price: p.price, image_url: p.image_url, size: "", color: "" });
    toast({ title: "Kosárba téve! ✓", description: p.name });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <div className="text-center py-20">
          <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Ez a kívánságlista nem található vagy nem publikus.</p>
          <Button variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={() => navigate("/shop")}>
            Vissza a boltba
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Megosztott lista</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">{title}</h1>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 border border-border bg-card">
            <p className="text-sm text-muted-foreground">Ez a kívánságlista üres.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products.map((p) => (
              <div key={p.id} className="border border-border bg-card overflow-hidden group">
                <div className="relative aspect-[3/4] bg-secondary overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-muted-foreground/20">{p.name[0]}</span>
                    </div>
                  )}
                  {p.original_price && p.original_price > p.price && (
                    <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                      -{Math.round((1 - p.price / p.original_price) * 100)}%
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{p.category}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-accent">{p.price.toLocaleString()} Ft</span>
                    {p.original_price && p.original_price > p.price && (
                      <span className="text-[11px] text-muted-foreground line-through">{p.original_price.toLocaleString()} Ft</span>
                    )}
                  </div>
                  <Button size="sm" className="w-full mt-2.5 rounded-none uppercase tracking-wider text-[10px] h-8" disabled={p.stock <= 0} onClick={() => addToCart(p)}>
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Kosárba
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SharedWishlist;
