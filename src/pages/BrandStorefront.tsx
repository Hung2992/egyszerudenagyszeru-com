import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Instagram, Music2, Facebook, Youtube, ShoppingBag, Flame, Star, ArrowRight, Eye } from "lucide-react";
import MediaImage from "@/components/partner/MediaImage";
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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

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
    const url = sf.custom_domain
      ? `https://${sf.custom_domain}/`
      : `https://${sf.slug}.egyszerudenagyszeru.com/`;
    return { title: title.slice(0, 60), description: description.slice(0, 160), url, keywords: kws };
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
      <header className="border-b" style={{ borderColor: borderCol }}>
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
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

      {/* HERO */}
      <section className={`relative ${sf.hero_layout === "fullscreen" ? "min-h-[90vh]" : "min-h-[60vh]"} flex items-center overflow-hidden`}>
        {sf.hero_image_url && (
          <div className="absolute inset-0">
            <MediaImage bucket="partner-storefront-media" path={sf.hero_image_url} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: sf.bg_color, opacity: Number(sf.hero_overlay_opacity ?? 0.5) }} />
          </div>
        )}
        <div className={`relative mx-auto w-full max-w-6xl px-5 py-20 ${sf.hero_layout === "center" ? "text-center" : ""}`}>
          <div className={sf.hero_layout === "center" ? "max-w-2xl mx-auto" : "max-w-lg"}>
            {sf.hero_badge_enabled && sf.hero_badge_text && (
              <div className="inline-flex items-center gap-2 border px-4 py-1.5 mb-6" style={{ borderColor: sf.accent_color, background: `${sf.accent_color}20` }}>
                <Flame className="h-3.5 w-3.5" style={{ color: sf.accent_color }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: sf.accent_color }}>
                  {sf.hero_badge_text}
                </span>
              </div>
            )}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.9]" style={headingStyle}>
              {sf.hero_title || sf.display_name}
            </h1>
            {(sf.hero_subtitle || sf.tagline) && (
              <p className="mt-5 text-sm md:text-base opacity-80 leading-relaxed max-w-md">
                {sf.hero_subtitle || sf.tagline}
              </p>
            )}
            <a href="#termekek" className="inline-flex items-center gap-2 mt-8 px-8 py-3 uppercase tracking-widest font-bold" style={{ background: sf.accent_color, color: sf.bg_color }}>
              {sf.hero_cta_text || "Vásárolj most"} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

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
        <section className="mx-auto max-w-6xl px-4 py-16 border-t" style={{ borderColor: borderCol }}>
          <h2 className="text-3xl font-bold uppercase tracking-widest mb-8 text-center" style={headingStyle}>{sf.featured_products_title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map(p => (
              <Link key={p.id} to={`/b/${sf.slug}/termek/${p.slug}`} className="group block border" style={{ borderColor: borderCol }}>
                <div className="aspect-square overflow-hidden bg-black/20">
                  {p.images?.[0] ? <MediaImage bucket="partner-product-images" path={p.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="flex items-center justify-center h-full opacity-30"><ShoppingBag className="h-12 w-12" /></div>}
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm uppercase tracking-wider line-clamp-1" style={headingStyle}>{p.title}</div>
                  <div className="font-bold mt-1" style={{ color: sf.accent_color }}>{p.price_huf.toLocaleString("hu-HU")} Ft</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ALL PRODUCTS */}
      <section id="termekek" className="mx-auto max-w-6xl px-4 py-16 border-t" style={{ borderColor: borderCol }}>
        <h2 className="text-3xl font-bold uppercase tracking-widest mb-8 text-center" style={headingStyle}>Termékek</h2>
        {products.length === 0 ? (
          <p className="text-center opacity-60">Hamarosan érkeznek a termékek.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => (
              <Link key={p.id} to={`/b/${sf.slug}/termek/${p.slug}`} className="group block border" style={{ borderColor: borderCol }}>
                <div className="aspect-square overflow-hidden bg-black/20">
                  {p.images?.[0] ? <MediaImage bucket="partner-product-images" path={p.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="flex items-center justify-center h-full opacity-30"><ShoppingBag className="h-12 w-12" /></div>}
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
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-xs opacity-70">
          <div>© {new Date().getFullYear()} {sf.display_name}{sf.footer_text ? ` · ${sf.footer_text}` : ""}</div>
          <div className="flex gap-4">
            {footerLinks.map((l, i) => (
              <a key={i} href={l.url} target={l.url?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="underline">{l.label}</a>
            ))}
            <Link to="/" className="underline opacity-50">Powered by EDN</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BrandStorefront;
