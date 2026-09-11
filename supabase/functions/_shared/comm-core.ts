// APEX Communication Platform — közös mag.
// Szolgáltató-független kézbesítés, API-kulcs hitelesítés, események, felhasználás, webhookok.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { gatewaySend, type GatewayChannel } from "./gateway-drivers.ts";

export const CHANNELS = ["sms", "whatsapp", "voice", "email"] as const;
export type Channel = (typeof CHANNELS)[number];

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export function renderTemplate(body: string, vars: Record<string, unknown>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => {
    const v = vars?.[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/* ---------------- API kulcsok ---------------- */

const enc = new TextEncoder();

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ApiKeyContext = {
  id: string;
  partnerId: string | null;
  scopes: string[];
  rateLimitPerMin: number;
};

/** X-API-Key alapú hitelesítés. Csak a kulcs hash-e van tárolva. */
export async function authenticateApiKey(
  db: SupabaseClient,
  req: Request,
): Promise<{ ok: true; ctx: ApiKeyContext } | { ok: false; response: Response }> {
  const raw = req.headers.get("x-api-key") || "";
  if (!raw || raw.length < 20 || raw.length > 200) {
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }
  const hash = await sha256Hex(raw);
  const { data } = await db
    .from("comm_api_keys")
    .select("id, partner_id, scopes, rate_limit_per_min, active, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!data || !data.active || data.revoked_at) {
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }
  await db.from("comm_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return {
    ok: true,
    ctx: {
      id: data.id,
      partnerId: data.partner_id,
      scopes: data.scopes || [],
      rateLimitPerMin: data.rate_limit_per_min ?? 60,
    },
  };
}

export function requireScope(ctx: ApiKeyContext, scope: string): Response | null {
  return ctx.scopes.includes(scope) ? null : json({ error: "forbidden", required_scope: scope }, 403);
}

/** Adatbázis-alapú percenkénti korlát kulcsonként (izolátumok között is működik). */
export async function rateLimitApiKey(
  db: SupabaseClient,
  ctx: ApiKeyContext,
): Promise<Response | null> {
  try {
    const { data, error } = await db.rpc("hit_rate_limit", {
      _key: `commapi:${ctx.id}`,
      _limit: ctx.rateLimitPerMin,
      _window_seconds: 60,
    });
    if (error) return null;
    if (data === false) {
      return json({ error: "rate_limited", limit_per_min: ctx.rateLimitPerMin }, 429);
    }
  } catch {
    return null;
  }
  return null;
}

/* ---------------- Kézbesítés ---------------- */

export type DeliveryResult = {
  status: "sent" | "failed" | "no_provider";
  provider: string | null;
  providerId?: string | null;
  error?: string | null;
};

/**
 * Szolgáltató-független küldés.
 * 1) A saját APEX átjáró (partner saját, majd platform szolgáltatói fiókjai).
 * 2) Ha ott nincs bekötött fiók, a régi környezeti Twilio útvonal.
 */
export async function deliver(
  channel: Channel,
  to: string,
  body: string,
  opts?: { db?: SupabaseClient; partnerId?: string | null },
): Promise<DeliveryResult> {
  if (channel !== "email") {
    const db = opts?.db ?? adminClient();
    const own = await gatewaySend(db, {
      channel: channel as GatewayChannel,
      to,
      body,
      partnerId: opts?.partnerId ?? null,
    });
    if (own.status !== "no_provider") return own;
  }
  return await deliverLegacy(channel, to, body);
}

async function deliverLegacy(channel: Channel, to: string, body: string): Promise<DeliveryResult> {
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const FROM_SMS = Deno.env.get("MESSAGING_FROM_NUMBER");
  const FROM_WA = Deno.env.get("MESSAGING_WHATSAPP_FROM");
  const STATUS_CALLBACK = Deno.env.get("MESSAGING_STATUS_CALLBACK_URL");

  if (channel === "email") {
    return { status: "no_provider", provider: null, error: "Az e-mail a tranzakciós rendszeren megy" };
  }

  const ownAccount = Boolean(SID && TOKEN);
  const gateway = Boolean(LOVABLE_API_KEY && TWILIO_API_KEY);
  if ((!ownAccount && !gateway) || (!FROM_SMS && !FROM_WA)) {
    return { status: "no_provider", provider: null, error: "Nincs bekötött távközlési szolgáltató" };
  }

  const url = (path: string) =>
    ownAccount
      ? `https://api.twilio.com/2010-04-01/Accounts/${SID}${path}`
      : `https://connector-gateway.lovable.dev/twilio${path}`;
  const authHeaders: Record<string, string> = ownAccount
    ? { Authorization: `Basic ${btoa(`${SID}:${TOKEN}`)}` }
    : { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TWILIO_API_KEY! };
  const provider = ownAccount ? "twilio_own" : "twilio_gateway";

  const post = async (path: string, form: Record<string, string>) =>
    await fetch(url(path), {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form),
    });

  try {
    if (channel === "voice") {
      const res = await post("/Calls.json", {
        To: to,
        From: FROM_SMS || "",
        Twiml: `<Response><Say language="hu-HU">${body.slice(0, 500)}</Say></Response>`,
      });
      const txt = await res.text();
      if (!res.ok) return { status: "failed", provider, error: `${res.status}: ${txt.slice(0, 300)}` };
      return { status: "sent", provider, providerId: JSON.parse(txt)?.sid ?? null };
    }

    const from = channel === "whatsapp" ? `whatsapp:${FROM_WA || FROM_SMS}` : FROM_SMS!;
    const target = channel === "whatsapp" ? `whatsapp:${to.replace(/^whatsapp:/, "")}` : to;
    const form: Record<string, string> = { To: target, From: from, Body: body };
    if (STATUS_CALLBACK) form.StatusCallback = STATUS_CALLBACK;
    const res = await post("/Messages.json", form);
    const txt = await res.text();
    if (!res.ok) return { status: "failed", provider, error: `${res.status}: ${txt.slice(0, 300)}` };
    return { status: "sent", provider, providerId: JSON.parse(txt)?.sid ?? null };
  } catch (e) {
    return { status: "failed", provider, error: String(e).slice(0, 300) };
  }
}

/* ---------------- Események, felhasználás, webhookok ---------------- */

export async function logEvent(
  db: SupabaseClient,
  input: {
    messageId?: string | null;
    partnerId?: string | null;
    event: string;
    channel?: string | null;
    provider?: string | null;
    detail?: Record<string, unknown>;
  },
) {
  await db.from("comm_events").insert({
    message_id: input.messageId ?? null,
    partner_id: input.partnerId ?? null,
    event: input.event,
    channel: input.channel ?? null,
    provider: input.provider ?? null,
    detail: input.detail ?? {},
  });
}

export async function trackUsage(
  db: SupabaseClient,
  input: { partnerId: string | null; channel: string; provider: string | null; outcome: "sent" | "failed" },
) {
  const day = new Date().toISOString().slice(0, 10);
  const { data: price } = await db
    .from("comm_providers")
    .select("unit_cost")
    .eq("channel", input.channel)
    .eq("provider", input.provider ?? "")
    .maybeSingle();
  const cost = input.outcome === "sent" ? Number(price?.unit_cost ?? 0) : 0;

  let q = db
    .from("comm_usage")
    .select("id, sent_count, failed_count, cost_total")
    .eq("day", day)
    .eq("channel", input.channel);
  q = input.partnerId ? q.eq("partner_id", input.partnerId) : q.is("partner_id", null);
  q = input.provider ? q.eq("provider", input.provider) : q.is("provider", null);
  const { data: existing } = await q.maybeSingle();

  if (existing) {
    await db
      .from("comm_usage")
      .update({
        sent_count: existing.sent_count + (input.outcome === "sent" ? 1 : 0),
        failed_count: existing.failed_count + (input.outcome === "failed" ? 1 : 0),
        cost_total: Number(existing.cost_total) + cost,
      })
      .eq("id", existing.id);
  } else {
    await db.from("comm_usage").insert({
      partner_id: input.partnerId,
      day,
      channel: input.channel,
      provider: input.provider,
      sent_count: input.outcome === "sent" ? 1 : 0,
      failed_count: input.outcome === "failed" ? 1 : 0,
      cost_total: cost,
    });
  }
}

/** Esemény sorba állítása a partner webhookjaihoz (kézbesítés külön futtatóval). */
export async function enqueueWebhook(
  db: SupabaseClient,
  partnerId: string | null,
  event: string,
  payload: Record<string, unknown>,
) {
  if (!partnerId) return;
  const { data: hooks } = await db
    .from("comm_webhooks")
    .select("id, events, active")
    .eq("partner_id", partnerId)
    .eq("active", true);
  const rows = (hooks || [])
    .filter((h) => (h.events || []).includes(event))
    .map((h) => ({ webhook_id: h.id, event, payload, status: "queued", next_retry_at: new Date().toISOString() }));
  if (rows.length) await db.from("comm_webhook_deliveries").insert(rows);
}
