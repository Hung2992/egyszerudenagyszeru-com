// Storefront button-click + preview-open analytics + permission gating helpers.
import { supabase } from "@/integrations/supabase/untyped-client";
import type { StorefrontState } from "./partner-storefront-urls";

export type ButtonEventType =
  | "save_click"
  | "publish_request_click"
  | "preview_click"
  | "share_token_click"
  | "preview_url_open";

export type UrlType = "custom_domain" | "subdomain" | "path" | "preview_editor" | "share_token";

export const classifyUrl = (url: string | null): UrlType | null => {
  if (!url) return null;
  if (url.includes("preview=editor")) return "preview_editor";
  if (url.includes("preview=") && !url.includes("preview=admin")) return "share_token";
  if (/^https:\/\/[^/]+\.egyszerudenagyszeru\.com/.test(url)) return "subdomain";
  if (/\/b\/[^/?#]+/.test(url)) return "path";
  if (/^https?:\/\//.test(url)) return "custom_domain";
  return null;
};

export const logButtonEvent = async (params: {
  storefrontId?: string | null;
  partnerId: string;
  eventType: ButtonEventType;
  url?: string | null;
  context?: Record<string, unknown>;
}): Promise<void> => {
  try {
    await supabase.from("partner_storefront_button_events").insert({
      storefront_id: params.storefrontId ?? null,
      partner_id: params.partnerId,
      event_type: params.eventType,
      url: params.url ?? null,
      url_type: classifyUrl(params.url ?? null),
      context: params.context ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    /* analytics must never block UX */
  }
};

// ----- Permission gating -----

export type PartnerStatus = "active" | "paused" | "revoked" | "invited" | null | undefined;

export const canUsePreviewButton = (
  partnerStatus: PartnerStatus,
  isAdmin: boolean,
  sf: StorefrontState | null,
): boolean => {
  if (isAdmin) return !!sf?.slug;
  if (partnerStatus !== "active") return false;
  return !!sf?.slug;
};

export const canUsePublishButton = (
  partnerStatus: PartnerStatus,
  isAdmin: boolean,
  sf: StorefrontState | null,
): boolean => {
  if (isAdmin) return !!sf?.slug;
  if (partnerStatus !== "active") return false;
  if (!sf?.slug) return false;
  if (sf.is_published) return false; // already live → no "request" needed
  return true;
};

// ----- DNS / domain readiness for publish ------

export type DomainBlockReason = "no_domain" | "dns_unverified" | "dns_expired" | null;

export const evaluateDomainReadiness = (
  sf: (StorefrontState & {
    custom_domain_dns_last_verified_at?: string | null;
    custom_domain_dns_expires_at?: string | null;
  }) | null,
  now: Date = new Date(),
): DomainBlockReason => {
  if (!sf?.custom_domain) return "no_domain"; // not strictly a block: subdomain still works
  if (sf.custom_domain_status !== "verified") return "dns_unverified";
  if (sf.custom_domain_dns_expires_at && new Date(sf.custom_domain_dns_expires_at) < now) {
    return "dns_expired";
  }
  return null;
};
