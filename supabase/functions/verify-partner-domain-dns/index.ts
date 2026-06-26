// Verifies partner_domain_requests by resolving TXT and A records.
// Modes:
//   POST { request_id } -> { status, detail }  (single, auth required)
//   POST { scheduled: true } -> { processed, changed } (batch, service-role or admin)
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EXPECTED_A = "185.158.133.1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function checkOne(dr: any) {
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
  return { status, result };
}

async function notifyPartner(dr: any, prevStatus: string, newStatus: string) {
  const { data: p } = await supabase
    .from("partners")
    .select("email, full_name, company_name")
    .eq("id", dr.partner_id)
    .maybeSingle();
  if (!p?.email) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "apikey": SERVICE_ROLE,
      },
      body: JSON.stringify({
        templateName: "partner-domain-dns-status-changed",
        recipientEmail: p.email,
        idempotencyKey: `domain-dns-${dr.id}-${newStatus}-${Date.now()}`,
        templateData: {
          full_name: p.company_name || p.full_name,
          domain: dr.requested_domain,
          previous_status: prevStatus,
          new_status: newStatus,
          portal_url: "https://www.egyszerudenagyszeru.com/partner",
        },
      }),
    });
  } catch (_) { /* swallow */ }

  await supabase.from("admin_notifications").insert({
    type: "partner_domain_dns_change",
    title: `DNS állapot változás: ${dr.requested_domain}`,
    body: `${prevStatus} → ${newStatus}`,
    metadata: { request_id: dr.id, partner_id: dr.partner_id },
  }).then(() => {}, () => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  const body = await req.json().catch(() => ({}));

  // Scheduled batch mode
  if (body?.scheduled === true) {
    const { data: rows } = await supabase
      .from("partner_domain_requests")
      .select("id, partner_id, requested_domain, verification_token, dns_check_status, auto_check_enabled, status")
      .in("status", ["pending", "verifying"])
      .eq("auto_check_enabled", true)
      .limit(50);

    let processed = 0, changed = 0;
    for (const dr of rows || []) {
      const { status, result } = await checkOne(dr);
      const prev = dr.dns_check_status;
      await supabase.from("partner_domain_requests").update({
        dns_check_status: status,
        dns_checked_at: new Date().toISOString(),
        dns_check_result: result,
        last_auto_check_at: new Date().toISOString(),
        status: status === "verified" ? "verifying" : dr.status,
      }).eq("id", dr.id);
      processed++;
      if (prev !== status) {
        changed++;
        await notifyPartner(dr, prev, status);
      }
    }
    return new Response(JSON.stringify({ processed, changed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Single mode (auth)
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/, "");
  const { data: userRes } = await supabase.auth.getUser(jwt);
  const user = userRes?.user;
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const request_id: string | undefined = body?.request_id;
  if (!request_id) return new Response(JSON.stringify({ error: "missing request_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: dr } = await supabase
    .from("partner_domain_requests")
    .select("id, partner_id, requested_domain, verification_token, dns_check_status, status")
    .eq("id", request_id)
    .maybeSingle();
  if (!dr) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = (roles || []).some((r: any) => r.role === "admin");
  if (!isAdmin) {
    const { data: p } = await supabase.from("partners").select("id").eq("id", dr.partner_id).eq("user_id", user.id).maybeSingle();
    if (!p) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { status, result } = await checkOne(dr);
  const prev = dr.dns_check_status;
  await supabase.from("partner_domain_requests").update({
    dns_check_status: status,
    dns_checked_at: new Date().toISOString(),
    dns_check_result: result,
    status: status === "verified" ? "verifying" : "pending",
  }).eq("id", request_id);

  if (prev !== status) await notifyPartner(dr, prev, status);

  return new Response(JSON.stringify({ status, detail: result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
