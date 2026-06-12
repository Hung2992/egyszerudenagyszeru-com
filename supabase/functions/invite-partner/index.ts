import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INVITE_TTL_DAYS = 60;

function genCouponCode(prefix = "PARTNER"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${out}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "Nincs bejelentkezve" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ ok: false, error: "Csak admin hívhat meg partnert" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const partnerType = String(body.partner_type || "person");
    const fullName = String(body.full_name || "").trim();
    const companyName = body.company_name ? String(body.company_name).trim() : null;
    const commissionPerOrder = Number(body.commission_per_order_amount || 0);
    const discountPercent = body.customer_discount_percent != null ? Number(body.customer_discount_percent) : null;
    const discountAmount = body.customer_discount_amount != null ? Number(body.customer_discount_amount) : null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "Érvénytelen email" }, 400);
    if (!fullName) return json({ ok: false, error: "Név kötelező" }, 400);
    if (commissionPerOrder < 0) return json({ ok: false, error: "Negatív jutalék nem megengedett" }, 400);
    if (!discountPercent && !discountAmount) return json({ ok: false, error: "Adj meg vásárlói kedvezményt (%-ban vagy Ft-ban)" }, 400);

    // Generate unique coupon
    let couponCode = genCouponCode();
    for (let i = 0; i < 6; i++) {
      const { data: existsCp } = await admin.from("coupons").select("id").eq("code", couponCode).maybeSingle();
      if (!existsCp) break;
      couponCode = genCouponCode();
    }

    const { data: createdCoupon, error: cpErr } = await admin.from("coupons").insert({
      code: couponCode,
      description: `Partner kupon — ${fullName}`,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      is_active: true,
      coupon_type: "partner",
      partner_name: fullName,
      partner_email: email,
      partner_commission_percent: 0,
    }).select("id").single();
    if (cpErr) return json({ ok: false, error: `Kupon: ${cpErr.message}` }, 500);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Upsert invite
    const { error: invErr } = await admin.from("pending_partner_invites").insert({
      email,
      partner_type: partnerType,
      full_name: fullName,
      company_name: companyName,
      commission_per_order_amount: commissionPerOrder,
      customer_discount_percent: discountPercent,
      customer_discount_amount: discountAmount,
      coupon_code: couponCode,
      coupon_id: createdCoupon.id,
      invited_by: user.id,
      expires_at: expiresAt,
    });
    if (invErr) return json({ ok: false, error: invErr.message }, 500);

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const redirectTo = `${origin}/partner`;

    let invite_link: string | null = null;
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteErr && !/already.*registered|already exists/i.test(inviteErr.message)) {
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      invite_link = linkData?.properties?.action_link ?? null;
    } else {
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      invite_link = linkData?.properties?.action_link ?? null;

      // If user already exists, auto-link partner now
      if (!invited) {
        const { data: existingUsers } = await admin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email);
        if (existingUser) {
          await admin.from("partners").insert({
            user_id: existingUser.id,
            partner_type: partnerType,
            full_name: fullName,
            company_name: companyName,
            email,
            status: "active",
            commission_per_order_amount: commissionPerOrder,
            coupon_id: createdCoupon.id,
            is_active: true,
          });
          await admin.from("user_roles").upsert({ user_id: existingUser.id, role: "partner" }, { onConflict: "user_id,role" });
          await admin.from("pending_partner_invites").update({ claimed_at: new Date().toISOString() }).eq("email", email);
        }
      }
    }

    let emailFailed: string | null = null;
    try {
      const { data: settings } = await admin.from("store_settings").select("legal_owner_name,store_name").maybeSingle();
      const inviterName = (settings as any)?.legal_owner_name || (settings as any)?.store_name || "Egyszerű de Nagyszerű";
      const { error: emailErr } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "partner-invite",
          recipientEmail: email,
          idempotencyKey: `partner-invite-${email}-${now.getTime()}`,
          templateData: {
            invite_link,
            inviter_name: inviterName,
            full_name: fullName,
            coupon_code: couponCode,
            commission_per_order: commissionPerOrder,
            expires_at: expiresAt,
          },
        },
      });
      if (emailErr) emailFailed = emailErr.message;
    } catch (e) { emailFailed = (e as Error).message; }

    return json({ ok: true, invite_link, coupon_code: couponCode, expires_at: expiresAt, email_failed: emailFailed });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
