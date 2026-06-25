// Validates a partner storefront preview token and logs the access.
// POST { token } -> { ok, storefront_id, slug } or 403/410
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token;
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "missing token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req.headers.get("user-agent") ?? null;

    const { data: t } = await supabase
      .from("partner_storefront_preview_tokens")
      .select("id, storefront_id, expires_at, revoked_at, max_uses, use_count")
      .eq("token", token)
      .maybeSingle();

    let outcome = "allowed";
    let status = 200;
    let payload: Record<string, unknown> = { ok: true };

    if (!t) { outcome = "not_found"; status = 404; payload = { error: "invalid token" }; }
    else if (t.revoked_at) { outcome = "revoked"; status = 410; payload = { error: "token revoked" }; }
    else if (t.expires_at && new Date(t.expires_at) < new Date()) { outcome = "expired"; status = 410; payload = { error: "token expired" }; }
    else if (t.max_uses != null && t.use_count >= t.max_uses) { outcome = "exhausted"; status = 410; payload = { error: "max uses reached" }; }
    else {
      const { data: sf } = await supabase
        .from("partner_storefronts")
        .select("slug")
        .eq("id", t.storefront_id)
        .maybeSingle();
      payload = { ok: true, storefront_id: t.storefront_id, slug: sf?.slug };

      await supabase.from("partner_storefront_preview_tokens").update({
        use_count: (t.use_count ?? 0) + 1,
        last_accessed_at: new Date().toISOString(),
        last_accessed_ip: ip,
        last_accessed_user_agent: ua,
      }).eq("id", t.id);
    }

    // Always log (even denials, for security visibility).
    if (t) {
      await supabase.from("partner_storefront_preview_access_log").insert({
        token_id: t.id,
        storefront_id: t.storefront_id,
        ip, user_agent: ua, outcome,
      });
    }

    return new Response(JSON.stringify(payload), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
