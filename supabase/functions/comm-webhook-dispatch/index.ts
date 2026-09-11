// APEX Communication — webhook kézbesítő újrapróbálkozással és HMAC aláírással.
// Csak belső (cron / service) vagy admin hívó indíthatja.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";
import { adminClient, hmacHex, json } from "../_shared/comm-core.ts";

const MAX_ATTEMPTS = 6;
const backoffMinutes = (attempt: number) => Math.min(2 ** attempt, 120);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const guard = await requireInternalOrAdmin(req);
  if (!guard.ok) return guard.response;

  const db = adminClient();
  const now = new Date().toISOString();

  const { data: due } = await db
    .from("comm_webhook_deliveries")
    .select("id, webhook_id, event, payload, attempts")
    .in("status", ["queued", "retry"])
    .lte("next_retry_at", now)
    .order("next_retry_at")
    .limit(50);

  let delivered = 0, failed = 0, retried = 0;

  for (const row of due || []) {
    const { data: hook } = await db
      .from("comm_webhooks")
      .select("url, secret, active")
      .eq("id", row.webhook_id)
      .maybeSingle();

    if (!hook || !hook.active) {
      await db.from("comm_webhook_deliveries")
        .update({ status: "cancelled", error: "A webhook nem aktív" })
        .eq("id", row.id);
      continue;
    }

    const attempt = (row.attempts ?? 0) + 1;
    const bodyText = JSON.stringify({ event: row.event, data: row.payload, timestamp: now });
    let responseCode: number | null = null;
    let error: string | null = null;

    try {
      const signature = await hmacHex(hook.secret, bodyText);
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Apex-Event": row.event,
          "X-Apex-Signature": `sha256=${signature}`,
          "X-Apex-Delivery": row.id,
        },
        body: bodyText,
        signal: AbortSignal.timeout(10_000),
      });
      responseCode = res.status;
      if (!res.ok) error = `${res.status}: ${(await res.text()).slice(0, 200)}`;
    } catch (e) {
      error = String(e).slice(0, 200);
    }

    if (!error) {
      delivered++;
      await db.from("comm_webhook_deliveries")
        .update({ status: "delivered", attempts: attempt, response_code: responseCode, error: null, next_retry_at: null })
        .eq("id", row.id);
    } else if (attempt >= MAX_ATTEMPTS) {
      failed++;
      await db.from("comm_webhook_deliveries")
        .update({ status: "failed", attempts: attempt, response_code: responseCode, error, next_retry_at: null })
        .eq("id", row.id);
    } else {
      retried++;
      const next = new Date(Date.now() + backoffMinutes(attempt) * 60_000).toISOString();
      await db.from("comm_webhook_deliveries")
        .update({ status: "retry", attempts: attempt, response_code: responseCode, error, next_retry_at: next })
        .eq("id", row.id);
    }
  }

  return json({ ok: true, processed: (due || []).length, delivered, retried, failed });
});
