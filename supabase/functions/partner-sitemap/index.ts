// Cached, dynamic sitemap per partner storefront.
// GET /functions/v1/partner-sitemap?slug=<slug>  OR  ?domain=<custom_domain>
// Optional: &warm=1 to force regenerate (used by cron).
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function generateXml(sf: any) {
  const { data: prods } = await supabase
    .from("partner_products")
    .select("slug, updated_at")
    .eq("partner_id", sf.partner_id)
    .eq("status", "active");

  const base = sf.custom_domain
    ? `https://${sf.custom_domain}`
    : `https://${sf.slug}.egyszerudenagyszeru.com`;

  const lastmod = (d?: string) => d ? `    <lastmod>${d.split("T")[0]}</lastmod>\n` : "";
  const urls: string[] = [];
  urls.push(`  <url>\n    <loc>${base}/</loc>\n${lastmod(sf.updated_at)}    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`);
  for (const p of prods || []) {
    urls.push(`  <url>\n    <loc>${base}/termek/${p.slug}</loc>\n${lastmod(p.updated_at)}    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

async function etagOf(s: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return `"${Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16)}"`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.toLowerCase();
  const domain = url.searchParams.get("domain")?.toLowerCase();
  const warm = url.searchParams.get("warm") === "1";

  if (!slug && !domain && !warm) {
    return new Response("missing slug or domain", { status: 400, headers: corsHeaders });
  }

  // Warm-all: regenerate cache for every published storefront (cron).
  if (warm && !slug && !domain) {
    const { data: all } = await supabase
      .from("partner_storefronts")
      .select("id, slug, partner_id, custom_domain, updated_at")
      .eq("is_published", true);
    let n = 0;
    for (const sf of all || []) {
      const xml = await generateXml(sf);
      const etag = await etagOf(xml);
      await supabase.from("partner_sitemap_cache").upsert({
        storefront_id: sf.id, xml, etag, generated_at: new Date().toISOString(), hit_count: 0,
      });
      n++;
    }
    return new Response(JSON.stringify({ regenerated: n }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let q = supabase.from("partner_storefronts").select("id, slug, partner_id, custom_domain, updated_at").eq("is_published", true);
  if (slug) q = q.eq("slug", slug);
  else if (domain) q = q.eq("custom_domain", domain);
  const { data: sf } = await q.maybeSingle();
  if (!sf) return new Response("not found", { status: 404, headers: corsHeaders });

  // Try cache.
  if (!warm) {
    const { data: cached } = await supabase
      .from("partner_sitemap_cache")
      .select("xml, etag, generated_at")
      .eq("storefront_id", sf.id)
      .maybeSingle();
    if (cached && (Date.now() - new Date(cached.generated_at).getTime()) < CACHE_TTL_MS) {
      // bump hit count (best-effort)
      await supabase.rpc("increment_sitemap_hit", { sid: sf.id }).then(() => {}).catch(() => {});
      const inm = req.headers.get("If-None-Match");
      if (inm && inm === cached.etag) {
        return new Response(null, {
          status: 304,
          headers: { ...corsHeaders, ETag: cached.etag, "Cache-Control": "public, max-age=3600" },
        });
      }
      return new Response(cached.xml, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          ETag: cached.etag,
          "X-Cache": "HIT",
        },
      });
    }
  }

  // Generate fresh + store.
  const xml = await generateXml(sf);
  const etag = await etagOf(xml);
  await supabase.from("partner_sitemap_cache").upsert({
    storefront_id: sf.id, xml, etag, generated_at: new Date().toISOString(), hit_count: 0,
  });

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      ETag: etag,
      "X-Cache": "MISS",
    },
  });
});
