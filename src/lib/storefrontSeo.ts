// Központi SEO URL segédfüggvények a partner boltokhoz.
// Fontos: a Lovable-en nincs wildcard aldomain, ezért saját domain hiányában
// a kanonikus URL a valós /b/:slug útvonal a fő domainen.

const PLATFORM_ORIGIN = "https://egyszerudenagyszeru.com";

export function storeBaseUrl(sf: { slug: string; custom_domain?: string | null; domain_status?: string | null }) {
  const domain = (sf.custom_domain || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const verified = !sf.domain_status || ["active", "verified", "connected"].includes(String(sf.domain_status));
  if (domain && verified) return `https://${domain}`;
  return `${PLATFORM_ORIGIN}/b/${sf.slug}`;
}

export function storeProductUrl(sf: Parameters<typeof storeBaseUrl>[0], productSlug: string) {
  return `${storeBaseUrl(sf)}/termek/${productSlug}`;
}

export function storePageUrl(sf: Parameters<typeof storeBaseUrl>[0], pageSlug: string) {
  return `${storeBaseUrl(sf)}/oldal/${pageSlug}`;
}

/** Publikus storage URL egy bucket + path párosra (abszolút, közösségi megosztáshoz is jó). */
export function publicStorageUrl(bucket: string, path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;
}

/** Rövid, keresőbarát leírás összerakása, ha nincs kézzel megadott. */
export function buildProductDescription(opts: {
  title: string;
  description?: string | null;
  priceHuf?: number | null;
  storeName: string;
  category?: string | null;
  inStock?: boolean;
}) {
  const manual = (opts.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (manual.length >= 60) return manual.slice(0, 157) + (manual.length > 157 ? "…" : "");
  const price = typeof opts.priceHuf === "number" ? `${opts.priceHuf.toLocaleString("hu-HU")} Ft` : null;
  const parts = [
    `${opts.title}${opts.category ? ` – ${opts.category}` : ""}`,
    price ? `Ár: ${price}` : null,
    opts.inStock === false ? "Jelenleg nincs készleten" : "Raktáron, gyors szállítás",
    `Rendeld meg a ${opts.storeName} webáruházból.`,
  ].filter(Boolean);
  const text = (manual ? manual + " " : "") + parts.join(" · ");
  return text.slice(0, 157) + (text.length > 157 ? "…" : "");
}
