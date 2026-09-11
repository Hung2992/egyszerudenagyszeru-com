// APEX Communication — bejövő üzenetek fogadása (kétsirányos SMS/WhatsApp).
// Szolgáltatói webhook: Twilio form-data VAGY általános JSON (saját átjáró).
// Feladatai: bejövő üzenet naplózása, STOP/START kulcsszavak (opt-out/opt-in),
// esemény + partner webhook továbbítás. Nyilvános végpont, de csak validált
// mezőket dolgoz fel, és semmi bizalmas adatot nem ad vissza.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { rateLimit } from "../_shared/internal-auth.ts";
import {
  adminClient,
  enqueueWebhook,
  json,
  logEvent,
  normalizeAddress,
} from "../_shared/comm-core.ts";

const OPT_OUT_WORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "leiratkozas", "leiratkozom"]);
const OPT_IN_WORDS = new Set(["start", "yes", "subscribe", "feliratkozas", "feliratkozom"]);

type Inbound = { from: string; body: string; providerId: string | null };

async function parseInbound(req: Request): Promise<Inbound | null> {
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const j = await req.json();
      const from = String(j?.from ?? j?.msisdn ?? j?.sender ?? "").trim();
      const body = String(j?.body ?? j?.message ?? j?.text ?? "").trim();
      const id = j?.id ?? j?.message_id ?? null;
      if (from && body) return { from, body, providerId: id ? String(id).slice(0, 64) : null };
      return null;
    }
    const form = await req.formData();
    const from = String(form.get("From") || "").trim();
    const body = String(form.get("Body") || "").trim();
    const sid = String(form.get("MessageSid") || "").trim();
    if (from && body) return { from, body, providerId: sid ? sid.slice(0, 64) : null };
  } catch {
    return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const limited = rateLimit(req, { limit: 300, windowMs: 60_000, key: "comm-inbound" });
  if (limited) return limited;

  const inbound = await parseInbound(req);
  if (!inbound) return json({ error: "invalid_body" }, 400);
  if (inbound.from.length > 40 || inbound.body.length > 4000) {
    return json({ error: "invalid_body" }, 400);
  }

  const db = adminClient();
  const address = normalizeAddress(inbound.from);
  const channel = /^whatsapp:/i.test(inbound.from) ? "whatsapp" : "sms";

  // Bejövő üzenet tárolása
  const { data: row } = await db
    .from("comm_inbound_messages")
    .insert({
      channel,
      from_address: address,
      body: inbound.body,
      provider_message_id: inbound.providerId,
    })
    .select("id")
    .maybeSingle();

  // STOP / START kulcsszó-feldolgozás
  const keyword = inbound.body.trim().toLowerCase().replace(/[!.]/g, "");
  let action: "opt_out" | "opt_in" | null = null;
  if (OPT_OUT_WORDS.has(keyword)) action = "opt_out";
  else if (OPT_IN_WORDS.has(keyword)) action = "opt_in";

  if (action === "opt_out") {
    await db.from("comm_opt_outs").upsert(
      {
        partner_id: null,
        channel,
        address,
        reason: `inbound:${keyword}`.slice(0, 120),
        opted_out_at: new Date().toISOString(),
        opted_in_at: null,
      },
      { onConflict: "partner_id_key,channel,address" },
    );
  } else if (action === "opt_in") {
    await db
      .from("comm_opt_outs")
      .update({ opted_in_at: new Date().toISOString() })
      .eq("channel", channel)
      .eq("address", address)
      .is("partner_id", null);
  }

  await logEvent(db, {
    messageId: row?.id ?? null,
    event: action ? `message.inbound_${action}` : "message.inbound",
    channel,
    detail: { keyword_action: action, has_provider_id: Boolean(inbound.providerId) },
  });
  // Platform-szintű bejövő esemény — partner webhook csak akkor, ha a szám partnerhez köthető.
  const { data: partnerLink } = await db
    .from("comm_opt_outs")
    .select("partner_id")
    .eq("address", address)
    .not("partner_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (partnerLink?.partner_id) {
    await enqueueWebhook(db, partnerLink.partner_id, "message.inbound", {
      channel,
      from: address,
      action,
    });
  }

  return json({ ok: true, action });
});
