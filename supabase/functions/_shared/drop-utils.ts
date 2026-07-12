// Közös segédek a drop edge függvényekhez
export const dropCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function dropJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...dropCors, 'Content-Type': 'application/json' },
  });
}

export async function hashString(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}

/**
 * Cloudflare Turnstile token verifikálása. Ha nincs TURNSTILE_SECRET_KEY,
 * fejlesztési módban átengedi (dev-first), de figyelmeztet.
 */
export async function verifyTurnstile(token: string | undefined, remoteIp?: string): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not configured — skipping verification');
    return { ok: true, skipped: true };
  }
  if (!token) return { ok: false, skipped: false, error: 'missing_token' };
  try {
    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', token);
    if (remoteIp) form.set('remoteip', remoteIp);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const data = await res.json();
    if (data.success) return { ok: true, skipped: false };
    return { ok: false, skipped: false, error: (data['error-codes'] ?? []).join(',') || 'verify_failed' };
  } catch (e) {
    return { ok: false, skipped: false, error: (e as Error).message };
  }
}
