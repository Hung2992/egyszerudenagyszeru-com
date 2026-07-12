// 🧹 Drop cleanup — lejárt foglalások + lejárt nyertesek + scheduled→open átváltás
// Cron: percenként
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';
import { dropCors, dropJson } from '../_shared/drop-utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: dropCors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await admin.rpc('cleanup_expired_drop_holds');
    if (error) return dropJson({ error: error.message }, 500);
    const row = Array.isArray(data) ? data[0] : data;

    // Ellenőrizzük, mely raffle-ök érkeztek el a húzási időpontjukhoz
    const { data: dueDraws } = await admin
      .from('product_drops')
      .select('id, name')
      .eq('drop_type', 'raffle')
      .in('status', ['scheduled', 'open'])
      .lte('raffle_draw_at', new Date().toISOString());

    const drawn: string[] = [];
    for (const d of dueDraws ?? []) {
      const { data: r } = await admin.rpc('draw_raffle_winners', { p_drop_id: d.id });
      const rr = Array.isArray(r) ? r[0] : r;
      if (rr?.error === null || rr?.error === undefined) drawn.push(d.id);
    }

    return dropJson({ ok: true, cleanup: row, drawn });
  } catch (e) {
    console.error('drop-cleanup', e);
    return dropJson({ error: (e as Error).message }, 500);
  }
});
