// 🔔 Drop indulás előtti értesítő — email küldés a feliratkozottaknak
// Cron: 5 percenként. T-15 perc előtt küld egyszer.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';
import { dropCors, dropJson } from '../_shared/drop-utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: dropCors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const now = new Date();
    const in15 = new Date(now.getTime() + 15 * 60 * 1000);

    const { data: dueDrops } = await admin
      .from('product_drops')
      .select('id, name, slug, starts_at, hero_image_url')
      .eq('status', 'scheduled')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', in15.toISOString());

    let sent = 0;
    for (const d of dueDrops ?? []) {
      const { data: subs } = await admin
        .from('drop_notifications')
        .select('id, email, user_id')
        .eq('drop_id', d.id)
        .is('notified_at', null);

      for (const s of subs ?? []) {
        try {
          await admin.functions.invoke('send-transactional-email', {
            body: {
              to: s.email,
              template: 'drop_launch_reminder',
              data: {
                drop_name: d.name,
                drop_url: `${Deno.env.get('PUBLIC_SITE_URL') ?? 'https://egyszerudenagyszeru.com'}/drop/${d.slug}`,
                starts_at: d.starts_at,
                hero_image: d.hero_image_url,
              },
            },
          });
          await admin.from('drop_notifications').update({ notified_at: now.toISOString() }).eq('id', s.id);
          sent++;
        } catch (e) {
          console.error('notify send failed', s.id, e);
        }
      }
    }
    return dropJson({ ok: true, sent, drops: (dueDrops ?? []).length });
  } catch (e) {
    console.error('drop-notify-launch', e);
    return dropJson({ error: (e as Error).message }, 500);
  }
});
