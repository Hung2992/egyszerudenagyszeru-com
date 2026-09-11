// Ügyfél → partner üzenet a saját APEX kommunikációs rétegen keresztül.
// Az ügyfél SOHA nem adhat meg tetszőleges telefonszámot: a címzett mindig a
// partner adatbázisban tárolt saját elérhetősége.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { rateLimitDb } from "../_shared/internal-auth.ts";
import { gatewaySend } from "../_shared/gateway-drivers.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const limited = await rateLimitDb(req, { limit: 5, windowSeconds: 300, key: "customer-contact-partner" });
  if (limited) return limited;

  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const user = userRes?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (!payload || typeof payload !== "object") return json({ error: "invalid_body" }, 400);

  const partnerId = String(payload.partner_id || "");
  const channel = String(payload.channel || "");
  const message = String(payload.message || "").trim();

  if (!UUID.test(partnerId)) return json({ error: "invalid_partner_id" }, 400);
  if (!["sms", "whatsapp"].includes(channel)) return json({ error: "invalid_channel" }, 400);
  if (message.length < 3 || message.length > 500) return json({ error: "invalid_message" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: partner } = await admin
    .from("partners")
    .select("id, phone, company_name, full_name, is_active")
    .eq("id", partnerId)
    .maybeSingle();

  if (!partner || partner.is_active === false) return json({ error: "partner_not_available" }, 404);
  if (!partner.phone) return json({ status: "no_recipient", error: "A partner nem adott meg elérhetőséget." }, 409);

  const body = `Ügyfélüzenet (${user.email}): ${message}`;

  const { data: row, error: insErr } = await admin
    .from("messaging_outbox")
    .insert({
      channel,
      to_address: partner.phone,
      body,
      status: "queued",
      partner_id: partnerId,
      related_type: "customer_message",
      metadata: { customer_user_id: user.id, customer_email: user.email },
    })
    .select("id")
    .single();
  if (insErr) return json({ error: "queue_failed" }, 500);

  const result = await gatewaySend(admin, {
    channel: channel as "sms" | "whatsapp",
    to: partner.phone,
    body,
    partnerId,
  });

  await admin.from("messaging_outbox").update({
    status: result.status === "sent" ? "sent" : result.status === "no_provider" ? "no_provider" : "failed",
    provider: result.provider ?? null,
    provider_message_id: (result as any).providerMessageId ?? null,
    error: (result as any).error ?? null,
    sent_at: result.status === "sent" ? new Date().toISOString() : null,
  }).eq("id", row.id);

  return json({
    ok: true,
    id: row.id,
    status: result.status,
    note: result.status === "no_provider"
      ? "Az üzenet rögzítve, de nincs bekötött távközlési szolgáltató – fizikai kézbesítés nem történt."
      : undefined,
  });
});
