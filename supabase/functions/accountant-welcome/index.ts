// Sends the welcome email the first time an accountant lands on /konyvelo
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user?.email) return json({ ok: false, error: "Nincs bejelentkezve" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAcc } = await admin.rpc("has_role", { _user_id: user.id, _role: "accountant" });
    if (!isAcc) return json({ ok: true, skipped: "not_accountant" });

    const emailLower = user.email.toLowerCase();
    const { data: invite } = await admin
      .from("pending_accountant_invites").select("id,welcomed_at,accepted_at").eq("email", emailLower).maybeSingle();

    // Mark accepted if missing
    if (invite && !invite.accepted_at) {
      await admin.from("pending_accountant_invites").update({ accepted_at: new Date().toISOString(), accepted_user_id: user.id }).eq("id", invite.id);
    }

    if (invite?.welcomed_at) return json({ ok: true, already_sent: true });

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "accountant-welcome",
          recipientEmail: emailLower,
          idempotencyKey: `accountant-welcome-${user.id}`,
          templateData: { portal_url: `${origin}/konyvelo` },
        },
      });
    } catch (_e) { /* best-effort */ }

    if (invite) await admin.from("pending_accountant_invites").update({ welcomed_at: new Date().toISOString() }).eq("id", invite.id);
    return json({ ok: true, sent: true });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
