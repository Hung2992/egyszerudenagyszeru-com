// Detects partner storefront subdomain from current hostname.
// Returns slug if hostname is like `<slug>.egyszerudenagyszeru.com` or `<slug>.edn.shop` etc.
// Returns null for apex/www/preview/localhost.

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

  // localhost / IPs / lovable preview → no partner subdomain
  if (host === "localhost" || /^[\d.]+$/.test(host)) return null;
  if (host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com")) return null;

  for (const apex of APEX_DOMAINS) {
    if (host === apex) return null;
    if (host.endsWith("." + apex)) {
      const sub = host.slice(0, -1 - apex.length);
      // only single-level subdomain (no nested)
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
