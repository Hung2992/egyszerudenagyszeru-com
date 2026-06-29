import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMAIL_LIMIT_PER_HOUR = 3;
const IP_LIMIT_PER_HOUR = 10;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.toLowerCase().trim()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, redirectTo } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ua = req.headers.get("user-agent") || "";
    const emailHash = await sha256(email);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: emailCount } = await admin
      .from("password_recovery_requests")
      .select("id", { count: "exact", head: true })
      .eq("email_hash", emailHash)
      .gte("created_at", since);
    const { count: ipCount } = await admin
      .from("password_recovery_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);

    const limited = (emailCount ?? 0) >= EMAIL_LIMIT_PER_HOUR || (ipCount ?? 0) >= IP_LIMIT_PER_HOUR;

    if (limited) {
      await admin.from("password_recovery_requests").insert({
        email, email_hash: emailHash, ip, user_agent: ua,
        success: false, rate_limited: true, error_reason: "rate_limit_exceeded",
      });
      await admin.from("password_recovery_events").insert({
        event_type: "request_rate_limited", email_hash: emailHash,
        metadata: { ip_count: ipCount, email_count: emailCount },
      });
      if ((ipCount ?? 0) >= IP_LIMIT_PER_HOUR) {
        await admin.from("admin_notifications").insert({
          type: "security",
          title: "Jelszó visszaállítás: gyanús IP",
          message: `IP ${ip} túl sok jelszó-visszaállító kérést küldött (${ipCount} / óra).`,
          metadata: { ip, ip_count: ipCount, email_hash: emailHash },
        });
      }
      return new Response(JSON.stringify({ ok: true, rateLimited: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${new URL(req.url).origin}/reset-password`,
    });

    await admin.from("password_recovery_requests").insert({
      email, email_hash: emailHash, ip, user_agent: ua,
      success: !error, rate_limited: false, error_reason: error?.message ?? null,
    });
    await admin.from("password_recovery_events").insert({
      event_type: "request_submitted", email_hash: emailHash,
      metadata: { success: !error, error: error?.message ?? null },
    });

    return new Response(JSON.stringify({ ok: true, rateLimited: false }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
