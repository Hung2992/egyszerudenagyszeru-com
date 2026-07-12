/**
 * Egyszerű böngésző-alapú fingerprint hash. Nem replaces professional
 * fingerprintjs-t, de elég a duplikáció-detektáláshoz drop-oknál.
 * Csak nem-érzékeny adatokat használ.
 */
export async function generateBrowserFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "server";
  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency ?? 0,
    (navigator as any).deviceMemory ?? 0,
    navigator.platform,
  ].join("||");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export function getOrCreateDropSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let sid = sessionStorage.getItem("drop_session_id");
    if (!sid) {
      sid = `drop_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("drop_session_id", sid);
    }
    return sid;
  } catch {
    return "no_storage";
  }
}
