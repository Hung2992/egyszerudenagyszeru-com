// The app's own sites. Redirects/returns built from caller input must use one of these.
const PROJECT_ID = "25064323-c063-4c5b-978a-bc7256077fc1";
export const DEFAULT_APP_ORIGIN = "https://egyszerudenagyszeru.com";

export function isAppOrigin(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "egyszerudenagyszeru.com" || h === "www.egyszerudenagyszeru.com") return true;
    if (h === "egyszerudenagyszeru-com.lovable.app") return true;
    if ((h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com")) && h.includes(PROJECT_ID)) return true;
    return false;
  } catch { return false; }
}

/** Returns the caller's origin when it is one of the app's sites, else the primary domain. */
export function appOrigin(raw: unknown): string {
  return isAppOrigin(raw) ? new URL(raw as string).origin : DEFAULT_APP_ORIGIN;
}
