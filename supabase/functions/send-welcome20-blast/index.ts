// Admin-only: WELCOME20 kupon kiküldése jogosult (még nem rendelt) felhasználóknak.
// - dry_run: visszaadja a teljes címzettlistát státusszal
// - retry_failed + emails: csak a megadott emailek közül azokra fut újra, ahol legutóbb 'failed' volt és még nincs 'sent'
// - default: minden eligible (még nem kapta meg) címzettnek küld
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const COUPON_CODE = "WELCOME20";

type Status = "eligible" | "already_sent" | "already_redeemed" | "has_order" | "no_coupon" | "expired" | "exhausted";
interface Recipient { user_id: string; email: string; name: string; status: Status; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));

    // --- Hitelesítés: vagy admin auth, vagy belső cron-token (store_settings.welcome20_cron_token) ---
    const cronHeader = req.headers.get("x-cron-secret");
    let isCron = false;
    if (cronHeader) {
      const { data: settings } = await supa.from("store_settings").select("welcome20_cron_token").limit(1).maybeSingle();
      const expected = (settings as any)?.welcome20_cron_token as string | undefined;
      if (expected && cronHeader === expected) isCron = true;
    }
    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "unauthorized" }, 401);
      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }

    const dryRun = !!body?.dry_run;
    const retryFailed = !!body?.retry_failed;
    const retryAllFailed = !!body?.retry_all_failed;
    const retryEmails: string[] = Array.isArray(body?.emails) ? body.emails.map((e: string) => String(e).toLowerCase()) : [];
    const discountText = (body?.discount_text as string) || "20% kedvezmény";


    // --- 1) Userek ---
    const users: { id: string; email: string; name: string }[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await supa.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      for (const u of data.users) {
        if (!u.email) continue;
        if (!u.email_confirmed_at && !u.confirmed_at) continue;
        const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email.split("@")[0];
        users.push({ id: u.id, email: u.email, name });
      }
      if (data.users.length < perPage) break;
      page++;
      if (page > 50) break;
    }
    const uniqueUsers = Array.from(new Map(users.map((u) => [u.email.toLowerCase(), u])).values());

    // --- 2) Kupon + jogosultság ---
    const userIds = uniqueUsers.map((u) => u.id);
    const emails = uniqueUsers.map((u) => u.email.toLowerCase());

    const [{ data: couponRow }, { data: ordersData }, { data: redemptionsData }, { data: sendLogData }] = await Promise.all([
      supa.from("coupons").select("id,is_active,valid_until,max_uses,used_count").eq("code", COUPON_CODE).maybeSingle(),
      supa.from("orders").select("user_id").in("user_id", userIds).not("status", "in", "(cancelled,refunded)"),
      supa.from("coupon_redemptions").select("user_id,coupon_id").in("user_id", userIds),
      supa.from("welcome20_send_log").select("email,status").eq("coupon_code", COUPON_CODE).in("email", emails),
    ]);

    const c = couponRow as any;
    const couponId: string | undefined = c?.id;
    let couponState: "ok" | "no_coupon" | "expired" | "exhausted" = "ok";
    if (!c || !c.is_active) couponState = "no_coupon";
    else if (c.valid_until && new Date(c.valid_until) < new Date()) couponState = "expired";
    else if (c.max_uses != null && (c.used_count ?? 0) >= c.max_uses) couponState = "exhausted";

    const orderedUserIds = new Set((ordersData || []).map((r: any) => r.user_id));
    const redeemedUserIds = new Set((redemptionsData || []).filter((r: any) => r.coupon_id === couponId).map((r: any) => r.user_id));
    const sentEmails = new Set((sendLogData || []).filter((r: any) => r.status === "sent").map((r: any) => String(r.email).toLowerCase()));

    const recipients: Recipient[] = uniqueUsers.map((u) => {
      const emailLc = u.email.toLowerCase();
      let status: Status;
      if (couponState !== "ok") status = couponState as Status;
      else if (sentEmails.has(emailLc)) status = "already_sent";
      else if (redeemedUserIds.has(u.id)) status = "already_redeemed";
      else if (orderedUserIds.has(u.id)) status = "has_order";
      else status = "eligible";
      return { user_id: u.id, email: u.email, name: u.name, status };
    });

    const summary = recipients.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

    if (dryRun) return json({ ok: true, dry_run: true, total: recipients.length, summary, recipients, coupon_state: couponState });

    if (couponState !== "ok") return json({ error: `WELCOME20 kupon állapot: ${couponState}` }, 400);

    // --- 3) Cél címzettek ---
    let targets: Recipient[];
    if (retryFailed && retryEmails.length > 0) {
      const set = new Set(retryEmails);
      targets = recipients.filter((r) => set.has(r.email.toLowerCase()) && !sentEmails.has(r.email.toLowerCase()) && r.status === "eligible");
    } else {
      targets = recipients.filter((r) => r.status === "eligible");
    }

    let sent = 0, failed = 0;
    const errors: any[] = [];
    for (const r of targets) {
      try {
        const { error } = await supa.functions.invoke("send-transactional-email", {
          body: {
            templateName: "coupon-notification",
            recipientEmail: r.email,
            idempotencyKey: `welcome20-blast-${COUPON_CODE}-${r.email.toLowerCase()}`,
            templateData: { name: r.name, couponCode: COUPON_CODE, discountText },
          },
        });
        if (error) {
          failed++;
          errors.push({ email: r.email, error: error.message });
          await supa.from("welcome20_send_log").insert({ user_id: r.user_id, email: r.email, status: "failed", error: error.message, coupon_code: COUPON_CODE });
        } else {
          sent++;
          await supa.from("welcome20_send_log").insert({ user_id: r.user_id, email: r.email, status: "sent", coupon_code: COUPON_CODE });
        }
      } catch (e: any) {
        failed++;
        errors.push({ email: r.email, error: String(e?.message || e) });
        await supa.from("welcome20_send_log").insert({ user_id: r.user_id, email: r.email, status: "failed", error: String(e?.message || e), coupon_code: COUPON_CODE });
      }
    }

    if (!retryFailed) {
      for (const r of recipients.filter((x) => x.status !== "eligible")) {
        await supa.from("welcome20_send_log").insert({ user_id: r.user_id, email: r.email, status: "skipped", reason: r.status, coupon_code: COUPON_CODE }).then(() => {}, () => {});
      }
    }

    await supa.from("admin_notifications").insert({
      title: retryFailed ? `WELCOME20 újraküldés` : `WELCOME20 körlevél lefutott`,
      message: `${sent} sikeres / ${failed} sikertelen küldés${retryFailed ? ` (újraküldés ${targets.length} címre)` : `, ${targets.length} jogosult / ${recipients.length} összesen`}.`,
      type: "info",
    }).then(() => {}, () => {});

    return json({ ok: true, retry: retryFailed, total: recipients.length, eligible: targets.length, sent, failed, summary, errors: errors.slice(0, 20) });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
