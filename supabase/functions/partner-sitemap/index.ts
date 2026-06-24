// Dynamic sitemap per partner storefront.
// Usage: GET /functions/v1/partner-sitemap?slug=<slug>   OR  ?domain=<custom_domain>
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.toLowerCase();
  const domain = url.searchParams.get("domain")?.toLowerCase();
  if (!slug && !domain) {
    return new Response("missing slug or domain", { status: 400, headers: corsHeaders });
  }

  let q = supabase.from("partner_storefronts").select("id, slug, partner_id, custom_domain, updated_at").eq("is_published", true);
  if (slug) q = q.eq("slug", slug);
  else if (domain) q = q.eq("custom_domain", domain);
  const { data: sf } = await q.maybeSingle();
  if (!sf) return new Response("not found", { status: 404, headers: corsHeaders });

  const { data: prods } = await supabase
    .from("partner_products")
    .select("slug, updated_at")
    .eq("partner_id", sf.partner_id)
    .eq("status", "active");

  const base = sf.custom_domain
    ? `https://${sf.custom_domain}`
    : `https://${sf.slug}.egyszerudenagyszeru.com`;

  const lastmod = (d?: string) => d ? `    <lastmod>${d.split("T")[0]}</lastmod>` : "";
  const urls: string[] = [];
  urls.push(`  <url>\n    <loc>${base}/</loc>\n${lastmod(sf.updated_at)}\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`);
  for (const p of prods || []) {
    urls.push(`  <url>\n    <loc>${base}/termek/${p.slug}</loc>\n${lastmod(p.updated_at)}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
});
