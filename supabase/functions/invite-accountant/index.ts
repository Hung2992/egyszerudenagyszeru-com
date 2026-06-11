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

    // Verify caller is admin
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "Nincs bejelentkezve" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ ok: false, error: "Csak admin hívhat meg könyvelőt" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "Érvénytelen email" }, 400);

    // Record invite (upsert)
    const { error: invErr } = await admin.from("pending_accountant_invites").upsert(
      { email, invited_by: user.id, invited_at: new Date().toISOString(), accepted_at: null, accepted_user_id: null },
      { onConflict: "email" }
    );
    if (invErr) return json({ ok: false, error: invErr.message }, 500);

    // Origin for redirect
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const redirectTo = `${origin}/konyvelo`;

    // Try Supabase invite (sends email if SMTP configured)
    let invite_link: string | null = null;
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteErr && !/already.*registered|already exists/i.test(inviteErr.message)) {
      // Fallback: generate magic link
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      invite_link = linkData?.properties?.action_link ?? null;
    } else if (invited) {
      // Generate a viewable backup link too
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      invite_link = linkData?.properties?.action_link ?? null;
    } else {
      // User already exists — just generate a magic link
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      invite_link = linkData?.properties?.action_link ?? null;

      // If existing user, grant role immediately
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === email);
      if (existing) {
        await admin.from("user_roles").upsert({ user_id: existing.id, role: "accountant" }, { onConflict: "user_id,role" });
        await admin.from("pending_accountant_invites").update({ accepted_at: new Date().toISOString(), accepted_user_id: existing.id }).eq("email", email);
      }
    }

    return json({ ok: true, invite_link });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
