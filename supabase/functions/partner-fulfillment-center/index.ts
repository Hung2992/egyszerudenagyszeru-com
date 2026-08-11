import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Fulfillment Command Center — szerveroldali, auditált kiszolgálási műveletek + AI diagnosztika.
// FONTOS: licenckulcsot és letöltési tokent KIZÁRÓLAG ez a szerveroldali függvény generál.

const randKey = (len = 4, groups = 4) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(len * groups);
  crypto.getRandomValues(bytes);
  let i = 0;
  const g = () => Array.from({ length: len }, () => alphabet[bytes[i++] % alphabet.length]).join('');
  return Array.from({ length: groups }, g).join('-');
};

const randToken = () => {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};

const DAY = 86400000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!jwt) return json({ error: 'Bejelentkezés szükséges' }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Érvénytelen munkamenet' }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const partnerId: string | undefined = body.partner_id;
    const action: string = body.action ?? 'diagnose';
    if (!partnerId) return json({ error: 'partner_id kötelező' }, 400);

    const { data: partner } = await supabase.from('partners').select('id,user_id,brand_name').eq('id', partnerId).maybeSingle();
    const { data: adminRole } = await supabase.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!partner || (partner.user_id !== user.id && !adminRole)) return json({ error: 'Nincs jogosultság' }, 403);

    const audit = async (entry: Record<string, unknown>) => {
      await supabase.from('partner_fulfillment_audit').insert({
        partner_id: partnerId,
        actor_user_id: user.id,
        ...entry,
      });
    };

    const now = Date.now();

    // ---------- DIAGNÓZIS ----------
    if (action === 'diagnose') {
      const [lic, dl, enr, app] = await Promise.all([
        supabase.from('partner_license_keys').select('*').eq('partner_id', partnerId).limit(500),
        supabase.from('partner_download_access').select('*').eq('partner_id', partnerId).limit(500),
        supabase.from('partner_course_enrollments').select('*').eq('partner_id', partnerId).limit(500),
        supabase.from('partner_appointments').select('*').eq('partner_id', partnerId).limit(500),
      ]);
      const licenses = lic.data ?? [];
      const downloads = dl.data ?? [];
      const enrollments = enr.data ?? [];
      const appointments = app.data ?? [];

      const soon = (d?: string | null) => d && new Date(d).getTime() - now < DAY && new Date(d).getTime() > now;
      const expired = (d?: string | null) => d && new Date(d).getTime() <= now;

      const issues: any[] = [];

      const expSoon = [...downloads.filter((d) => soon(d.expires_at)), ...licenses.filter((l) => soon(l.expires_at))];
      if (expSoon.length) issues.push({
        severity: 'warning', domain: 'digital', action_key: 'extend_access',
        title: `${expSoon.length} ügyfélnek 24 órán belül lejár a hozzáférése`,
        targets: expSoon.map((x: any) => ({ id: x.id, type: x.token ? 'download' : 'license', email: x.customer_email })),
      });

      const expiredItems = [...downloads.filter((d) => expired(d.expires_at) && d.status === 'active'),
        ...licenses.filter((l) => expired(l.expires_at) && l.status === 'active')];
      if (expiredItems.length) issues.push({
        severity: 'error', domain: 'digital', action_key: 'expire_access',
        title: `${expiredItems.length} lejárt hozzáférés még aktív státuszban van`,
        targets: expiredItems.map((x: any) => ({ id: x.id, type: x.token ? 'download' : 'license', email: x.customer_email })),
      });

      const limitReached = downloads.filter((d) => d.download_limit && d.downloads_used >= d.download_limit);
      if (limitReached.length) issues.push({
        severity: 'warning', domain: 'digital', action_key: 'reset_limit',
        title: `${limitReached.length} ügyfél elérte a letöltési limitet`,
        targets: limitReached.map((x: any) => ({ id: x.id, type: 'download', email: x.customer_email })),
      });

      const stalled = enrollments.filter((e) => e.status !== 'completed' && e.progress_percent < 100 &&
        now - new Date(e.updated_at ?? e.created_at).getTime() > 14 * DAY);
      if (stalled.length) issues.push({
        severity: 'warning', domain: 'course', action_key: 'nudge_learner',
        title: `${stalled.length} kurzushallgató 14+ napja nem haladt`,
        targets: stalled.map((x: any) => ({ id: x.id, type: 'enrollment', email: x.customer_email })),
      });

      const certPending = enrollments.filter((e) => e.progress_percent >= 100 && !e.certificate_issued);
      if (certPending.length) issues.push({
        severity: 'info', domain: 'course', action_key: 'issue_certificate',
        title: `${certPending.length} befejezett kurzushoz nincs kiadva oklevél`,
        targets: certPending.map((x: any) => ({ id: x.id, type: 'enrollment', email: x.customer_email })),
      });

      const tomorrow = appointments.filter((a) => a.starts_at && new Date(a.starts_at).getTime() > now &&
        new Date(a.starts_at).getTime() < now + DAY && a.status !== 'cancelled');
      if (tomorrow.length) issues.push({
        severity: 'info', domain: 'service', action_key: 'upcoming_appointments',
        title: `${tomorrow.length} szolgáltatási időpont 24 órán belül`,
        targets: tomorrow.map((x: any) => ({ id: x.id, type: 'appointment', email: x.customer_email })),
      });

      const overdue = appointments.filter((a) => a.starts_at && new Date(a.starts_at).getTime() < now - DAY && a.status === 'booked');
      if (overdue.length) issues.push({
        severity: 'warning', domain: 'service', action_key: 'complete_appointment',
        title: `${overdue.length} lezáratlan, már elmúlt időpont`,
        targets: overdue.map((x: any) => ({ id: x.id, type: 'appointment', email: x.customer_email })),
      });

      const stats = {
        licenses_total: licenses.length,
        licenses_active: licenses.filter((l) => l.status === 'active').length,
        licenses_revoked: licenses.filter((l) => l.status === 'revoked').length,
        downloads_total: downloads.length,
        downloads_active: downloads.filter((d) => d.status === 'active').length,
        downloads_expired: downloads.filter((d) => expired(d.expires_at)).length,
        downloads_used: downloads.reduce((s, d) => s + (d.downloads_used ?? 0), 0),
        enrollments_total: enrollments.length,
        enrollments_completed: enrollments.filter((e) => e.progress_percent >= 100).length,
        avg_progress: enrollments.length
          ? Math.round(enrollments.reduce((s, e) => s + (e.progress_percent ?? 0), 0) / enrollments.length)
          : 0,
        certificates_issued: enrollments.filter((e) => e.certificate_issued).length,
        appointments_total: appointments.length,
        appointments_upcoming: appointments.filter((a) => a.starts_at && new Date(a.starts_at).getTime() > now && a.status !== 'cancelled').length,
        appointments_completed: appointments.filter((a) => a.status === 'completed').length,
        appointments_cancelled: appointments.filter((a) => a.status === 'cancelled').length,
      };

      // AI összefoglaló (opcionális — ha nincs kulcs, a determinisztikus lista marad)
      let summary = '';
      const key = Deno.env.get('LOVABLE_API_KEY');
      if (key) {
        try {
          const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'Te egy magyar nyelvű kiszolgálási (fulfillment) asszisztens vagy egy webshop partner számára. Rövid, tömör, tegező összefoglalót adsz emoji-kkal, maximum 6 sorban. Csak a valós adatokra hivatkozz.' },
                { role: 'user', content: `Statisztika: ${JSON.stringify(stats)}\nProblémák: ${JSON.stringify(issues.map((i) => ({ severity: i.severity, title: i.title })))}` },
              ],
            }),
          });
          if (res.ok) {
            const d = await res.json();
            summary = d?.choices?.[0]?.message?.content ?? '';
          } else if (res.status === 429) summary = '⚠️ AI korlát elérve, próbáld később.';
          else if (res.status === 402) summary = '⚠️ Elfogytak az AI kreditek.';
        } catch (_) { /* csendes fallback */ }
      }

      return json({ ok: true, stats, issues, summary, health: computeHealth(stats, issues) });
    }

    // ---------- HEALTH SCORE ----------
    function computeHealth(stats: any, issues: any[]) {
      const pct = (ok: number, total: number) => (total > 0 ? Math.round((ok / total) * 100) : 100);
      const digital = pct(stats.downloads_active, stats.downloads_total);
      const licenses = pct(stats.licenses_active, stats.licenses_total);
      const courses = stats.enrollments_total ? Math.max(0, Math.min(100, stats.avg_progress)) : 100;
      const services = pct(stats.appointments_total - stats.appointments_cancelled, stats.appointments_total);
      const openIssues = issues.filter((i) => i.severity !== 'info').length;
      const errors = issues.filter((i) => i.severity === 'error').length;
      const base = Math.round((digital + licenses + courses + services) / 4);
      const score = Math.max(0, Math.min(100, base - openIssues * 3 - errors * 5));
      const expiringSoon = issues
        .filter((i) => i.action_key === 'extend_access')
        .reduce((s, i) => s + (i.targets?.length ?? 0), 0);
      return {
        score,
        areas: [
          { key: 'digital', label: '💾 Digitális hozzáférések', value: digital },
          { key: 'licenses', label: '🔑 Licenckulcsok', value: licenses },
          { key: 'courses', label: '🎓 Kurzusok', value: courses },
          { key: 'services', label: '🛠️ Foglalások', value: services },
        ],
        expiring_soon: expiringSoon,
        open_issues: openIssues,
        audit_ok: true,
      };
    }

    // ---------- AI TERV (javaslat, végrehajtás nélkül) ----------
    if (action === 'plan') {
      const issues: any[] = Array.isArray(body.issues) ? body.issues : [];
      const planId = crypto.randomUUID();
      const recipe: Record<string, { action: string; label: string; why: string; extra?: Record<string, unknown> }> = {
        extend_access: { action: 'extend_access', label: 'Hozzáférés hosszabbítása (+30 nap)', why: '24 órán belül lejár a hozzáférés', extra: { days: 30 } },
        expire_access: { action: 'expire_access', label: 'Lejárt hozzáférés lezárása', why: 'Lejárt, de még aktív státuszú rekord' },
        reset_limit: { action: 'reset_limit', label: 'Letöltési limit nullázása', why: 'Az ügyfél elérte a letöltési limitet' },
        issue_certificate: { action: 'issue_certificate', label: 'Oklevél kiadása', why: 'Befejezett kurzus oklevél nélkül' },
        complete_appointment: { action: 'complete_appointment', label: 'Elmúlt időpont lezárása', why: 'Az időpont elmúlt, de nyitva maradt' },
      };
      const steps: any[] = [];
      for (const issue of issues) {
        const r = recipe[issue.action_key];
        if (!r) continue;
        for (const t of issue.targets ?? []) {
          steps.push({
            action_id: crypto.randomUUID(),
            plan_id: planId,
            action: r.action,
            label: r.label,
            why: r.why,
            severity: issue.severity,
            domain: issue.domain,
            target_type: t.type,
            target_id: t.id,
            customer_email: t.email,
            ...(r.extra ?? {}),
          });
        }
      }
      return json({ ok: true, plan_id: planId, steps, executable: steps.length });
    }


    // ---------- MŰVELETEK ----------
    const targetId: string | undefined = body.target_id;
    const reason: string | undefined = body.reason;

    const tableFor: Record<string, string> = {
      license: 'partner_license_keys',
      download: 'partner_download_access',
      enrollment: 'partner_course_enrollments',
      appointment: 'partner_appointments',
    };

    const mutate = async (type: string, id: string, values: Record<string, unknown>, act: string) => {
      const table = tableFor[type];
      if (!table) throw new Error('Ismeretlen erőforrás típus');
      const { data: before } = await supabase.from(table).select('*').eq('id', id).eq('partner_id', partnerId).maybeSingle();
      if (!before) throw new Error('Az erőforrás nem található');
      const { data: after, error } = await supabase.from(table).update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id).eq('partner_id', partnerId).select().maybeSingle();
      if (error) throw new Error(error.message);
      await audit({
        action: act, resource_type: type, resource_id: id,
        customer_email: (before as any).customer_email,
        before_state: before, after_state: after, reason,
      });
      return after;
    };

    switch (action) {
      case 'revoke_license':
        return json({ ok: true, record: await mutate('license', targetId!, { status: 'revoked' }, 'revoke_license') });
      case 'reactivate_license':
        return json({ ok: true, record: await mutate('license', targetId!, { status: 'active' }, 'reactivate_license') });
      case 'rotate_license': {
        const record = await mutate('license', targetId!, { license_key: randKey(), activations: 0, status: 'active' }, 'rotate_license');
        return json({ ok: true, record });
      }
      case 'rotate_token': {
        const record = await mutate('download', targetId!, { token: randToken(), downloads_used: 0, status: 'active' }, 'rotate_token');
        return json({ ok: true, record });
      }
      case 'reset_limit':
        return json({ ok: true, record: await mutate('download', targetId!, { downloads_used: 0, status: 'active' }, 'reset_limit') });
      case 'revoke_download':
        return json({ ok: true, record: await mutate('download', targetId!, { status: 'revoked' }, 'revoke_download') });
      case 'extend_access': {
        const days = Math.max(1, Math.min(365, Number(body.days ?? 30)));
        const type = body.target_type === 'license' ? 'license' : body.target_type === 'enrollment' ? 'enrollment' : 'download';
        const field = type === 'enrollment' ? 'access_until' : 'expires_at';
        const table = tableFor[type];
        const { data: cur } = await supabase.from(table).select(`id, ${field}`).eq('id', targetId!).eq('partner_id', partnerId).maybeSingle();
        const base = (cur as any)?.[field] ? new Date((cur as any)[field]).getTime() : now;
        const next = new Date(Math.max(base, now) + days * DAY).toISOString();
        return json({ ok: true, record: await mutate(type, targetId!, { [field]: next, status: 'active' }, 'extend_access') });
      }
      case 'expire_access': {
        const type = body.target_type === 'license' ? 'license' : 'download';
        return json({ ok: true, record: await mutate(type, targetId!, { status: 'expired' }, 'expire_access') });
      }
      case 'issue_certificate':
        return json({ ok: true, record: await mutate('enrollment', targetId!, { certificate_issued: true, status: 'completed', progress_percent: 100 }, 'issue_certificate') });
      case 'set_progress': {
        const v = Math.max(0, Math.min(100, Number(body.progress ?? 0)));
        return json({ ok: true, record: await mutate('enrollment', targetId!, { progress_percent: v, status: v >= 100 ? 'completed' : 'in_progress' }, 'set_progress') });
      }
      case 'complete_appointment':
        return json({ ok: true, record: await mutate('appointment', targetId!, { status: 'completed' }, 'complete_appointment') });
      case 'cancel_appointment':
        return json({ ok: true, record: await mutate('appointment', targetId!, { status: 'cancelled' }, 'cancel_appointment') });
      case 'reschedule_appointment': {
        if (!body.starts_at) return json({ error: 'starts_at kötelező' }, 400);
        return json({ ok: true, record: await mutate('appointment', targetId!, { starts_at: new Date(body.starts_at).toISOString(), status: 'booked' }, 'reschedule_appointment') });
      }
      default:
        return json({ error: `Ismeretlen művelet: ${action}` }, 400);
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Ismeretlen hiba' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
