// URL builders for partner storefront preview / public / publish links.
// Centralized so navigation can't silently regress to the main site.

export type StorefrontState = {
  slug?: string | null;
  is_published?: boolean | null;
  custom_domain?: string | null;
  custom_domain_status?: string | null; // 'verified' etc.
};

const BASE_ROOT = "egyszerudenagyszeru.com";

/** Internal editor preview URL — always works, regardless of published state. */
export const buildPreviewUrl = (origin: string, sf: StorefrontState): string | null => {
  if (!sf?.slug) return null;
  return `${origin}/b/${sf.slug}?preview=editor`;
};

/** Public-facing URL the partner should share. Prefers verified custom domain → subdomain → path. */
export const buildPublicUrl = (origin: string, sf: StorefrontState): string | null => {
  if (!sf?.slug) return null;
  if (sf.is_published) {
    if (sf.custom_domain && sf.custom_domain_status === "verified") {
      return `https://${sf.custom_domain}`;
    }
    return `https://${sf.slug}.${BASE_ROOT}`;
  }
  // Not published yet — fall back to internal preview so the link never points to the main site.
  return buildPreviewUrl(origin, sf);
};

/** Where to navigate after the partner clicks "Publikálás kérése". */
export const buildPostPublishRedirectUrl = (origin: string, sf: StorefrontState): string | null =>
  buildPreviewUrl(origin, sf);
