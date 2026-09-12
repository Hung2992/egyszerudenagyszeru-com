import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Star } from "lucide-react";
import MediaImage from "@/components/partner/MediaImage";
import { Button } from "@/components/ui/button";
import { addToBrandCart } from "@/lib/brand-cart";
import { toast } from "@/hooks/use-toast";

interface StorefrontProductCardProps {
  product: any;
  store: any;
  compact?: boolean;
}

const wishlistKey = (slug: string) => `brand-wishlist:${slug}`;

export const StorefrontProductCard = ({ product, store, compact = false }: StorefrontProductCardProps) => {
  const [saved, setSaved] = useState(() => {
    try {
      const ids = JSON.parse(localStorage.getItem(wishlistKey(store.slug)) || "[]");
      return Array.isArray(ids) && ids.includes(product.id);
    } catch {
      return false;
    }
  });

  const images: string[] = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const stock = Number(product.stock_qty || 0);
  const price = Number(product.price_huf || 0);
  const comparePrice = Number(product.compare_price_huf || 0);
  const discount = comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : 0;
  const rating = Number(product.average_rating || product.rating || 0);

  const toggleSaved = () => {
    try {
      const current = JSON.parse(localStorage.getItem(wishlistKey(store.slug)) || "[]");
      const ids: string[] = Array.isArray(current) ? current : [];
      const next = ids.includes(product.id) ? ids.filter((id) => id !== product.id) : [...ids, product.id];
      localStorage.setItem(wishlistKey(store.slug), JSON.stringify(next));
      setSaved(next.includes(product.id));
    } catch {
      setSaved((value) => !value);
    }
  };

  const addToCart = () => {
    addToBrandCart(store.slug, {
      product_id: product.id,
      title: product.title,
      price_huf: price,
      qty: 1,
      image: images[0] || null,
      physical: product.product_type !== "digital" && product.fulfillment_type !== "digital",
    });
    toast({ title: "Kosárba tettük", description: product.title });
  };

  return (
    <article className="group relative min-w-0">
      <div className="sf-img relative aspect-[4/5] overflow-hidden bg-muted/40">
        <Link to={`/b/${store.slug}/termek/${product.slug}`} aria-label={`${product.title} megnyitása`}>
          {images[0] ? (
            <>
              <MediaImage bucket="partner-product-images" path={images[0]} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
              {images[1] && <MediaImage bucket="partner-product-images" path={images[1]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
            </>
          ) : (
            <span className="flex h-full items-center justify-center opacity-25"><ShoppingBag className="h-10 w-10" /></span>
          )}
        </Link>
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {discount > 0 && <span className="px-2 py-1 text-[10px] font-bold" style={{ background: store.accent_color, color: store.bg_color }}>-{discount}%</span>}
          {stock > 0 && stock <= 5 && <span className="bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground">Már csak {stock} db</span>}
        </div>
        <Button type="button" variant="secondary" size="icon" onClick={toggleSaved} aria-label={saved ? "Eltávolítás a kedvencekből" : "Mentés a kedvencekhez"} className="absolute right-3 top-3 h-10 w-10 rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background">
          <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} style={saved ? { color: store.accent_color } : undefined} />
        </Button>
        {stock > 0 && (
          <Button type="button" onClick={addToCart} className="sf-btn absolute inset-x-3 bottom-3 h-11 translate-y-2 rounded-none opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100" style={{ background: store.accent_color, color: store.bg_color }}>
            <ShoppingBag className="h-4 w-4" /> Kosárba teszem
          </Button>
        )}
      </div>
      <div className={compact ? "pt-3" : "pt-4"}>
        {product.category && <p className="mb-1 text-[10px] font-semibold uppercase opacity-55">{product.category}</p>}
        <Link to={`/b/${store.slug}/termek/${product.slug}`} className="block text-sm font-semibold leading-snug hover:underline" style={{ fontFamily: store.font_heading }}>{product.title}</Link>
        {rating > 0 && <div className="mt-1 flex items-center gap-1 text-xs opacity-65"><Star className="h-3 w-3 fill-current" /> {rating.toFixed(1)}</div>}
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="font-bold" style={{ color: store.accent_color }}>{price.toLocaleString("hu-HU")} Ft</span>
          {comparePrice > price && <span className="text-xs line-through opacity-45">{comparePrice.toLocaleString("hu-HU")} Ft</span>}
        </div>
        <Button type="button" onClick={addToCart} disabled={stock <= 0} variant="outline" className="sf-btn mt-3 h-10 w-full rounded-none text-xs sm:hidden" style={{ borderColor: store.accent_color, color: store.accent_color }}>
          {stock > 0 ? "Kosárba teszem" : "Elfogyott"}
        </Button>
      </div>
    </article>
  );
};

export default StorefrontProductCard;