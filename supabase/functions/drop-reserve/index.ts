// 🛒 First-come drop kosárfoglalás — atomikus RPC hívás
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';
import { dropCors, dropJson, hashString, getClientIp, verifyTurnstile } from '../_shared/drop-utils.ts';

interface Body {
  drop_id: string;
  quantity?: number;
  variant_id?: string;
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
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader) {
      const uc = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
      const { data } = await uc.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const body = (await req.json()) as Body;
    if (!body.drop_id) return dropJson({ error: 'drop_id_required' }, 400);
    const quantity = Math.max(1, Math.min(5, Number(body.quantity ?? 1)));

    // Drop info a captcha döntéshez
    const { data: drop } = await admin
      .from('product_drops').select('require_captcha, drop_type, status').eq('id', body.drop_id).maybeSingle();
    if (!drop) return dropJson({ error: 'drop_not_found' }, 404);
    if (drop.status !== 'open') return dropJson({ error: 'drop_not_open' }, 400);
    if (drop.drop_type !== 'first_come') return dropJson({ error: 'wrong_drop_type' }, 400);

    const ip = getClientIp(req);
    const ipHash = await hashString(ip);
    const fpHash = body.fingerprint ? await hashString(body.fingerprint) : null;

    if (drop.require_captcha) {
      const v = await verifyTurnstile(body.captcha_token, ip);
      if (!v.ok && !v.skipped) {
        await admin.from('drop_events').insert({
          drop_id: body.drop_id, event_type: 'bot_blocked', user_id: userId,
          session_id: body.session_id, ip_hash: ipHash, fingerprint_hash: fpHash,
          payload: { reason: 'captcha_failed', error: v.error, phase: 'reserve' },
        });
        return dropJson({ error: 'captcha_failed', detail: v.error }, 403);
      }
    }

    // Atomikus foglalás
    const { data: rpc, error: rpcErr } = await admin.rpc('reserve_drop_slot', {
      p_drop_id: body.drop_id,
      p_user_id: userId,
      p_session_id: body.session_id ?? null,
      p_quantity: quantity,
      p_variant_id: body.variant_id ?? null,
      p_ip_hash: ipHash,
      p_fingerprint_hash: fpHash,
    });

    if (rpcErr) return dropJson({ error: rpcErr.message }, 500);
    const row = Array.isArray(rpc) ? rpc[0] : rpc;
    if (row?.error) return dropJson({ error: row.error }, 409);

    return dropJson({
      ok: true,
      reservation_id: row.reservation_id,
      expires_at: row.expires_at,
      quantity,
    });
  } catch (e) {
    console.error('drop-reserve', e);
    return dropJson({ error: (e as Error).message }, 500);
  }
});
