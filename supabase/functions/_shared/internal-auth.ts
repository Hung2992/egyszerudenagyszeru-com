// Közös hitelesítési réteg belső (cron / service) és admin hívásokhoz.
// Használat:
//   const guard = await requireInternalOrAdmin(req);
//   if (!guard.ok) return guard.response;
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const deny = (msg: string, status = 401) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export type GuardResult =
  | { ok: true; caller: "cron" | "service" | "admin"; userId?: string }
  | { ok: false; response: Response };

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** Konstans idejű összehasonlítás */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function cronSecret(): Promise<string | null> {
  const envSecret = Deno.env.get("INTERNAL_CRON_SECRET");
  if (envSecret) return envSecret;
  try {
    const { data } = await serviceClient()
      .from("internal_cron_config")
      .select("value")
      .eq("key", "internal_function_secret")
      .maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Csak belső hívó (pg_cron a megosztott titokkal, vagy service_role kulcs),
 * illetve bejelentkezett admin engedélyezett.
 */
export async function requireInternalOrAdmin(req: Request): Promise<GuardResult> {
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  // 1) service_role kulcs
  if (bearer && serviceKey && safeEqual(bearer, serviceKey)) {
    return { ok: true, caller: "service" };
  }

  // 2) cron megosztott titok
  const headerSecret = req.headers.get("x-cron-secret") || req.headers.get("X-Cron-Secret") || "";
  if (headerSecret) {
    const expected = await cronSecret();
    if (expected && safeEqual(headerSecret, expected)) return { ok: true, caller: "cron" };
    return { ok: false, response: deny("Érvénytelen belső titok", 403) };
  }

  // 3) admin JWT
  if (bearer) {
    try {
      const anon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { auth: { persistSession: false } },
      );
      const { data } = await anon.auth.getUser(bearer);
      if (data?.user) {
        const { data: isAdmin } = await serviceClient().rpc("has_role", {
          _user_id: data.user.id,
          _role: "admin",
        });
        if (isAdmin) return { ok: true, caller: "admin", userId: data.user.id };
        return { ok: false, response: deny("Adminisztrátori jogosultság szükséges", 403) };
      }
    } catch {
      /* ignore */
    }
  }

  return { ok: false, response: deny("Hitelesítés szükséges", 401) };
}

/** Egyszerű, memóriában tartott rate limit publikus végpontokhoz. */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(req: Request, opts: { limit: number; windowMs: number; key?: string }): Response | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const bucketKey = `${opts.key || "default"}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(bucketKey);
  if (!entry || entry.reset < now) {
    buckets.set(bucketKey, { count: 1, reset: now + opts.windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count > opts.limit) {
    return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld később" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((entry.reset - now) / 1000)) },
    });
  }
  return null;
}

/** Elosztott (adatbázis-alapú) rate limit — izolátumok között is működik. */
export async function rateLimitDb(
  req: Request,
  opts: { limit: number; windowSeconds: number; key?: string },
): Promise<Response | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const bucketKey = `${opts.key || "default"}:${ip}`;
  try {
    const { data, error } = await serviceClient().rpc("hit_rate_limit", {
      _key: bucketKey,
      _limit: opts.limit,
      _window_seconds: opts.windowSeconds,
    });
    if (error) return null; // hiba esetén ne blokkoljuk a forgalmat
    if (data === false) {
      return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld később" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(opts.windowSeconds) },
      });
    }
    return null;
  } catch {
    return null;
  }
}
