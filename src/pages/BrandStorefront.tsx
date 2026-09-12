import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { storeBaseUrl, publicStorageUrl } from "@/lib/storefrontSeo";

import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Instagram, Music2, Facebook, Youtube, ShoppingBag, Flame, Star, ArrowRight, Eye, User, Search, Menu, X, Heart, ShieldCheck, Truck, RotateCcw, Headphones } from "lucide-react";
import { useBrandCart } from "@/lib/brand-cart";
import MediaImage from "@/components/partner/MediaImage";
import StorefrontProductCard from "@/components/partner/StorefrontProductCard";
import { Button } from "@/components/ui/button";
import { getPartnerSlugFromHostname, resolveCustomDomainSlug } from "@/lib/partner-subdomain";

const BrandStorefront = () => {
  const params = useParams<{ slug: string }>();
  const [search] = useSearchParams();
  const previewToken = search.get("preview");
  const isEditorPreview = previewToken === "editor";
  const isAdminPreview = previewToken === "admin";

  const [resolvedSlug, setResolvedSlug] = useState<string | null>(
    params.slug || getPartnerSlugFromHostname()
  );
  const [sf, setSf] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const { count: cartCount } = useBrandCart(resolvedSlug);

  // resolve custom domain → slug
  useEffect(() => {
    if (resolvedSlug) return;
    (async () => {
      const s = await resolveCustomDomainSlug();
      if (s) setResolvedSlug(s);
      else setNotFound(true);
    })();
  }, [resolvedSlug]);

  // validate share token via edge function (logs access + enforces expiry/revoke/max_uses)
  useEffect(() => {
    if (!previewToken || isEditorPreview || isAdminPreview) { setTokenValid(true); return; }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("partner-preview-access", { body: { token: previewToken } });
        setTokenValid(!error && !!(data as any)?.ok);
      } catch { setTokenValid(false); }
    })();
  }, [previewToken, isEditorPreview, isAdminPreview]);

  // load storefront
  useEffect(() => {
    if (!resolvedSlug) return;
    let alive = true;
    (async () => {
      const usePreview = isEditorPreview || isAdminPreview || (previewToken && tokenValid);
      let q = supabase.from("partner_storefronts").select("*").eq("slug", resolvedSlug);
      if (!usePreview) q = q.eq("is_published", true);
      const { data: store } = await q.maybeSingle();
      if (!alive) return;
      if (!store) { setNotFound(true); setLoading(false); return; }
      // if preview token but valid for different storefront → reject
      if (previewToken && !isEditorPreview && !isAdminPreview && tokenValid !== true) {
        setNotFound(true); setLoading(false); return;
      }
      setSf(store);
      const { data: prods } = await supabase.from("partner_products").select("*").eq("partner_id", store.partner_id).eq("status", "active").order("created_at", { ascending: false });
      if (!alive) return;
      setProducts(prods || []);
      const { data: pgs } = await supabase
        .from("partner_pages")
        .select("slug, title, sort_order")
        .eq("partner_id", store.partner_id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (!alive) return;
      setPages(pgs || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [resolvedSlug, previewToken, isEditorPreview, isAdminPreview, tokenValid]);

  // editor live preview: listen for postMessage
  useEffect(() => {
    if (!isEditorPreview) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "storefront-preview-update" && e.data.draft) {
        setSf((prev: any) => ({ ...(prev || {}), ...e.data.draft }));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isEditorPreview]);

  const featured = useMemo(() => {
    if (!sf?.featured_product_ids?.length) return [];
    const ids: string[] = sf.featured_product_ids;
    return products.filter(p => ids.includes(p.id)).slice(0, 8);
  }, [sf, products]);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => String(product.category || "").trim()).filter(Boolean))), [products]);
  const visibleProducts = useMemo(() => {
    const needle = searchTerm.trim().toLocaleLowerCase("hu-HU");
    if (!needle) return products;
    return products.filter((product) => `${product.title} ${product.description || ""} ${product.category || ""}`.toLocaleLowerCase("hu-HU").includes(needle));
  }, [products, searchTerm]);

  // SEO computed values
  const seo = useMemo(() => {
    if (!sf) return null;
    const title = sf.meta_title || `${sf.display_name}${sf.tagline ? " – " + sf.tagline : ""}`;
    const stripped = (sf.about_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const kws = Array.isArray(sf.seo_keywords) ? sf.seo_keywords.filter(Boolean).join(", ") : "";
    const autoDesc = sf.tagline
      ? `${sf.tagline}${kws ? " · " + kws : ""}`
      : stripped.slice(0, 157) + (stripped.length > 157 ? "…" : "");
    const description = sf.meta_description || autoDesc;
    const url = `${storeBaseUrl(sf)}/`;
    const image = publicStorageUrl("partner-storefront-media", sf.og_image_url || sf.hero_image_url || sf.logo_url);
    return { title: title.slice(0, 60), description: description.slice(0, 160), url, keywords: kws, image };
  }, [sf]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Betöltés…</div>;
  if (notFound) return <Navigate to="/" replace />;
  if (!sf || !seo) return null;

  const cssVars = {
    background: sf.bg_color,
    color: sf.text_color,
    fontFamily: sf.font_body,
  } as React.CSSProperties;
  const headingStyle = { fontFamily: sf.font_heading };
  const borderCol = `${sf.text_color}20`;

  const testimonials: any[] = Array.isArray(sf.testimonials) ? sf.testimonials : [];
  const footerLinks: any[] = Array.isArray(sf.footer_links) ? sf.footer_links : [];
  const socialProfiles: string[] = Array.isArray(sf.social_profiles) ? sf.social_profiles.filter(Boolean) : [];

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: sf.display_name,
    legalName: sf.company_legal_name || undefined,
    description: seo.description,
    url: seo.url,
    image: sf.logo_url ? `${seo.url}${sf.logo_url}` : undefined,
    keywords: seo.keywords || undefined,
    telephone: sf.company_phone || undefined,
    email: sf.company_email || undefined,
    taxID: sf.company_tax_id || undefined,
    foundingDate: sf.founding_year ? String(sf.founding_year) : undefined,
    address: sf.company_address ? { "@type": "PostalAddress", streetAddress: sf.company_address } : undefined,
    sameAs: Array.from(new Set([
      sf.instagram_url, sf.tiktok_url, sf.facebook_url, sf.youtube_url,
      ...socialProfiles,
    ].filter(Boolean))),
  };
  Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);

  return (
    <div className="min-h-screen" style={cssVars}>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        {seo.keywords && <meta name="keywords" content={seo.keywords} />}
        <link rel="canonical" href={seo.url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.url} />
        {seo.image && <meta property="og:image" content={seo.image} />}
        {seo.image && <meta name="twitter:image" content={seo.image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        {(isEditorPreview || isAdminPreview || previewToken) && <meta name="robots" content="noindex,nofollow" />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {(isEditorPreview || isAdminPreview || previewToken) && (
        <div className="bg-yellow-500 text-black text-center py-1 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <Eye className="h-3 w-3" /> Előnézet mód {isEditorPreview ? "(szerkesztő)" : isAdminPreview ? "(admin)" : "(megosztott link)"}
        </div>
      )}

      {/* TOPBAR */}
      {sf.topbar_enabled && sf.topbar_text && (
        <div className="text-center py-2 px-4" style={{ background: sf.accent_color, color: sf.bg_color }}>
          <p className="text-xs md:text-sm font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2">
            <Flame className="h-4 w-4" />
            {sf.topbar_text}
            <Flame className="h-4 w-4" />
          </p>
        </div>
      )}

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b bg-inherit/95 backdrop-blur-xl" style={{ borderColor: borderCol }}>
        <div className="mx-auto grid min-h-20 max-w-7xl grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(280px,1fr)] lg:px-8">
          <Button variant="ghost" size="icon" className="rounded-none lg:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Menü bezárása" : "Menü megnyitása"}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
          <Link to={`/b/${resolvedSlug}`} className="flex min-w-0 items-center justify-center gap-3 lg:justify-start">
            {sf.logo_url && <MediaImage bucket="partner-storefront-media" path={sf.logo_url} className="h-10 w-10 object-contain" />}
            <span className="truncate text-center text-base font-bold uppercase lg:text-left lg:text-lg" style={headingStyle}>{sf.display_name}</span>
          </Link>
          <nav className="hidden items-center justify-center gap-7 text-xs font-semibold uppercase lg:flex" aria-label="Webshop navigáció">
            <a href="#termekek">Termékek</a>
            {categories.slice(0, 4).map((category) => <a key={category} href={`#${category.toLocaleLowerCase("hu-HU").replace(/\s+/g, "-")}`}>{category}</a>)}
            <Link to={`/b/${resolvedSlug}/info/kapcsolat`}>Kapcsolat</Link>
          </nav>
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="hidden rounded-none sm:inline-flex" onClick={() => document.getElementById("store-search")?.focus()} aria-label="Keresés"><Search /></Button>
            <Link to={`/b/${resolvedSlug}/fiok`} className="hidden h-10 items-center gap-2 px-2 text-xs font-semibold uppercase sm:flex"><User className="h-4 w-4" /> <span className="hidden xl:inline">Fiók</span></Link>
            <Link
              to={`${params.slug ? `/b/${params.slug}/kosar` : "/kosar"}${previewToken ? `?preview=${previewToken}` : ""}`}
              className="relative flex h-10 items-center gap-2 border px-3 text-xs font-bold uppercase"
              style={{ borderColor: sf.accent_color, color: sf.accent_color }}
            >
              <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Kosár</span>{cartCount > 0 && <span>({cartCount})</span>}
            </Link>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t px-4 py-4 lg:hidden" style={{ borderColor: borderCol }}>
            <a href="#termekek" onClick={() => setMenuOpen(false)} className="block border-b py-3 text-sm font-semibold" style={{ borderColor: borderCol }}>Termékek</a>
            {categories.map((category) => <a key={category} href={`#${category.toLocaleLowerCase("hu-HU").replace(/\s+/g, "-")}`} onClick={() => setMenuOpen(false)} className="block border-b py-3 text-sm" style={{ borderColor: borderCol }}>{category}</a>)}
            <Link to={`/b/${resolvedSlug}/fiok`} className="block border-b py-3 text-sm" style={{ borderColor: borderCol }}>Fiókom</Link>
            <Link to={`/b/${resolvedSlug}/info/kapcsolat`} className="block py-3 text-sm">Kapcsolat</Link>
          </nav>
        )}
      </header>



      {/* HERO */}
      <section className={`storefront-hero relative ${sf.hero_layout === "fullscreen" ? "min-h-[min(48rem,calc(100svh-5rem))]" : "min-h-[60vh]"} flex items-end overflow-hidden`}>
        {sf.hero_image_url && (
          <div className="absolute inset-0">
            <MediaImage bucket="partner-storefront-media" path={sf.hero_image_url} alt={`${sf.display_name} nyitókép`} loading="eager" className="hero-storefront-image w-full h-full object-cover object-[62%_center] md:object-center" />
            <div className="absolute inset-0" style={{ background: sf.bg_color, opacity: Number(sf.hero_overlay_opacity ?? 0.5) }} />
            <div className="storefront-hero-shade absolute inset-0" />
          </div>
        )}
        <div className={`hero-storefront-content relative mx-auto w-full max-w-7xl px-5 pb-12 pt-32 md:px-8 md:pb-20 ${sf.hero_layout === "center" ? "text-center" : ""}`}>
          <div className={sf.hero_layout === "center" ? "max-w-2xl mx-auto" : "max-w-xl"}>
            {sf.hero_badge_enabled && sf.hero_badge_text && (
              <div className="inline-flex items-center gap-2 border px-4 py-1.5 mb-6" style={{ borderColor: sf.accent_color, background: `${sf.accent_color}20` }}>
                <Flame className="h-3.5 w-3.5" style={{ color: sf.accent_color }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: sf.accent_color }}>
                  {sf.hero_badge_text}
                </span>
              </div>
            )}
            <h1 className="storefront-hero-copy text-4xl font-bold leading-[1.04] sm:text-5xl md:text-6xl lg:text-7xl break-words hyphens-auto" style={headingStyle}>
              {sf.hero_title || sf.display_name}
            </h1>
            {(sf.hero_subtitle || sf.tagline) && (
              <p className="storefront-hero-copy mt-5 max-w-lg text-sm leading-relaxed opacity-85 md:text-lg break-words">
                {sf.hero_subtitle || sf.tagline}
              </p>
            )}
            <a href="#termekek" className="mt-8 inline-flex h-14 w-full max-w-full items-center justify-center gap-2 px-7 text-center text-xs font-bold uppercase shadow-lg sm:w-auto" style={{ background: sf.accent_color, color: sf.bg_color }}>
              {sf.hero_cta_text || "Vásárolj most"} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="border-b" style={{ borderColor: borderCol }}>
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x md:grid-cols-4" style={{ borderColor: borderCol }}>
          {[[Truck, "Gyors szállítás"], [ShieldCheck, "Biztonságos vásárlás"], [RotateCcw, "Egyszerű visszaküldés"], [Headphones, "Segítőkész ügyfélszolgálat"]].map(([Icon, label]) => {
            const TrustIcon = Icon as typeof Truck;
            return <div key={label as string} className="flex min-h-24 items-center gap-3 px-4 py-5"><TrustIcon className="h-5 w-5 shrink-0" style={{ color: sf.accent_color }} /><span className="text-xs font-semibold">{label as string}</span></div>;
          })}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase" style={{ color: sf.accent_color }}>Fedezd fel</p><h2 className="mt-2 text-3xl font-bold md:text-5xl" style={headingStyle}>Kategóriáink</h2></div><a href="#termekek" className="hidden items-center gap-2 text-sm font-semibold sm:flex">Minden termék <ArrowRight className="h-4 w-4" /></a></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {categories.slice(0, 4).map((category) => {
              const image = products.find((product) => product.category === category)?.images?.[0];
              return <a id={category.toLocaleLowerCase("hu-HU").replace(/\s+/g, "-")} key={category} href="#termekek" className="group relative aspect-[4/5] overflow-hidden bg-muted/40">
                {image && <MediaImage bucket="partner-product-images" path={image} alt={category} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                <span className="storefront-card-shade absolute inset-0" />
                <span className="storefront-hero-copy absolute inset-x-4 bottom-4 text-lg font-bold md:text-xl" style={headingStyle}>{category}</span>
              </a>;
            })}
          </div>
        </section>
      )}

      {/* SECTION 1 */}
      {sf.section1_enabled && (
        <section className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-2 gap-8 items-center">
          {sf.section1_image_url && (
            <MediaImage bucket="partner-storefront-media" path={sf.section1_image_url} className="w-full aspect-[4/3] object-cover" />
          )}
          <div>
            {sf.section1_title && <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-widest mb-4" style={headingStyle}>{sf.section1_title}</h2>}
            {sf.section1_subtitle && <p className="opacity-80 mb-6">{sf.section1_subtitle}</p>}
            {sf.section1_cta_text && (
              <a href={sf.section1_cta_url || "#termekek"} className="inline-block px-6 py-3 font-bold uppercase tracking-widest border-2" style={{ borderColor: sf.accent_color, color: sf.accent_color }}>
                {sf.section1_cta_text}
              </a>
            )}
          </div>
        </section>
      )}

      {/* SECTION 2 */}
      {sf.section2_enabled && (
        <section className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-2 gap-8 items-center">
          <div className="md:order-2">
            {sf.section2_image_url && (
              <MediaImage bucket="partner-storefront-media" path={sf.section2_image_url} className="w-full aspect-[4/3] object-cover" />
            )}
          </div>
          <div className="md:order-1">
            {sf.section2_title && <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-widest mb-4" style={headingStyle}>{sf.section2_title}</h2>}
            {sf.section2_subtitle && <p className="opacity-80 mb-6">{sf.section2_subtitle}</p>}
            {sf.section2_cta_text && (
              <a href={sf.section2_cta_url || "#termekek"} className="inline-block px-6 py-3 font-bold uppercase tracking-widest border-2" style={{ borderColor: sf.accent_color, color: sf.accent_color }}>
                {sf.section2_cta_text}
              </a>
            )}
          </div>
        </section>
      )}

      {/* FEATURED */}
      {sf.featured_products_enabled && featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20 border-t" style={{ borderColor: borderCol }}>
          <h2 className="mb-8 text-3xl font-bold md:text-5xl" style={headingStyle}>{sf.featured_products_title || "Kiemelt termékeink"}</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-6">
            {featured.map((product) => <StorefrontProductCard key={product.id} product={product} store={sf} compact />)}
          </div>
        </section>
      )}

      {/* ALL PRODUCTS */}
      <section id="termekek" className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20 border-t" style={{ borderColor: borderCol }}>
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase" style={{ color: sf.accent_color }}>Webshop</p><h2 className="mt-2 text-3xl font-bold md:text-5xl" style={headingStyle}>Termékek</h2></div>
          <label className="relative block w-full sm:max-w-sm"><span className="sr-only">Termék keresése</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" /><input id="store-search" type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Mit keresel?" className="h-12 w-full border bg-transparent pl-11 pr-4 text-sm outline-none focus:ring-2" style={{ borderColor: borderCol }} /></label>
        </div>
        {products.length === 0 ? (
          <p className="text-center opacity-60">Hamarosan érkeznek a termékek.</p>
        ) : visibleProducts.length === 0 ? (
          <div className="border py-16 text-center" style={{ borderColor: borderCol }}><Search className="mx-auto mb-3 h-7 w-7 opacity-35" /><p className="font-semibold">Nincs találat erre a keresésre.</p><button onClick={() => setSearchTerm("")} className="mt-3 text-sm underline">Keresés törlése</button></div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {visibleProducts.map((product) => <StorefrontProductCard key={product.id} product={product} store={sf} />)}
          </div>
        )}
      </section>

      {/* TESTIMONIALS */}
      {sf.testimonials_enabled && testimonials.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-16 border-t" style={{ borderColor: borderCol }}>
          <h2 className="text-3xl font-bold uppercase tracking-widest mb-8 text-center" style={headingStyle}>{sf.testimonials_title}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="border p-6" style={{ borderColor: borderCol }}>
                <div className="flex gap-1 mb-3" style={{ color: sf.accent_color }}>
                  {Array.from({ length: Number(t.rating) || 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-sm opacity-80 italic mb-4">"{t.text}"</p>
                <div className="text-xs font-bold uppercase tracking-widest">— {t.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT */}
      {sf.about_html && (
        <section className="mx-auto max-w-3xl px-4 py-16 border-t" style={{ borderColor: borderCol }}>
          <h2 className="text-2xl font-bold uppercase tracking-widest mb-6 text-center" style={headingStyle}>Rólunk</h2>
          <div className="prose prose-invert mx-auto" dangerouslySetInnerHTML={{ __html: sf.about_html }} />
        </section>
      )}

      {/* NEWSLETTER */}
      {sf.newsletter_enabled && (
        <section className="border-t" style={{ borderColor: borderCol, background: `${sf.accent_color}10` }}>
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest mb-3" style={headingStyle}>{sf.newsletter_title}</h2>
            {sf.newsletter_subtitle && <p className="opacity-80 mb-6">{sf.newsletter_subtitle}</p>}
            <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={e => { e.preventDefault(); setEmail(""); alert("Köszönjük a feliratkozást!"); }}>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@cim.hu" className="flex-1 px-4 py-3 bg-transparent border" style={{ borderColor: borderCol, color: sf.text_color }} />
              <button type="submit" className="px-6 py-3 font-bold uppercase tracking-widest" style={{ background: sf.accent_color, color: sf.bg_color }}>Feliratkozás</button>
            </form>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t mt-0" style={{ borderColor: borderCol }}>
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-28 md:pb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <span className="text-sm font-bold uppercase tracking-wider" style={headingStyle}>{sf.display_name}</span>
              {(sf.tagline || sf.footer_text) && (
                <p className="text-xs opacity-60 mt-2 leading-relaxed max-w-xs">{sf.tagline || sf.footer_text}</p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-3">Vásárlás</p>
              <nav className="flex flex-col gap-2">
                <Link to={`/b/${resolvedSlug}#termekek`} className="text-xs opacity-70 hover:opacity-100 transition-opacity">Termékek</Link>
                <Link to={`/b/${resolvedSlug}/info/szallitas-visszakuldes`} className="text-xs opacity-70 hover:opacity-100 transition-opacity">Szállítás & visszaküldés</Link>
                <Link to={`/b/${resolvedSlug}/info/merettablazat`} className="text-xs opacity-70 hover:opacity-100 transition-opacity">Mérettáblázat</Link>
                <Link to={`/b/${resolvedSlug}/kosar`} className="text-xs opacity-70 hover:opacity-100 transition-opacity">Kosár</Link>
              </nav>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-3">Ügyfélszolgálat</p>
              <nav className="flex flex-col gap-2">
                <Link to={`/b/${resolvedSlug}/info/kapcsolat`} className="text-xs opacity-70 hover:opacity-100 transition-opacity">Kapcsolat</Link>
                <Link to={`/b/${resolvedSlug}/fiok`} className="text-xs opacity-70 hover:opacity-100 transition-opacity">Fiókom</Link>
                <Link to={`/b/${resolvedSlug}/info/aszf`} className="text-xs opacity-70 hover:opacity-100 transition-opacity">ÁSZF</Link>
              </nav>
            </div>

            {(pages.length > 0 || footerLinks.length > 0) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-3">Információ</p>
                <nav className="flex flex-col gap-2">
                  {pages.map((pg) => (
                    <Link key={pg.slug} to={`/b/${resolvedSlug}/oldal/${pg.slug}`} className="text-xs opacity-70 hover:opacity-100 transition-opacity">{pg.title}</Link>
                  ))}
                  {footerLinks
                    .filter((l) => {
                      const t = String(l?.label || "").toLowerCase();
                      return !["kapcsolat", "ászf", "aszf", "visszaküld", "visszakuld", "mérettábl", "merettabl", "szállítás", "szallitas"].some(k => t.includes(k));
                    })
                    .map((l, i) => (
                      <a
                        key={i}
                        href={l.url}
                        target={l.url?.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="text-xs opacity-70 hover:opacity-100 transition-opacity"
                      >
                        {l.label}
                      </a>
                    ))}
                </nav>
              </div>
            )}
          </div>

          <div className="border-t pt-6 flex flex-col items-center gap-2 md:flex-row md:justify-between" style={{ borderColor: borderCol }}>
            <p className="text-[10px] uppercase tracking-widest opacity-50 text-center md:text-left">
              © {new Date().getFullYear()} {sf.company_legal_name || sf.display_name} — Minden jog fenntartva
            </p>
            <Link to="/" className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-70 transition-opacity">Powered by EDN</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BrandStorefront;
