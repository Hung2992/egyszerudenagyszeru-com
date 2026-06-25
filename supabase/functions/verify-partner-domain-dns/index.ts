// Verifies a partner_domain_request by resolving TXT and A records.
// POST { request_id } -> { status: 'verified'|'failed', detail }
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EXPECTED_A = "185.158.133.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  // Auth: must be the partner who owns the request, or admin.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/, "");
  const { data: userRes } = await supabase.auth.getUser(jwt);
  const user = userRes?.user;
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = await req.json().catch(() => ({}));
  const request_id: string | undefined = body?.request_id;
  if (!request_id) return new Response(JSON.stringify({ error: "missing request_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: dr } = await supabase
    .from("partner_domain_requests")
    .select("id, partner_id, requested_domain, verification_token")
    .eq("id", request_id)
    .maybeSingle();
  if (!dr) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Authorization
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = (roles || []).some((r: any) => r.role === "admin");
  if (!isAdmin) {
    const { data: p } = await supabase.from("partners").select("id").eq("id", dr.partner_id).eq("user_id", user.id).maybeSingle();
    if (!p) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const domain = dr.requested_domain;
  const result: any = { domain };
  let status: "verified" | "failed" = "failed";

  try {
    const txts = await Deno.resolveDns(`_lovable_partner.${domain}`, "TXT").catch(() => [] as string[][]);
    const flatTxt = (txts as string[][]).flat().map(s => s.trim());
    result.txt_records = flatTxt;
    const txtOk = flatTxt.includes(dr.verification_token);

    const aRoot = await Deno.resolveDns(domain, "A").catch(() => [] as string[]);
    const aWww = await Deno.resolveDns(`www.${domain}`, "A").catch(() => [] as string[]);
    result.a_root = aRoot;
    result.a_www = aWww;
    const aOk = (aRoot as string[]).includes(EXPECTED_A) || (aWww as string[]).includes(EXPECTED_A);

    result.txt_ok = txtOk;
    result.a_ok = aOk;
    status = (txtOk && aOk) ? "verified" : "failed";
  } catch (e) {
    result.error = String(e);
  }

  await supabase.from("partner_domain_requests").update({
    dns_check_status: status,
    dns_checked_at: new Date().toISOString(),
    dns_check_result: result,
    status: status === "verified" ? "verifying" : "pending",
  }).eq("id", request_id);

  return new Response(JSON.stringify({ status, detail: result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
