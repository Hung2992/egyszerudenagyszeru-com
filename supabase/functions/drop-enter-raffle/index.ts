// 🎟️ Drop Raffle jelentkezés — Turnstile + duplikáció + fingerprint-védelem
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';
import { dropCors, dropJson, hashString, getClientIp, verifyTurnstile } from '../_shared/drop-utils.ts';

interface Body {
  drop_id: string;
  email?: string;
  captcha_token?: string;
  fingerprint?: string;
  session_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: dropCors });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(url, svc);

    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader) {
      const uc = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
      const { data } = await uc.auth.getUser();
      userId = data.user?.id ?? null;
      userEmail = data.user?.email ?? null;
    }

    const body = (await req.json()) as Body;
    if (!body.drop_id) return dropJson({ error: 'drop_id_required' }, 400);
    const email = (userEmail ?? body.email ?? '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return dropJson({ error: 'invalid_email' }, 400);
    }

    // Drop lekérés
    const { data: drop, error: dErr } = await admin
      .from('product_drops').select('*').eq('id', body.drop_id).maybeSingle();
    if (dErr || !drop) return dropJson({ error: 'drop_not_found' }, 404);
    if (drop.drop_type !== 'raffle') return dropJson({ error: 'not_a_raffle' }, 400);
    if (!['scheduled', 'open'].includes(drop.status)) return dropJson({ error: 'raffle_closed' }, 400);
    if (drop.raffle_draw_at && new Date(drop.raffle_draw_at) < new Date()) {
      return dropJson({ error: 'entry_window_closed' }, 400);
    }

    const ip = getClientIp(req);
    const ipHash = await hashString(ip);
    const fpHash = body.fingerprint ? await hashString(body.fingerprint) : null;

    // Turnstile
    let captchaOk = true;
    if (drop.require_captcha) {
      const v = await verifyTurnstile(body.captcha_token, ip);
      captchaOk = v.ok;
      if (!v.ok && !v.skipped) {
        await admin.from('drop_events').insert({
          drop_id: drop.id, event_type: 'bot_blocked', user_id: userId,
          session_id: body.session_id, ip_hash: ipHash, fingerprint_hash: fpHash,
          payload: { reason: 'captcha_failed', error: v.error, email },
        });
        return dropJson({ error: 'captcha_failed', detail: v.error }, 403);
      }
    }

    // Fingerprint-duplikáció: több user_id / email ugyanazzal az fp_hash-sel ugyanerre a dropra
    if (fpHash) {
      const { count } = await admin
        .from('drop_raffle_entries')
        .select('id', { count: 'exact', head: true })
        .eq('drop_id', drop.id)
        .eq('fingerprint_hash', fpHash);
      if ((count ?? 0) >= 3) {
        await admin.from('fraud_signals').insert({
          user_id: userId, session_id: body.session_id,
          signal_type: 'drop_raffle_fingerprint_abuse',
          severity: 'high',
          details: { drop_id: drop.id, fingerprint_hash: fpHash, existing_count: count, email },
        });
        await admin.from('drop_events').insert({
          drop_id: drop.id, event_type: 'bot_blocked', user_id: userId,
          session_id: body.session_id, ip_hash: ipHash, fingerprint_hash: fpHash,
          payload: { reason: 'fingerprint_duplication', existing: count },
        });
        return dropJson({ error: 'suspicious_activity' }, 403);
      }
    }

    // IP rate limit ugyanerre a dropra: max 5 különböző email/IP
    const { count: ipCount } = await admin
      .from('drop_raffle_entries')
      .select('id', { count: 'exact', head: true })
      .eq('drop_id', drop.id)
      .eq('ip_hash', ipHash);
    if ((ipCount ?? 0) >= 5) {
      return dropJson({ error: 'too_many_entries_from_ip' }, 429);
    }

    // Beírás
    const { data: entry, error: eErr } = await admin
      .from('drop_raffle_entries')
      .insert({
        drop_id: drop.id, user_id: userId, email,
        captcha_verified: captchaOk,
        ip_hash: ipHash, fingerprint_hash: fpHash,
        user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      })
      .select().single();

    if (eErr) {
      if (eErr.code === '23505') return dropJson({ error: 'already_entered' }, 409);
      return dropJson({ error: eErr.message }, 500);
    }

    await admin.from('drop_events').insert({
      drop_id: drop.id, event_type: 'entered_raffle', user_id: userId,
      session_id: body.session_id, ip_hash: ipHash, fingerprint_hash: fpHash,
      payload: { entry_id: entry.id, email },
    });

    return dropJson({ ok: true, entry_id: entry.id, message: 'Sikeresen jelentkeztél! A húzás után értesítünk.' });
  } catch (e) {
    console.error('drop-enter-raffle', e);
    return dropJson({ error: (e as Error).message }, 500);
  }
});
