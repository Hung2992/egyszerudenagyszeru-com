// Saját AI végpont tesztelése (csak admin). Valós hívást indít a megadott szerverre.
import { createClient } from "npm:@supabase/supabase-js@2";
import { callLocalEndpoint } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const endpointId = typeof body?.endpoint_id === "string" ? body.endpoint_id : null;
    if (!endpointId || !/^[0-9a-f-]{36}$/i.test(endpointId)) return json({ error: "invalid_endpoint_id" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: ep } = await admin
      .from("ai_local_endpoints")
      .select("id, name, base_url, api_style, model, api_key, timeout_ms, supports_json")
      .eq("id", endpointId)
      .maybeSingle();
    if (!ep) return json({ error: "not_found" }, 404);

    const started = Date.now();
    try {
      const content = await callLocalEndpoint(ep as never, {
        system: "Rövid teszt. Válaszolj egyetlen szóval.",
        user: "Írd le: OK",
        jsonMode: false,
        maxTokens: 32,
      });
      const ms = Date.now() - started;
      await admin.from("ai_local_endpoints").update({
        last_status: "ok",
        last_checked_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", ep.id);
      return json({ ok: true, latency_ms: ms, sample: content.slice(0, 200) });
    } catch (e) {
      const msg = (e as Error).message?.slice(0, 300) || "unknown";
      await admin.from("ai_local_endpoints").update({
        last_status: "error",
        last_checked_at: new Date().toISOString(),
        last_error: msg,
      }).eq("id", ep.id);
      return json({ ok: false, error: msg, latency_ms: Date.now() - started });
    }
  } catch (e) {
    console.error("ai-local-endpoint-test error", e);
    return json({ error: "server_error" }, 500);
  }
});
