import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { Heart, ShoppingCart, Trash2, Share2, Copy, Check, Link2 } from "lucide-react";

interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    original_price: number | null;
    image_url: string | null;
    stock: number;
    category: string;
  };
}

const Wishlist = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const fetchWishlist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }

      const { data } = await supabase
        .from("wishlists")
        .select("id, product_id, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const productIds = data.map(d => d.product_id);
        const { data: products } = await supabase
          .from("shop_products")
          .select("id, name, price, original_price, image_url, stock, category")
          .in("id", productIds);

        const productMap = new Map((products || []).map(p => [p.id, p]));
        setItems(data.map(d => ({ ...d, product: productMap.get(d.product_id) as any })));
      } else {
        setItems([]);
      }
      setLoading(false);
    };
    fetchWishlist();
  }, [navigate]);

  const removeItem = async (id: string) => {
    await supabase.from("wishlists").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: "Eltávolítva a kedvencekből" });
  };

  const addToCart = (item: WishlistItem) => {
    if (!item.product) return;
    addItem({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      image_url: item.product.image_url,
      size: "",
      color: "",
    });
    toast({ title: "Kosárba téve! ✓", description: item.product.name });
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

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Fiókom</p>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">Kedvencek</h1>
          </div>
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-none uppercase tracking-wider text-[10px] gap-1.5"
              onClick={async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return;
                // Check for existing share
                const { data: existing } = await (supabase.from("wishlist_shares" as any) as any)
                  .select("share_token")
                  .eq("user_id", session.user.id)
                  .maybeSingle();
                let token = existing?.share_token;
                if (!token) {
                  const { data: created } = await (supabase.from("wishlist_shares" as any) as any)
                    .insert({ user_id: session.user.id })
                    .select("share_token")
                    .single();
                  token = created?.share_token;
                }
                if (token) {
                  const link = `${window.location.origin}/wishlist/shared/${token}`;
                  setShareLink(link);
                  await navigator.clipboard.writeText(link);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 3000);
                  toast({ title: "Link másolva! 🔗", description: "Oszd meg barátaiddal." });
                }
              }}
            >
              {linkCopied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
              {linkCopied ? "Másolva!" : "Megosztás"}
            </Button>
          )}
        </div>

        {shareLink && (
          <div className="mb-4 flex items-center gap-2 border border-accent/30 bg-accent/5 p-3 text-xs">
            <Link2 className="h-4 w-4 text-accent shrink-0" />
            <span className="truncate text-muted-foreground">{shareLink}</span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-7 px-2 text-[10px]"
              onClick={async () => {
                await navigator.clipboard.writeText(shareLink);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
                toast({ title: "Link másolva!" });
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-20 border border-border bg-card">
            <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Még nincsenek kedvenceid</p>
            <Button variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={() => navigate("/shop")}>
              Böngéssz a boltban
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((item) => {
              const p = item.product;
              if (!p) return null;
              return (
                <div key={item.id} className="border border-border bg-card overflow-hidden group">
                  <div className="relative aspect-[3/4] bg-secondary overflow-hidden cursor-pointer" onClick={() => navigate("/shop")}>
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
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-background/80 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
                    <Button
                      size="sm"
                      className="w-full mt-2.5 rounded-none uppercase tracking-wider text-[10px] h-8"
                      disabled={p.stock <= 0}
                      onClick={() => addToCart(item)}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Kosárba
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Wishlist;
