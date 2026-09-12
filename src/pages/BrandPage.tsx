import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { ArrowLeft } from "lucide-react";
import { getPartnerSlugFromHostname, resolveCustomDomainSlug } from "@/lib/partner-subdomain";

// AI-val generált partner aloldal publikus megjelenítése: /b/:slug/oldal/:pageSlug
const BrandPage = () => {
  const params = useParams<{ slug: string; pageSlug: string }>();
  const [search] = useSearchParams();
  const isPreview = !!search.get("preview");

  const [resolvedSlug, setResolvedSlug] = useState<string | null>(
    params.slug || getPartnerSlugFromHostname()
  );
  const [sf, setSf] = useState<any>(null);
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (resolvedSlug) return;
    (async () => {
      const s = await resolveCustomDomainSlug();
      if (s) setResolvedSlug(s);
      else setNotFound(true);
    })();
  }, [resolvedSlug]);

  useEffect(() => {
    if (!resolvedSlug || !params.pageSlug) return;
    let alive = true;
    (async () => {
      let q = supabase.from("partner_storefronts").select("*").eq("slug", resolvedSlug);
      if (!isPreview) q = q.eq("is_published", true);
      const { data: store } = await q.maybeSingle();
      if (!alive) return;
      if (!store) { setNotFound(true); setLoading(false); return; }
      setSf(store);

      let pq = supabase.from("partner_pages").select("*")
        .eq("partner_id", store.partner_id)
        .eq("slug", params.pageSlug);
      if (!isPreview) pq = pq.eq("is_published", true);
      const { data: pg } = await pq.maybeSingle();
      if (!alive) return;
      if (!pg) { setNotFound(true); setLoading(false); return; }
      setPage(pg);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [resolvedSlug, params.pageSlug, isPreview]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: sf?.bg_color || "#0a0a0a", color: sf?.text_color || "#fff" }}>
        <div className="text-xs uppercase tracking-widest animate-pulse">Betöltés…</div>
      </div>
    );
  }

  if (notFound || !sf || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#0a0a0a", color: "#fff" }}>
        <div className="text-2xl font-bold uppercase">Nincs ilyen oldal</div>
        <Link to="/" className="text-sm underline opacity-70">Vissza a főoldalra</Link>
      </div>
    );
  }

  const bg = sf.bg_color || "#0a0a0a";
  const text = sf.text_color || "#ffffff";
  const accent = sf.accent_color || "#D4AF37";
  const backUrl = params.slug ? `/b/${params.slug}` : "/";
  const pageBody = String(page.content_html || page.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const pageDescription = (page.meta_description
    || (pageBody ? pageBody.slice(0, 157) + (pageBody.length > 157 ? "…" : "") : `${page.title} – ${sf.display_name}`)).slice(0, 160);

  return (
    <div className="min-h-screen" style={{ background: bg, color: text, fontFamily: sf.font_body || "Inter, sans-serif" }}>
      <Helmet>
        <title>{page.meta_title || page.title} | {sf.display_name}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={storePageUrl(sf, page.slug)} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={page.meta_title || page.title} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={storePageUrl(sf, page.slug)} />
      </Helmet>

      <header className="border-b" style={{ borderColor: `${text}22` }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={backUrl} className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80 hover:opacity-100">
            <ArrowLeft className="h-4 w-4" /> {sf.display_name}
          </Link>
          <Link to={backUrl} className="text-xs uppercase tracking-widest px-3 py-2 border" style={{ borderColor: accent, color: accent }}>
            Webshop
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight mb-10" style={{ fontFamily: sf.font_heading || "Space Grotesk, sans-serif" }}>
          {page.title}
        </h1>
        <article
          className="prose prose-invert max-w-none leading-relaxed space-y-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:opacity-80"
          style={{ ["--tw-prose-links" as any]: accent }}
          dangerouslySetInnerHTML={{ __html: page.content_html }}
        />
      </main>

      <footer className="border-t mt-16" style={{ borderColor: `${text}22` }}>
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs opacity-70">
          <span>© {new Date().getFullYear()} {sf.display_name}</span>
          <Link to={backUrl} className="underline">Vissza a webshopba</Link>
        </div>
      </footer>
    </div>
  );
};

export default BrandPage;
