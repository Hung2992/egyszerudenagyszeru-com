import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import MediaImage from "@/components/partner/MediaImage";
import { toast } from "@/hooks/use-toast";

const BrandProductDetail = () => {
  const { slug, productSlug } = useParams<{ slug: string; productSlug: string }>();
  const [sf, setSf] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: store } = await supabase.from("partner_storefronts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
      if (!store) { setLoading(false); return; }
      setSf(store);
      const { data: p } = await supabase.from("partner_products").select("*").eq("partner_id", store.partner_id).eq("slug", productSlug).eq("status", "active").maybeSingle();
      setProduct(p);
      setLoading(false);
      if (p) {
        await supabase.from("partner_products").update({ view_count: (p.view_count || 0) + 1 }).eq("id", p.id);
      }
    })();
  }, [slug, productSlug]);

  const seo = useMemo(() => {
    if (!sf || !product) return null;
    const title = `${product.title} – ${sf.display_name}`;
    const description = (product.description || sf.tagline || "").slice(0, 160);
    const base = sf.custom_domain ? `https://${sf.custom_domain}` : `https://${sf.slug}.egyszerudenagyszeru.com`;
    const url = `${base}/termek/${product.slug}`;
    const image = product.images?.[0] ? `${base}/storage/partner-product-images/${product.images[0]}` : undefined;
    return { title: title.slice(0, 60), description, url, image };
  }, [sf, product]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Betöltés…</div>;
  if (!sf || !product || !seo) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="text-center space-y-3">
        <h1 className="text-2xl uppercase">Nincs ilyen termék</h1>
        {sf && <Link to={`/b/${sf.slug}`} className="underline text-sm">Vissza a márka oldalára</Link>}
      </div>
    </div>
  );

  const css = { background: sf.bg_color, color: sf.text_color, fontFamily: sf.font_body, minHeight: "100vh" };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || sf.tagline,
    image: seo.image ? [seo.image] : undefined,
    brand: { "@type": "Brand", name: sf.display_name },
    offers: {
      "@type": "Offer",
      url: seo.url,
      priceCurrency: "HUF",
      price: product.price_huf,
      availability: product.stock_qty > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div style={css}>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.url} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.url} />
        {seo.image && <meta property="og:image" content={seo.image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <header className="border-b" style={{ borderColor: `${sf.text_color}20` }}>
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to={`/b/${sf.slug}`} className="flex items-center gap-2 text-sm uppercase tracking-widest">
            <ArrowLeft className="h-4 w-4" /> {sf.display_name}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square bg-black/20 border" style={{ borderColor: `${sf.text_color}20` }}>
            {product.images?.[activeImg] ? (
              <MediaImage bucket="partner-product-images" path={product.images[activeImg]} className="w-full h-full object-cover" />
            ) : <div className="flex items-center justify-center h-full opacity-30"><ShoppingBag className="h-16 w-16" /></div>}
          </div>
          {product.images?.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-2">
              {product.images.map((p: string, i: number) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square border ${activeImg === i ? "border-2" : ""}`} style={{ borderColor: activeImg === i ? sf.accent_color : `${sf.text_color}20` }}>
                  <MediaImage bucket="partner-product-images" path={p} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-widest" style={{ fontFamily: sf.font_heading }}>{product.title}</h1>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold" style={{ color: sf.accent_color }}>{product.price_huf.toLocaleString("hu-HU")} Ft</span>
            {product.compare_price_huf && <span className="line-through opacity-50">{product.compare_price_huf.toLocaleString("hu-HU")} Ft</span>}
          </div>
          {product.description && <p className="opacity-80 whitespace-pre-wrap">{product.description}</p>}
          <div className="text-xs opacity-60 space-y-1">
            {product.material && <div>Anyag: {product.material}</div>}
            {product.origin_country && <div>Származás: {product.origin_country}</div>}
            <div>Készlet: {product.stock_qty > 0 ? `${product.stock_qty} db` : "Elfogyott"}</div>
          </div>
          <button
            onClick={() => toast({ title: "Hamarosan", description: "A checkout funkció a következő frissítésben érkezik." })}
            disabled={product.stock_qty <= 0}
            className="w-full py-4 uppercase tracking-widest font-bold border-2 disabled:opacity-30"
            style={{ borderColor: sf.accent_color, color: sf.accent_color }}
          >
            {product.stock_qty > 0 ? "Kosárba" : "Elfogyott"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandProductDetail;
