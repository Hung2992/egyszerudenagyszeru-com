// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Includes static routes + published partner storefront landing pages.
// Per-partner dynamic sitemaps (with products) are served by the `partner-sitemap` edge function.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://egyszerudenagyszeru.com";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticPaths: SitemapEntry[] = [
  { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
  { loc: `${BASE_URL}/shop`, changefreq: "daily", priority: "0.9" },
  { loc: `${BASE_URL}/launch`, changefreq: "weekly", priority: "0.8" },
  { loc: `${BASE_URL}/community`, changefreq: "weekly", priority: "0.6" },
  { loc: `${BASE_URL}/loyalty`, changefreq: "monthly", priority: "0.6" },
  { loc: `${BASE_URL}/gift-cards`, changefreq: "monthly", priority: "0.6" },
  { loc: `${BASE_URL}/about`, changefreq: "monthly", priority: "0.5" },
  { loc: `${BASE_URL}/contact`, changefreq: "monthly", priority: "0.5" },
  { loc: `${BASE_URL}/help`, changefreq: "monthly", priority: "0.5" },
  { loc: `${BASE_URL}/size-guide`, changefreq: "monthly", priority: "0.5" },
  { loc: `${BASE_URL}/shipping`, changefreq: "monthly", priority: "0.5" },
  { loc: `${BASE_URL}/egyuttmukodes`, changefreq: "monthly", priority: "0.6" },
  { loc: `${BASE_URL}/legal`, changefreq: "yearly", priority: "0.3" },
];

async function fetchPublishedStorefronts(): Promise<SitemapEntry[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/partner_storefronts?select=slug,custom_domain,custom_domain_status,updated_at&is_published=eq.true`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return [];
    const rows: { slug: string; custom_domain?: string; custom_domain_status?: string; updated_at?: string }[] = await res.json();
    const entries: SitemapEntry[] = [];
    for (const r of rows) {
      const lastmod = r.updated_at ? r.updated_at.split("T")[0] : undefined;
      entries.push({ loc: `${BASE_URL}/b/${r.slug}`, lastmod, changefreq: "weekly", priority: "0.7" });
      entries.push({ loc: `https://${r.slug}.egyszerudenagyszeru.com/`, lastmod, changefreq: "weekly", priority: "0.7" });
      if (r.custom_domain && (r.custom_domain_status === "active" || r.custom_domain_status === "approved")) {
        entries.push({ loc: `https://${r.custom_domain}/`, lastmod, changefreq: "weekly", priority: "0.7" });
      }
    }
    return entries;
  } catch (e) {
    console.warn("[sitemap] could not fetch storefronts:", e);
    return [];
  }
}

function xml(entries: SitemapEntry[]) {
  const body = entries
    .map((e) =>
      [
        `  <url>`,
        `    <loc>${e.loc}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        `  </url>`,
      ].filter(Boolean).join("\n")
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

(async () => {
  const partners = await fetchPublishedStorefronts();
  const all = [...staticPaths, ...partners];
  writeFileSync(resolve("public/sitemap.xml"), xml(all));
  console.log(`sitemap.xml written (${all.length} entries)`);
})();
