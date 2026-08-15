// Jogosultsági réteg a tranzakciós e-mail végponthoz.
// Célja: anon spam, spoofing, arbitrary recipient injection és költséggenerálás megakadályozása.
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type EmailAuthResult =
  | { ok: true; caller: 'service' | 'admin' | 'self' | 'public'; userId?: string }
  | { ok: false; status: number; error: string }

/** Konstans idejű összehasonlítás */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Publikus (bejelentkezés nélküli) sablonok. Csak akkor engedélyezettek, ha a
 * címzett e-mail cím bizonyíthatóan szerepel a hozzá tartozó, frissen létrehozott
 * rekordban — így tetszőleges címzett nem adható meg.
 */
const PUBLIC_TEMPLATES: Record<string, { table: string; column: string }> = {
  'contact-confirmation': { table: 'contact_messages', column: 'email' },
  'giveaway-thanks': { table: 'giveaway_entries', column: 'email' },
}

/** Egyszerű, izolátumon belüli rate limit az anonim (publikus) ághoz. */
const buckets = new Map<string, { count: number; reset: number }>()
function anonRateLimited(req: Request, limit = 5, windowMs = 60_000): boolean {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  const now = Date.now()
  const entry = buckets.get(ip)
  if (!entry || entry.reset < now) {
    buckets.set(ip, { count: 1, reset: now + windowMs })
    return false
  }
  entry.count += 1
  return entry.count > limit
}

export async function authorizeEmailSend(
  req: Request,
  params: { templateName: string; recipient: string; admin: SupabaseClient },
): Promise<EmailAuthResult> {
  const { templateName, recipient, admin } = params
  const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const normalizedRecipient = recipient.toLowerCase()

  if (!bearer) return { ok: false, status: 401, error: 'Hitelesítés szükséges' }

  // 1) Belső service_role hívás (edge függvények, cron)
  if (serviceKey && safeEqual(bearer, serviceKey)) return { ok: true, caller: 'service' }

  // 2) Felhasználói JWT
  if (!safeEqual(bearer, anonKey)) {
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const anon = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, {
        auth: { persistSession: false },
      })
      const { data } = await anon.auth.getUser(bearer)
      userId = data?.user?.id ?? null
      userEmail = data?.user?.email?.toLowerCase() ?? null
    } catch {
      userId = null
    }

    if (!userId) return { ok: false, status: 401, error: 'Érvénytelen hitelesítési token' }

    if (userEmail && userEmail === normalizedRecipient) {
      return { ok: true, caller: 'self', userId }
    }

    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' })
    if (isAdmin) return { ok: true, caller: 'admin', userId }

    return { ok: false, status: 403, error: 'Nincs jogosultság más címzettnek e-mailt küldeni' }
  }

  // 3) Anonim (publishable kulcs) — csak publikus sablon + bizonyított címzett
  const publicRule = PUBLIC_TEMPLATES[templateName]
  if (!publicRule) return { ok: false, status: 401, error: 'Hitelesítés szükséges' }

  if (anonRateLimited(req)) {
    return { ok: false, status: 429, error: 'Túl sok kérés, próbáld később' }
  }

  const { data: proof, error } = await admin
    .from(publicRule.table)
    .select('id')
    .ilike(publicRule.column, normalizedRecipient)
    .gte('created_at', new Date(Date.now() - 15 * 60_000).toISOString())
    .limit(1)
    .maybeSingle()

  if (error || !proof) {
    return { ok: false, status: 403, error: 'A címzett nem hitelesíthető ehhez a sablonhoz' }
  }

  return { ok: true, caller: 'public' }
}
