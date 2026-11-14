// Kimenő HTTP-kérések védelme (SSRF): csak nyilvános internetcímre engedünk.

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIPv4(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff");
}

/** Hibát dob, ha a cím nem nyilvános http(s) cím. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Csak http(s) cím engedélyezett");
  if (u.username || u.password) throw new Error("Hitelesítő adat a címben nem engedélyezett");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("Belső cím nem engedélyezett");
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (isPrivateIPv4(host)) throw new Error("Belső cím nem engedélyezett");
    return u;
  }
  if (host.includes(":")) {
    if (isPrivateIPv6(host)) throw new Error("Belső cím nem engedélyezett");
    return u;
  }
  const [v4, v6] = await Promise.all([
    Deno.resolveDns(host, "A").catch(() => [] as string[]),
    Deno.resolveDns(host, "AAAA").catch(() => [] as string[]),
  ]);
  if (!v4.length && !v6.length) throw new Error("A cím nem oldható fel");
  if (v4.some(isPrivateIPv4) || v6.some(isPrivateIPv6)) throw new Error("Belső cím nem engedélyezett");
  return u;
}

/** fetch, amely minden átirányítási lépést is ellenőriz (max. 4). */
export async function safeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      await res.body?.cancel();
      continue;
    }
    return res;
  }
  throw new Error("Túl sok átirányítás");
}
