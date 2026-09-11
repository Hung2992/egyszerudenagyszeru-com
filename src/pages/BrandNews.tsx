import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { ArrowLeft } from "lucide-react";
import { getPartnerSlugFromHostname, resolveCustomDomainSlug } from "@/lib/partner-subdomain";

// Partner hírek: /b/:slug/hirek és /b/:slug/hirek/:postSlug
const BrandNews = () => {
  const params = useParams<{ slug: string; postSlug?: string }>();
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(
    params.slug || getPartnerSlugFromHostname()
  );
  const [sf, setSf] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [post, setPost] = useState<any>(null);
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
    if (!resolvedSlug) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: store } = await supabase
        .from("partner_storefronts")
        .select("*")
        .eq("slug", resolvedSlug)
        .eq("is_published", true)
        .maybeSingle();
      if (!alive) return;
      if (!store) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setSf(store);

      if (params.postSlug) {
        const { data: p } = await supabase
          .from("partner_email_blasts")
          .select("*")
          .eq("partner_id", store.partner_id)
          .eq("slug", params.postSlug)
          .eq("published_on_site", true)
          .maybeSingle();
        if (!alive) return;
        if (!p) setNotFound(true);
        setPost(p);
      } else {
        const { data: list } = await supabase
          .from("partner_email_blasts")
          .select("id, subject, excerpt, slug, published_at, created_at")
          .eq("partner_id", store.partner_id)
          .eq("published_on_site", true)
          .order("published_at", { ascending: false })
          .limit(50);
        if (!alive) return;
        setPosts(list || []);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [resolvedSlug, params.postSlug]);

  const bg = sf?.bg_color || "#0a0a0a";
  const fg = sf?.text_color || "#ffffff";
  const accent = sf?.accent_color || "#d4af37";
  const brand = sf?.brand_name || sf?.store_name || "Hírek";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg, color: fg }}>
        <div className="text-xs uppercase tracking-widest animate-pulse">Betöltés…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: bg, color: fg }}>
        <h1 className="text-xl font-bold">Nincs ilyen hír</h1>
        <Link to={`/b/${resolvedSlug ?? ""}`} className="underline text-sm">
          Vissza a webshopba
        </Link>
      </div>
    );
  }

  const title = post ? `${post.subject} – ${brand}` : `Hírek – ${brand}`;
  const description = (post?.excerpt || posts[0]?.excerpt || `${brand} friss hírei és ajánlatai.`).slice(0, 155);

  return (
    <div className="min-h-screen" style={{ background: bg, color: fg }}>
      <Helmet>
        <title>{title.slice(0, 60)}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title.slice(0, 60)} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={post ? "article" : "website"} />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          to={post ? `/b/${resolvedSlug}/hirek` : `/b/${resolvedSlug}`}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-8 opacity-80 hover:opacity-100"
        >
          <ArrowLeft className="h-4 w-4" /> {post ? "Összes hír" : "Vissza a webshopba"}
        </Link>

        {post ? (
          <article className="space-y-4">
            <h1 className="text-3xl font-bold" style={{ color: accent }}>
              {post.subject}
            </h1>
            {post.published_at && (
              <p className="text-xs opacity-70">
                {new Date(post.published_at).toLocaleDateString("hu-HU")}
              </p>
            )}
            {post.excerpt && <p className="text-lg opacity-90">{post.excerpt}</p>}
            <div className="whitespace-pre-wrap leading-relaxed opacity-90">
              {String(post.body_html || "").replace(/<[^>]+>/g, " ")}
            </div>
          </article>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-6" style={{ color: accent }}>
              Hírek
            </h1>
            {posts.length === 0 && <p className="opacity-70">Még nincs közzétett hír.</p>}
            <div className="space-y-4">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  to={`/b/${resolvedSlug}/hirek/${p.slug}`}
                  className="block border p-4 hover:opacity-90"
                  style={{ borderColor: `${accent}55` }}
                >
                  <div className="text-lg font-semibold">{p.subject}</div>
                  {p.excerpt && <div className="text-sm opacity-80 mt-1">{p.excerpt}</div>}
                  <div className="text-xs opacity-60 mt-2">
                    {new Date(p.published_at || p.created_at).toLocaleDateString("hu-HU")}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BrandNews;
