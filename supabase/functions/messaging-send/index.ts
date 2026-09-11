import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin, rateLimitDb } from "../_shared/internal-auth.ts";
import { gatewaySend } from "../_shared/gateway-drivers.ts";
import { isOptedOut } from "../_shared/comm-core.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CHANNELS = ["sms", "whatsapp", "voice", "email"] as const;
type Channel = (typeof CHANNELS)[number];

function render(body: string, vars: Record<string, unknown>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => {
    const v = vars?.[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/**
 * Saját kézbesítési réteg. Ha van bekötött távközlési szolgáltató (Twilio a Lovable
 * gatewayen keresztül), valóban kimegy az üzenet; ha nincs, az üzenet a saját
 * kimenő listán marad `no_provider` állapotban — soha nem jelentünk hamis kézbesítést.
 */
async function deliver(channel: Channel, to: string, body: string, partnerId?: string | null) {
  // 0) Opt-out: leiratkozott címzettnek soha nem küldünk (STOP kezelés).
  if (channel === "sms" || channel === "whatsapp" || channel === "voice") {
    if (await isOptedOut(admin(), channel, to, partnerId ?? null)) {
      return { status: "failed", provider: null, error: "opted_out" };
    }
  }
  // 1) Saját APEX átjáró: partner saját szolgáltatói fiókjai, majd a platform fiókjai.
  if (channel !== "email") {
    const own = await gatewaySend(admin(), {
      channel: channel as "sms" | "whatsapp" | "voice",
      to,
      body,
      partnerId: partnerId ?? null,
    });
    if (own.status !== "no_provider") return own;
  }
  return await deliverLegacy(channel, to, body);
}

async function deliverLegacy(channel: Channel, to: string, body: string) {
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const FROM_SMS = Deno.env.get("MESSAGING_FROM_NUMBER");
  const FROM_WA = Deno.env.get("MESSAGING_WHATSAPP_FROM");

  if (channel === "email") {
    return { status: "no_provider", provider: null, error: "Az e-mail a tranzakciós rendszeren megy" };
  }

  // Saját Twilio fiók (közvetlen API) elsőbbséget élvez, utána a gateway-es kapcsolat.
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
    const res = await post("/Messages.json", { To: target, From: from, Body: body });
    const txt = await res.text();
    if (!res.ok) return { status: "failed", provider, error: `${res.status}: ${txt.slice(0, 300)}` };
    return { status: "sent", provider, providerId: JSON.parse(txt)?.sid ?? null };
  } catch (e) {
    return { status: "failed", provider, error: String(e).slice(0, 300) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const guard = await requireInternalOrAdmin(req);
  if (!guard.ok) return guard.response;

  const limited = await rateLimitDb(req, { limit: 120, windowSeconds: 60, key: "messaging-send" });
  if (limited) return limited;

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Érvénytelen kérés" }, 400);
  }
  if (!payload || typeof payload !== "object") return json({ error: "Érvénytelen kérés" }, 400);

  const db = admin();
  const action = typeof payload.action === "string" ? payload.action : "send";

  if (action === "dispatch") {
    const { data: due } = await db
      .from("messaging_outbox")
      .select("id, channel, to_address, body, attempts, partner_id")
      .in("status", ["queued", "no_provider"])
      .lte("send_at", new Date().toISOString())
      .order("send_at")
      .limit(50);

    let sent = 0, failed = 0, pending = 0;
    for (const row of due || []) {
      const r = await deliver(row.channel as Channel, row.to_address, row.body, row.partner_id);
      await db
        .from("messaging_outbox")
        .update({
          status: r.status,
          provider: r.provider,
          provider_message_id: (r as { providerId?: string }).providerId ?? null,
          error: r.error ?? null,
          attempts: (row.attempts ?? 0) + 1,
          sent_at: r.status === "sent" ? new Date().toISOString() : null,
        })
        .eq("id", row.id);
      if (r.status === "sent") sent++;
      else if (r.status === "failed") failed++;
      else pending++;
    }
    return json({ ok: true, processed: (due || []).length, sent, failed, pending });
  }

  const channel = String(payload.channel || "sms") as Channel;
  if (!CHANNELS.includes(channel)) return json({ error: "Ismeretlen csatorna" }, 400);
  const to = typeof payload.to === "string" ? payload.to.trim() : "";
  if (!to || to.length > 40) return json({ error: "Érvénytelen címzett" }, 400);

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
    if (!tpl || !tpl.active) return json({ error: "Sablon nem található vagy inaktív" }, 404);
    body = render(tpl.body, vars);
  }
  body = body.trim();
  if (!body) return json({ error: "Üres üzenet" }, 400);
  if (body.length > 1600) body = body.slice(0, 1600);

  const { data: inserted, error } = await db
    .from("messaging_outbox")
    .insert({
      channel,
      to_address: to,
      template_key: templateKey,
      body,
      partner_id: typeof payload.partnerId === "string" ? payload.partnerId : null,
      related_type: typeof payload.relatedType === "string" ? payload.relatedType : null,
      related_id: typeof payload.relatedId === "string" ? payload.relatedId : null,
      status: "queued",
    })
    .select("id")
    .single();
  if (error) return json({ error: "Nem sikerült rögzíteni az üzenetet" }, 500);

  const r = await deliver(channel, to, body, typeof payload.partnerId === "string" ? payload.partnerId : null);
  await db
    .from("messaging_outbox")
    .update({
      status: r.status,
      provider: r.provider,
      provider_message_id: (r as { providerId?: string }).providerId ?? null,
      error: r.error ?? null,
      attempts: 1,
      sent_at: r.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", inserted.id);

  return json({ ok: r.status === "sent", id: inserted.id, status: r.status, error: r.error ?? null });
});
