import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INVITE_TTL_DAYS = 7;

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
    if (!isAdmin) return json({ ok: false, error: "Csak admin hívhat meg könyvelőt" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const isResend = !!body.resend;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "Érvénytelen email" }, 400);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Upsert invite row with new expiry
    const { data: existing } = await admin.from("pending_accountant_invites").select("id,resend_count").eq("email", email).maybeSingle();
    const resendCount = (existing?.resend_count ?? 0) + (isResend ? 1 : 0);

    const { error: invErr } = await admin.from("pending_accountant_invites").upsert(
      {
        email,
        invited_by: user.id,
        invited_at: now.toISOString(),
        last_sent_at: now.toISOString(),
        expires_at: expiresAt,
        resend_count: resendCount,
        accepted_at: isResend ? undefined : null,
        accepted_user_id: isResend ? undefined : null,
      },
      { onConflict: "email" }
    );
    if (invErr) return json({ ok: false, error: invErr.message }, 500);

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const redirectTo = `${origin}/konyvelo`;

    let invite_link: string | null = null;
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteErr && !/already.*registered|already exists/i.test(inviteErr.message)) {
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      invite_link = linkData?.properties?.action_link ?? null;
    } else if (invited) {
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      invite_link = linkData?.properties?.action_link ?? null;
    } else {
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      invite_link = linkData?.properties?.action_link ?? null;

      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email);
      if (existingUser) {
        await admin.from("user_roles").upsert({ user_id: existingUser.id, role: "accountant" }, { onConflict: "user_id,role" });
        await admin.from("pending_accountant_invites")
          .update({ accepted_at: new Date().toISOString(), accepted_user_id: existingUser.id })
          .eq("email", email);
      }
    }

    // Branded email
    let emailFailed: string | null = null;
    try {
      const { data: settings } = await admin.from("store_settings").select("legal_owner_name,store_name").maybeSingle();
      const inviterName = (settings as any)?.legal_owner_name || (settings as any)?.store_name || "Egyszerű de Nagyszerű";
      const { error: emailErr } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "accountant-invite",
          recipientEmail: email,
          idempotencyKey: `accountant-invite-${email}-${now.getTime()}`,
          templateData: { invite_link, inviter_name: inviterName, expires_at: expiresAt, is_resend: isResend },
        },
      });
      if (emailErr) emailFailed = emailErr.message;
    } catch (e) { emailFailed = (e as Error).message; }

    await admin.from("accountant_access_log").insert({
      user_id: user.id,
      action: emailFailed ? "invite_failed" : (isResend ? "invite_resent" : "invite_sent"),
      resource: email,
      ip_address: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
      metadata: { expires_at: expiresAt, resend_count: resendCount, email_error: emailFailed },
    });

    return json({ ok: true, invite_link, expires_at: expiresAt, resend_count: resendCount, email_failed: emailFailed });

    await admin.from("accountant_access_log").insert({
      user_id: user.id,
      action: isResend ? "invite_resent" : "invite_sent",
      resource: email,
      ip_address: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
      metadata: { expires_at: expiresAt, resend_count: resendCount },
    });

    return json({ ok: true, invite_link, expires_at: expiresAt, resend_count: resendCount });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
