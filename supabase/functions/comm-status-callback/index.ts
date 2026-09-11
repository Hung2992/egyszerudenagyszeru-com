// APEX Communication — szolgáltatói kézbesítési státusz visszahívás (Twilio StatusCallback).
// Publikus végpont: csak a szolgáltatói üzenetazonosító alapján frissít, más adatot nem fogad el.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { rateLimit } from "../_shared/internal-auth.ts";
import { adminClient, enqueueWebhook, json, logEvent } from "../_shared/comm-core.ts";

const MAP: Record<string, string> = {
  queued: "queued",
  sending: "sent",
  sent: "sent",
  delivered: "delivered",
  read: "delivered",
  undelivered: "failed",
  failed: "failed",
  canceled: "failed",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const limited = rateLimit(req, { limit: 300, windowMs: 60_000, key: "comm-status" });
  if (limited) return limited;

  let sid = "";
  let rawStatus = "";
  let errorCode = "";
  try {
    const form = await req.formData();
    sid = String(form.get("MessageSid") || form.get("CallSid") || "").trim();
    rawStatus = String(form.get("MessageStatus") || form.get("CallStatus") || "").toLowerCase();
    errorCode = String(form.get("ErrorCode") || "");
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  if (!sid || sid.length > 64 || !MAP[rawStatus]) return json({ error: "invalid_status" }, 400);

  const db = adminClient();
  const { data: msg } = await db
    .from("messaging_outbox")
    .select("id, partner_id, channel, provider, to_address")
    .eq("provider_message_id", sid)
    .maybeSingle();
  if (!msg) return json({ ok: true, matched: false });

  const status = MAP[rawStatus];
  await db
    .from("messaging_outbox")
    .update({
      status,
      delivered_at: status === "delivered" ? new Date().toISOString() : null,
      error: status === "failed" ? `provider_status:${rawStatus}${errorCode ? ` (${errorCode})` : ""}` : null,
    })
    .eq("id", msg.id);

  const event = status === "delivered" ? "message.delivered" : status === "failed" ? "message.failed" : "message.sent";
  await logEvent(db, {
    messageId: msg.id,
    partnerId: msg.partner_id,
    event,
    channel: msg.channel,
    provider: msg.provider,
    detail: { provider_status: rawStatus, error_code: errorCode || null },
  });
  await enqueueWebhook(db, msg.partner_id, event, {
    id: msg.id,
    channel: msg.channel,
    to: msg.to_address,
    status,
    provider_status: rawStatus,
  });

  return json({ ok: true, matched: true, status });
});
