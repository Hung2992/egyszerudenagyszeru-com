// APEX Communication — kézbesítési riport (DLR) fogadása.
// Két formátum: Twilio-stílusú űrlap (MessageSid/MessageStatus) és GatewayAPI-stílusú JSON DLR.
// Publikus végpont: csak a szolgáltatói üzenetazonosító alapján frissít, más adatot nem fogad el.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { rateLimit } from "../_shared/internal-auth.ts";
import { adminClient, enqueueWebhook, json, logEvent } from "../_shared/comm-core.ts";

/** Részletes DLR állapotok (a belső státusz + a pontos kézbesítési állapot). */
const DLR: Record<string, { status: string; dlr: string }> = {
  queued: { status: "queued", dlr: "queued" },
  scheduled: { status: "queued", dlr: "queued" },
  buffered: { status: "sent", dlr: "buffered" },
  accepted: { status: "sent", dlr: "accepted" },
  sending: { status: "sent", dlr: "sent" },
  sent: { status: "sent", dlr: "sent" },
  enroute: { status: "sent", dlr: "sent" },
  delivered: { status: "delivered", dlr: "delivered" },
  read: { status: "delivered", dlr: "read" },
  undelivered: { status: "failed", dlr: "undeliverable" },
  undeliverable: { status: "failed", dlr: "undeliverable" },
  rejected: { status: "failed", dlr: "rejected" },
  expired: { status: "failed", dlr: "expired" },
  deleted: { status: "failed", dlr: "expired" },
  failed: { status: "failed", dlr: "failed" },
  canceled: { status: "failed", dlr: "canceled" },
  cancelled: { status: "failed", dlr: "canceled" },
  unknown: { status: "sent", dlr: "unknown" },
};

type Report = { sid: string; raw: string; code: string };

async function parseReport(req: Request): Promise<Report[]> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("json")) {
    const payload = await req.json();
    const list = Array.isArray(payload) ? payload : [payload];
    return list
      .map((p: Record<string, unknown>) => ({
        sid: String(p?.id ?? p?.message_id ?? p?.MessageSid ?? "").trim(),
        raw: String(p?.status ?? p?.MessageStatus ?? "").toLowerCase(),
        code: String(p?.code ?? p?.error ?? p?.ErrorCode ?? ""),
      }))
      .filter((r) => r.sid && r.raw);
  }
  const form = await req.formData();
  const sid = String(form.get("MessageSid") || form.get("CallSid") || "").trim();
  const raw = String(form.get("MessageStatus") || form.get("CallStatus") || "").toLowerCase();
  const code = String(form.get("ErrorCode") || "");
  return sid && raw ? [{ sid, raw, code }] : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const limited = rateLimit(req, { limit: 600, windowMs: 60_000, key: "comm-status" });
  if (limited) return limited;

  let reports: Report[] = [];
  try {
    reports = await parseReport(req);
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!reports.length) return json({ error: "invalid_status" }, 400);

  const db = adminClient();
  let matched = 0;

  for (const rep of reports.slice(0, 100)) {
    if (rep.sid.length > 64) continue;
    const mapped = DLR[rep.raw];
    if (!mapped) continue;

    const { data: msg } = await db
      .from("messaging_outbox")
      .select("id, partner_id, channel, provider, to_address, attempts, max_attempts")
      .eq("provider_message_id", rep.sid)
      .maybeSingle();
    if (!msg) continue;
    matched++;

    const now = new Date().toISOString();
    const retryable = mapped.dlr === "undeliverable" || mapped.dlr === "expired" || mapped.dlr === "failed";
    const attempts = msg.attempts ?? 0;
    const canRetry = retryable && attempts < (msg.max_attempts ?? 3);
    const backoffMin = Math.min(60, 2 ** attempts * 2);

    await db
      .from("messaging_outbox")
      .update({
        status: canRetry ? "queued" : mapped.status,
        dlr_status: mapped.dlr,
        dlr_code: rep.code || null,
        dlr_at: now,
        delivered_at: mapped.status === "delivered" ? now : null,
        error: mapped.status === "failed"
          ? `dlr:${mapped.dlr}${rep.code ? ` (${rep.code})` : ""}`
          : null,
        next_retry_at: canRetry ? new Date(Date.now() + backoffMin * 60_000).toISOString() : null,
      })
      .eq("id", msg.id);

    const event = mapped.status === "delivered"
      ? "message.delivered"
      : mapped.status === "failed"
        ? "message.failed"
        : "message.sent";

    await logEvent(db, {
      messageId: msg.id,
      partnerId: msg.partner_id,
      event,
      channel: msg.channel,
      provider: msg.provider,
      detail: { provider_status: rep.raw, dlr_status: mapped.dlr, error_code: rep.code || null, retry_scheduled: canRetry },
    });
    await enqueueWebhook(db, msg.partner_id, event, {
      id: msg.id,
      channel: msg.channel,
      to: msg.to_address,
      status: mapped.status,
      dlr_status: mapped.dlr,
      error_code: rep.code || null,
    });
  }

  return json({ ok: true, received: reports.length, matched });
});
