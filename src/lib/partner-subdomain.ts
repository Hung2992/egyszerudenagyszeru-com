// Detects partner storefront subdomain (or custom domain) from current hostname.
// - `<slug>.egyszerudenagyszeru.com`, `<slug>.edn.shop`, etc. → returns slug synchronously
// - Custom domain (e.g. `myshop.com`) → returns null sync; use `resolvePartnerSlugAsync` for async lookup

const APEX_DOMAINS = [
  "egyszerudenagyszeru.com",
  "edn.shop",
  "edn.hu",
  "edn.store",
];

const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "admin", "mail", "smtp", "imap", "pop", "ftp",
  "cdn", "static", "assets", "img", "media", "files",
  "app", "preview", "staging", "dev", "test", "id-preview",
  "supabase", "auth", "login",
]);

export function getPartnerSlugFromHostname(hostname?: string): string | null {
  const host = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase();
  if (!host) return null;

  if (host === "localhost" || /^[\d.]+$/.test(host)) return null;
  if (host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com")) return null;

  for (const apex of APEX_DOMAINS) {
    if (host === apex) return null;
    if (host.endsWith("." + apex)) {
      const sub = host.slice(0, -1 - apex.length);
      if (sub.includes(".")) return null;
      if (RESERVED_SUBDOMAINS.has(sub)) return null;
      if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(sub)) return null;
      return sub;
    }
  }
  return null;
}

export function getApexDomain(hostname?: string): string | null {
  const host = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase();
  for (const apex of APEX_DOMAINS) {
    if (host === apex || host.endsWith("." + apex)) return apex;
  }
  return null;
}

export function buildPartnerSubdomainUrl(slug: string, apex = "egyszerudenagyszeru.com"): string {
  return `https://${slug}.${apex}`;
}

// Async lookup for custom domain → slug
export async function resolveCustomDomainSlug(hostname?: string): Promise<string | null> {
  const host = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase();
  if (!host) return null;
  if (getApexDomain(host)) return null; // already handled by subdomain
  if (host === "localhost" || host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com")) return null;
  try {
    const { supabase } = await import("@/integrations/supabase/untyped-client");
    const { data } = await supabase
      .from("partner_storefronts")
      .select("slug")
      .eq("custom_domain", host)
      .in("custom_domain_status", ["approved", "active"])
      .maybeSingle();
    return data?.slug ?? null;
  } catch {
    return null;
  }
}
