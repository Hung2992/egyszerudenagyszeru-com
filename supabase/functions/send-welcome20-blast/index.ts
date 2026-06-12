// Admin-only: WELCOME20 kupon kiküldése jogosult (még nem rendelt) felhasználóknak.
// - dry_run: visszaadja a teljes címzettlistát státusszal (eligible / already_sent / already_redeemed / has_order)
// - send: csak az eligible + még nem kapott meg sorokat küldi, mindent loggol welcome20_send_log-ba
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const COUPON_CODE = "WELCOME20";

interface Recipient {
  user_id: string;
  email: string;
  name: string;
  status: "eligible" | "already_sent" | "already_redeemed" | "has_order" | "no_coupon";
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const dryRun = !!body?.dry_run;
    const discountText = (body?.discount_text as string) || "20% kedvezmény";

    // --- 1) Megerősített userek listája ---
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
    // duplikátum email szűrés
    const uniqueUsers = Array.from(new Map(users.map((u) => [u.email.toLowerCase(), u])).values());

    // --- 2) Jogosultság batch lekérdezés ---
    const userIds = uniqueUsers.map((u) => u.id);
    const emails = uniqueUsers.map((u) => u.email.toLowerCase());

    const [
      { data: couponRow },
      { data: ordersData },
      { data: redemptionsData },
      { data: sendLogData },
    ] = await Promise.all([
      supa.from("coupons").select("id,is_active").eq("code", COUPON_CODE).maybeSingle(),
      supa.from("orders").select("user_id").in("user_id", userIds).not("status", "in", "(cancelled,refunded)"),
      supa.from("coupon_redemptions").select("user_id,coupon_id").in("user_id", userIds),
      supa.from("welcome20_send_log").select("email,status").eq("coupon_code", COUPON_CODE).in("email", emails),
    ]);

    const couponId = (couponRow as any)?.id as string | undefined;
    const couponActive = !!(couponRow as any)?.is_active;
    const orderedUserIds = new Set((ordersData || []).map((r: any) => r.user_id));
    const redeemedUserIds = new Set(
      (redemptionsData || []).filter((r: any) => r.coupon_id === couponId).map((r: any) => r.user_id),
    );
    const sentEmails = new Set(
      (sendLogData || []).filter((r: any) => r.status === "sent").map((r: any) => String(r.email).toLowerCase()),
    );

    // --- 3) Címzettlista státusszal ---
    const recipients: Recipient[] = uniqueUsers.map((u) => {
      const emailLc = u.email.toLowerCase();
      if (!couponId || !couponActive) return { user_id: u.id, email: u.email, name: u.name, status: "no_coupon" };
      if (sentEmails.has(emailLc)) return { user_id: u.id, email: u.email, name: u.name, status: "already_sent" };
      if (redeemedUserIds.has(u.id)) return { user_id: u.id, email: u.email, name: u.name, status: "already_redeemed" };
      if (orderedUserIds.has(u.id)) return { user_id: u.id, email: u.email, name: u.name, status: "has_order" };
      return { user_id: u.id, email: u.email, name: u.name, status: "eligible" };
    });

    const summary = recipients.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, total: recipients.length, summary, recipients }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!couponId || !couponActive) {
      return new Response(JSON.stringify({ error: "WELCOME20 kupon nem aktív vagy nem létezik" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 4) Tényleges küldés CSAK eligible-eknek ---
    const targets = recipients.filter((r) => r.status === "eligible");
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
          await supa.from("welcome20_send_log").insert({
            user_id: r.user_id, email: r.email, status: "failed", error: error.message, coupon_code: COUPON_CODE,
          });
        } else {
          sent++;
          await supa.from("welcome20_send_log").insert({
            user_id: r.user_id, email: r.email, status: "sent", coupon_code: COUPON_CODE,
          });
        }
      } catch (e: any) {
        failed++;
        errors.push({ email: r.email, error: String(e?.message || e) });
        await supa.from("welcome20_send_log").insert({
          user_id: r.user_id, email: r.email, status: "failed", error: String(e?.message || e), coupon_code: COUPON_CODE,
        });
      }
    }

    // Skipped (not eligible) sorok loggolása informálisan – csak az első alkalommal
    for (const r of recipients.filter((x) => x.status !== "eligible")) {
      await supa.from("welcome20_send_log").insert({
        user_id: r.user_id, email: r.email, status: "skipped", reason: r.status, coupon_code: COUPON_CODE,
      }).then(() => {}, () => {});
    }

    await supa.from("admin_notifications").insert({
      title: `WELCOME20 körlevél lefutott`,
      message: `${sent} sikeres / ${failed} sikertelen küldés, ${targets.length} jogosult / ${recipients.length} összesen.`,
      type: "info",
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      ok: true, total: recipients.length, eligible: targets.length, sent, failed,
      summary, errors: errors.slice(0, 20),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
