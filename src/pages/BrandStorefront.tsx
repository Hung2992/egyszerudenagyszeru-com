import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Instagram, Music2, Facebook, Youtube, ShoppingBag } from "lucide-react";
import MediaImage from "@/components/partner/MediaImage";

const BrandStorefront = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sf, setSf] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: store } = await supabase.from("partner_storefronts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
      if (!alive) return;
      if (!store) { setNotFound(true); setLoading(false); return; }
      setSf(store);
      const { data: prods } = await supabase.from("partner_products").select("*").eq("partner_id", store.partner_id).eq("status", "active").order("created_at", { ascending: false });
      if (!alive) return;
      setProducts(prods || []);
      setLoading(false);

      // SEO
      document.title = store.meta_title || store.display_name;
      const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
      meta.setAttribute("name", "description");
      meta.setAttribute("content", store.meta_description || store.tagline || "");
      document.head.appendChild(meta);
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Betöltés…</div>;
  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold uppercase">Nincs ilyen márka</h1>
        <p className="text-sm opacity-70">A keresett storefront nem található vagy nincs publikálva.</p>
        <Link to="/" className="underline text-sm">Vissza a főoldalra</Link>
      </div>
    </div>
  );

  const css = {
    "--brand-bg": sf.bg_color, "--brand-text": sf.text_color,
    "--brand-primary": sf.primary_color, "--brand-accent": sf.accent_color,
    background: sf.bg_color, color: sf.text_color,
    fontFamily: sf.font_body,
  } as React.CSSProperties;

  const headingStyle = { fontFamily: sf.font_heading };

  return (
    <div className="min-h-screen" style={css}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: `${sf.text_color}20` }}>
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to={`/b/${sf.slug}`} className="flex items-center gap-3">
            {sf.logo_url && <MediaImage bucket="partner-storefront-media" path={sf.logo_url} className="h-10 w-10 object-contain" />}
            <span className="font-bold uppercase tracking-widest text-lg" style={headingStyle}>{sf.display_name}</span>
          </Link>
          <div className="flex items-center gap-3">
            {sf.instagram_url && <a href={sf.instagram_url} target="_blank" rel="noreferrer"><Instagram className="h-5 w-5" /></a>}
            {sf.tiktok_url && <a href={sf.tiktok_url} target="_blank" rel="noreferrer"><Music2 className="h-5 w-5" /></a>}
            {sf.facebook_url && <a href={sf.facebook_url} target="_blank" rel="noreferrer"><Facebook className="h-5 w-5" /></a>}
            {sf.youtube_url && <a href={sf.youtube_url} target="_blank" rel="noreferrer"><Youtube className="h-5 w-5" /></a>}
          </div>
        </div>
      </header>

      {/* Hero */}
      {(sf.hero_title || sf.hero_image_url) && (
        <section className="relative">
          {sf.hero_image_url && (
            <div className="absolute inset-0 opacity-40">
              <MediaImage bucket="partner-storefront-media" path={sf.hero_image_url} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="relative mx-auto max-w-6xl px-4 py-24 text-center">
            <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-widest" style={headingStyle}>{sf.hero_title || sf.display_name}</h1>
            {sf.hero_subtitle && <p className="mt-4 text-lg opacity-80 max-w-2xl mx-auto">{sf.hero_subtitle}</p>}
            {sf.tagline && !sf.hero_subtitle && <p className="mt-4 text-lg opacity-80">{sf.tagline}</p>}
            <a href="#termekek" className="inline-block mt-8 px-8 py-3 uppercase tracking-widest font-bold border-2" style={{ borderColor: sf.accent_color, color: sf.accent_color }}>
              {sf.hero_cta_text || "Vásárolj most"}
            </a>
          </div>
        </section>
      )}

      {/* Termékek */}
      <section id="termekek" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold uppercase tracking-widest mb-8 text-center" style={headingStyle}>Termékek</h2>
        {products.length === 0 ? (
          <p className="text-center opacity-60">Hamarosan érkeznek a termékek.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => (
              <Link key={p.id} to={`/b/${sf.slug}/termek/${p.slug}`} className="group block border" style={{ borderColor: `${sf.text_color}20` }}>
                <div className="aspect-square overflow-hidden bg-black/20">
                  {p.images?.[0] ? (
                    <MediaImage bucket="partner-product-images" path={p.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : <div className="flex items-center justify-center h-full opacity-30"><ShoppingBag className="h-12 w-12" /></div>}
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm uppercase tracking-wider line-clamp-1" style={headingStyle}>{p.title}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-bold" style={{ color: sf.accent_color }}>{p.price_huf.toLocaleString("hu-HU")} Ft</span>
                    {p.compare_price_huf && <span className="text-xs line-through opacity-50">{p.compare_price_huf.toLocaleString("hu-HU")} Ft</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* About */}
      {sf.about_html && (
        <section className="mx-auto max-w-3xl px-4 py-16 border-t" style={{ borderColor: `${sf.text_color}20` }}>
          <h2 className="text-2xl font-bold uppercase tracking-widest mb-6 text-center" style={headingStyle}>Rólunk</h2>
          <div className="prose prose-invert mx-auto" dangerouslySetInnerHTML={{ __html: sf.about_html }} />
        </section>
      )}

      {/* Footer */}
      <footer className="border-t mt-16" style={{ borderColor: `${sf.text_color}20` }}>
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-xs opacity-60">
          <div>© {new Date().getFullYear()} {sf.display_name}</div>
          <Link to="/" className="underline">Powered by Egyszerű de Nagyszerű</Link>
        </div>
      </footer>
    </div>
  );
};

export default BrandStorefront;
