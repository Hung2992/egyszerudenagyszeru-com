import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Capability-alapú rendelés-teljesítés: a motor nem típusokat néz, hanem képességeket.
type Fulfillment = 'physical' | 'digital' | 'course' | 'service';

const CAPS: Record<Fulfillment, Record<string, boolean>> = {
  physical: { inventory: true, shipping: true },
  digital: { download: true, license: true, accessControl: true },
  course: { lessons: true, certificate: true, accessControl: true, capacity: true },
  service: { appointment: true, capacity: true, customWork: true },
};

const randKey = (len = 4, groups = 4) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const g = () => Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return Array.from({ length: groups }, g).join('-');
};

const randToken = () => crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).slice(2, 10);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Bejelentkezés szükséges' }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Érvénytelen munkamenet' }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body.order_id;
    const partnerId: string | undefined = body.partner_id;
    if (!orderId || !partnerId) return json({ error: 'order_id és partner_id kötelező' }, 400);

    // Jogosultság: a partner tulajdonosa vagy admin
    const { data: partner } = await supabase.from('partners').select('id,user_id').eq('id', partnerId).maybeSingle();
    const { data: adminRole } = await supabase.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!partner || (partner.user_id !== user.id && !adminRole)) return json({ error: 'Nincs jogosultság' }, 403);

    const { data: order, error: orderErr } = await supabase
      .from('partner_orders').select('*').eq('id', orderId).eq('partner_id', partnerId).maybeSingle();
    if (orderErr || !order) return json({ error: 'Rendelés nem található' }, 404);

    const items: any[] = Array.isArray(order.items) ? order.items : [];
    if (!items.length) return json({ error: 'A rendelésnek nincsenek tételei' }, 400);

    const created: any[] = [];
    const events: any[] = [];

    for (const [i, it] of items.entries()) {
      const ff: Fulfillment = (it.fulfillment_type as Fulfillment) || 'physical';
      const caps = CAPS[ff] || CAPS.physical;
      const attrs = it.attributes || {};
      const base = {
        partner_id: partnerId,
        order_id: orderId,
        product_id: it.product_id ?? null,
        customer_email: order.customer_email ?? null,
        customer_user_id: order.customer_user_id ?? null,
      };
      const qty = Number(it.qty || it.quantity || 1);

      if (caps.license) {
        const { data, error } = await supabase.from('partner_license_keys').insert({
          ...base,
          license_key: randKey(),
          license_type: attrs.license_type || 'single',
          seats: qty,
          expires_at: attrs.access_days ? new Date(Date.now() + attrs.access_days * 864e5).toISOString() : null,
          metadata: { line_index: i, product_name: it.title || it.name || null },
        }).select().single();
        if (error) return json({ error: `Licenc hiba: ${error.message}` }, 500);
        created.push({ kind: 'license', row: data });
        events.push({ order_id: orderId, event_type: 'fulfillment.issue_license', description: 'Licenckulcs kiadva' });
      }

      if (caps.download) {
        const { data, error } = await supabase.from('partner_download_access').insert({
          ...base,
          token: randToken(),
          file_path: attrs.digital_file_url || null,
          file_name: attrs.digital_file_name || it.title || null,
          download_limit: attrs.download_limit ?? null,
          expires_at: attrs.access_days ? new Date(Date.now() + attrs.access_days * 864e5).toISOString() : null,
          metadata: { line_index: i, format: attrs.digital_format ?? null },
        }).select().single();
        if (error) return json({ error: `Letöltés hiba: ${error.message}` }, 500);
        created.push({ kind: 'download', row: data });
        events.push({ order_id: orderId, event_type: 'fulfillment.create_download_access', description: 'Letöltési hozzáférés létrehozva' });
      }

      if (caps.lessons) {
        const { data, error } = await supabase.from('partner_course_enrollments').insert({
          ...base,
          access_until: attrs.access_days ? new Date(Date.now() + attrs.access_days * 864e5).toISOString() : null,
          metadata: { line_index: i, modules: attrs.course_modules ?? [], certificate: !!attrs.certificate },
        }).select().single();
        if (error) return json({ error: `Beiratkozás hiba: ${error.message}` }, 500);
        created.push({ kind: 'enrollment', row: data });
        events.push({ order_id: orderId, event_type: 'fulfillment.activate_course_access', description: 'Kurzus-hozzáférés aktiválva' });
      }

      if (caps.appointment) {
        const { data, error } = await supabase.from('partner_appointments').insert({
          ...base,
          customer_name: order.customer_name ?? null,
          duration_min: attrs.duration_min ?? null,
          location: attrs.service_location ?? null,
          notes: attrs.custom_notes ?? null,
          metadata: { line_index: i, capacity: qty },
        }).select().single();
        if (error) return json({ error: `Időpont hiba: ${error.message}` }, 500);
        created.push({ kind: 'appointment', row: data });
        events.push({ order_id: orderId, event_type: 'fulfillment.create_appointment', description: 'Időpont létrehozva' });
      }
    }

    if (events.length) {
      await supabase.from('order_events').insert(
        events.map((e) => ({ ...e, metadata: { source: 'order-fulfillment', partner_id: partnerId } })),
      ).then(() => null, () => null);
    }

    return json({ success: true, created_count: created.length, created });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Ismeretlen hiba' }, 500);
  }
});
