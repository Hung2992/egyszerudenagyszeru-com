// 🔔 Feliratkozás egy drop indulási értesítésére
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';
import { dropCors, dropJson, hashString, getClientIp } from '../_shared/drop-utils.ts';

interface Body { drop_id: string; email?: string; session_id?: string; channels?: string[]; }

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
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return dropJson({ error: 'invalid_email' }, 400);

    const ipHash = await hashString(getClientIp(req));

    const { error } = await admin.from('drop_notifications').insert({
      drop_id: body.drop_id,
      user_id: userId,
      email,
      channels: body.channels ?? ['email'],
      session_id: body.session_id ?? null,
      ip_hash: ipHash,
    });
    if (error && error.code !== '23505') return dropJson({ error: error.message }, 500);
    return dropJson({ ok: true });
  } catch (e) {
    return dropJson({ error: (e as Error).message }, 500);
  }
});
