// APEX Communication API — partnerek saját API-kulccsal küldhetnek és kérdezhetnek le üzeneteket.
// Hitelesítés: X-API-Key fejléc. A kulcsból csak hash tárolódik.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  CHANNELS,
  type Channel,
  adminClient,
  authenticateApiKey,
  deliver,
  enqueueWebhook,
  json,
  logEvent,
  rateLimitApiKey,
  renderTemplate,
  requireScope,
  trackUsage,
} from "../_shared/comm-core.ts";

const isUuid = (v: unknown) =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = adminClient();
  const auth = await authenticateApiKey(db, req);
  if (!auth.ok) return auth.response;
  const ctx = auth.ctx;

  const limited = await rateLimitApiKey(db, ctx);
  if (limited) return limited;

  const url = new URL(req.url);
  const path =
    url.pathname.replace(/^(\/functions\/v1)?\/apex-comm-api/, "").replace(/\/+$/, "") || "/";

  /* ---- GET /messages/:id ---- */
  if (req.method === "GET" && path.startsWith("/messages/")) {
    const denied = requireScope(ctx, "messages:read");
    if (denied) return denied;
    const id = path.split("/")[2];
    if (!isUuid(id)) return json({ error: "invalid_id" }, 400);
    const { data } = await db
      .from("messaging_outbox")
      .select("id, channel, to_address, status, provider, provider_message_id, error, attempts, created_at, sent_at, delivered_at")
      .eq("id", id)
      .eq("partner_id", ctx.partnerId)
      .maybeSingle();
    if (!data) return json({ error: "not_found" }, 404);
    return json({ message: data });
  }

  /* ---- GET /messages ---- */
  if (req.method === "GET" && path === "/messages") {
    const denied = requireScope(ctx, "messages:read");
    if (denied) return denied;
    const limit = Math.min(Number(url.searchParams.get("limit") || 50) || 50, 200);
    const { data } = await db
      .from("messaging_outbox")
      .select("id, channel, to_address, status, provider, error, created_at, sent_at, delivered_at")
      .eq("partner_id", ctx.partnerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return json({ messages: data || [] });
  }

  /* ---- GET /usage ---- */
  if (req.method === "GET" && path === "/usage") {
    const denied = requireScope(ctx, "messages:read");
    if (denied) return denied;
    const { data } = await db
      .from("comm_usage")
      .select("day, channel, provider, sent_count, failed_count, cost_total")
      .eq("partner_id", ctx.partnerId)
      .order("day", { ascending: false })
      .limit(90);
    return json({ usage: data || [] });
  }

  /* ---- POST /messages (küldés) ---- */
  if (req.method === "POST" && (path === "/messages" || path === "/")) {
    const denied = requireScope(ctx, "messages:send");
    if (denied) return denied;

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return json({ error: "invalid_body" }, 400);
    }

    const channel = String(payload.channel || "sms") as Channel;
    if (!CHANNELS.includes(channel)) return json({ error: "invalid_channel" }, 400);

    const to = typeof payload.to === "string" ? payload.to.trim() : "";
    if (!to || to.length > 40) return json({ error: "invalid_recipient" }, 400);
    if (channel !== "email" && !/^\+?[0-9\s\-()]{6,20}$/.test(to.replace(/^whatsapp:/, ""))) {
      return json({ error: "invalid_phone" }, 400);
    }

    const idempotencyKey =
      typeof payload.idempotencyKey === "string" && payload.idempotencyKey.length <= 120
        ? payload.idempotencyKey
        : req.headers.get("idempotency-key")?.slice(0, 120) || null;

    if (idempotencyKey) {
      const { data: prior } = await db
        .from("messaging_outbox")
        .select("id, status, provider, error")
        .eq("partner_id", ctx.partnerId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (prior) return json({ id: prior.id, status: prior.status, duplicate: true });
    }

    let body = typeof payload.body === "string" ? payload.body : "";
    const templateKey = typeof payload.templateKey === "string" ? payload.templateKey : null;
    const vars = (payload.variables && typeof payload.variables === "object"
      ? payload.variables
      : {}) as Record<string, unknown>;

    if (templateKey) {
      const { data: tpl } = await db
        .from("messaging_templates")
        .select("body, active")
        .eq("key", templateKey)
        .maybeSingle();
      if (!tpl || !tpl.active) return json({ error: "template_not_found" }, 404);
      body = renderTemplate(tpl.body, vars);
    }
    body = body.trim();
    if (!body) return json({ error: "empty_body" }, 400);
    if (body.length > 1600) body = body.slice(0, 1600);

    const { data: inserted, error } = await db
      .from("messaging_outbox")
      .insert({
        channel,
        to_address: to,
        template_key: templateKey,
        body,
        partner_id: ctx.partnerId,
        api_key_id: ctx.id,
        idempotency_key: idempotencyKey,
        related_type: typeof payload.relatedType === "string" ? payload.relatedType.slice(0, 60) : null,
        related_id: isUuid(payload.relatedId) ? (payload.relatedId as string) : null,
        status: "queued",
      })
      .select("id")
      .single();
    if (error || !inserted) return json({ error: "queue_failed" }, 500);

    await logEvent(db, {
      messageId: inserted.id,
      partnerId: ctx.partnerId,
      event: "message.queued",
      channel,
      detail: { via: "api" },
    });

    const r = await deliver(channel, to, body, { db, partnerId: ctx.partnerId });
    await db
      .from("messaging_outbox")
      .update({
        status: r.status,
        provider: r.provider,
        provider_message_id: r.providerId ?? null,
        error: r.error ?? null,
        attempts: 1,
        sent_at: r.status === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", inserted.id);

    const eventName = r.status === "sent" ? "message.sent" : r.status === "failed" ? "message.failed" : "message.pending";
    await logEvent(db, {
      messageId: inserted.id,
      partnerId: ctx.partnerId,
      event: eventName,
      channel,
      provider: r.provider,
      detail: { error: r.error ?? null },
    });
    if (r.status !== "no_provider") {
      await trackUsage(db, {
        partnerId: ctx.partnerId,
        channel,
        provider: r.provider,
        outcome: r.status === "sent" ? "sent" : "failed",
      });
    }
    await enqueueWebhook(db, ctx.partnerId, eventName, {
      id: inserted.id,
      channel,
      to,
      status: r.status,
      provider: r.provider,
      error: r.error ?? null,
    });

    return json(
      { id: inserted.id, status: r.status, provider: r.provider, error: r.error ?? null },
      r.status === "failed" ? 502 : 200,
    );
  }

  return json({ error: "not_found" }, 404);
});
