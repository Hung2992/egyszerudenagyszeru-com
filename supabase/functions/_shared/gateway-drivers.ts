// APEX saját átjáró (gateway) — szolgáltató-illesztők és útvonalválasztás.
// A partner saját fiókja elsőbbséget élvez a platform fiókjaival szemben.
// Támogatott illesztők: apex_modem (saját GSM/LTE modem bridge), http_generic, twilio, gatewayapi.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type GatewayChannel = "sms" | "whatsapp" | "voice";

export type GatewayResult = {
  status: "sent" | "failed" | "no_provider";
  provider: string | null;
  providerId?: string | null;
  error?: string | null;
};

/* ---------- Hitelesítő adatok titkosítása (AES-GCM) ---------- */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function cryptoKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("COMM_CREDENTIAL_KEY");
  if (!secret) throw new Error("COMM_CREDENTIAL_KEY hiányzik");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptCredentials(value: Record<string, string>): Promise<string> {
  const key = await cryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(value))),
  );
  const merged = new Uint8Array(iv.length + cipher.length);
  merged.set(iv);
  merged.set(cipher, iv.length);
  return btoa(String.fromCharCode(...merged));
}

export async function decryptCredentials(payload: string): Promise<Record<string, string>> {
  const key = await cryptoKey();
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return JSON.parse(decoder.decode(plain));
}

/* ---------- Illesztők ---------- */

export type ProviderAccount = {
  id: string;
  partner_id: string | null;
  label: string;
  driver: "twilio" | "gatewayapi" | "http_generic" | "apex_modem";
  channels: string[];
  endpoint: string | null;
  credentials_encrypted: string | null;
  default_sender: string | null;
};

async function sendTwilio(
  acc: ProviderAccount,
  creds: Record<string, string>,
  channel: GatewayChannel,
  to: string,
  body: string,
  sender: string,
): Promise<GatewayResult> {
  const sid = creds.account_sid;
  const token = creds.auth_token;
  if (!sid || !token) return { status: "failed", provider: acc.label, error: "Hiányzó Twilio azonosítók" };
  const base = acc.endpoint || `https://api.twilio.com/2010-04-01/Accounts/${sid}`;
  const auth = { Authorization: `Basic ${btoa(`${sid}:${token}`)}` };
  const statusCallback = Deno.env.get("MESSAGING_STATUS_CALLBACK_URL");

  const path = channel === "voice" ? "/Calls.json" : "/Messages.json";
  const form: Record<string, string> =
    channel === "voice"
      ? { To: to, From: sender, Twiml: `<Response><Say language="hu-HU">${body.slice(0, 500)}</Say></Response>` }
      : {
          To: channel === "whatsapp" ? `whatsapp:${to.replace(/^whatsapp:/, "")}` : to,
          From: channel === "whatsapp" ? `whatsapp:${sender.replace(/^whatsapp:/, "")}` : sender,
          Body: body,
        };
  if (statusCallback && channel !== "voice") form.StatusCallback = statusCallback;

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
  const text = await res.text();
  if (!res.ok) return { status: "failed", provider: acc.label, error: `${res.status}: ${text.slice(0, 300)}` };
  let sid2: string | null = null;
  try {
    sid2 = JSON.parse(text)?.sid ?? null;
  } catch { /* nem JSON */ }
  return { status: "sent", provider: acc.label, providerId: sid2 };
}

async function sendGatewayApi(
  acc: ProviderAccount,
  creds: Record<string, string>,
  channel: GatewayChannel,
  to: string,
  body: string,
  sender: string,
): Promise<GatewayResult> {
  if (channel !== "sms") return { status: "failed", provider: acc.label, error: "Ez a szolgáltató csak SMS-t támogat" };
  const token = creds.api_token;
  if (!token) return { status: "failed", provider: acc.label, error: "Hiányzó API token" };
  const base = acc.endpoint || "https://gatewayapi.com/rest";
  const msisdn = Number(to.replace(/[^0-9]/g, ""));
  if (!msisdn) return { status: "failed", provider: acc.label, error: "Érvénytelen telefonszám" };

  const res = await fetch(`${base}/mtsms`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sender, message: body, recipients: [{ msisdn }] }),
  });
  const text = await res.text();
  if (!res.ok) return { status: "failed", provider: acc.label, error: `${res.status}: ${text.slice(0, 300)}` };
  let id: string | null = null;
  try {
    id = String(JSON.parse(text)?.ids?.[0] ?? "") || null;
  } catch { /* nem JSON */ }
  return { status: "sent", provider: acc.label, providerId: id };
}

async function sendHttpGeneric(
  acc: ProviderAccount,
  creds: Record<string, string>,
  channel: GatewayChannel,
  to: string,
  body: string,
  sender: string,
): Promise<GatewayResult> {
  if (!acc.endpoint) return { status: "failed", provider: acc.label, error: "Hiányzó végpont" };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (creds.auth_header && creds.auth_value) headers[creds.auth_header] = creds.auth_value;
  else if (creds.bearer_token) headers.Authorization = `Bearer ${creds.bearer_token}`;
  else if (creds.basic_user && creds.basic_pass) {
    headers.Authorization = `Basic ${btoa(`${creds.basic_user}:${creds.basic_pass}`)}`;
  }

  const res = await fetch(acc.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ channel, to, from: sender, message: body }),
  });
  const text = await res.text();
  if (!res.ok) return { status: "failed", provider: acc.label, error: `${res.status}: ${text.slice(0, 300)}` };
  let id: string | null = null;
  try {
    const parsed = JSON.parse(text);
    id = parsed?.id ?? parsed?.message_id ?? null;
  } catch { /* nem JSON */ }
  return { status: "sent", provider: acc.label, providerId: id };
}

/**
 * Saját GSM/LTE modem illesztő (APEX Modem Bridge).
 * A modem mellé telepített bridge szoftver HTTP API-ját hívja:
 *   POST {endpoint}/send  { to, message, sender_id, reference, dlr_url }
 *   válasz: { ok: true, id: "<modem oldali azonosító>" }
 * A bridge a kézbesítési riportokat a dlr_url-re (comm-status-callback) küldi.
 * Csak SMS-t támogat — a modem mobilhálózati SMS-t küld.
 */
async function sendApexModem(
  acc: ProviderAccount,
  creds: Record<string, string>,
  channel: GatewayChannel,
  to: string,
  body: string,
  sender: string,
): Promise<GatewayResult> {
  if (channel !== "sms") {
    return { status: "failed", provider: acc.label, error: "A modem csak SMS-t támogat" };
  }
  if (!acc.endpoint) return { status: "failed", provider: acc.label, error: "Hiányzó modem bridge végpont" };
  if (!creds.modem_token) return { status: "failed", provider: acc.label, error: "Hiányzó modem token" };

  const base = acc.endpoint.replace(/\/+$/, "");
  const dlrUrl = Deno.env.get("MESSAGING_STATUS_CALLBACK_URL") || null;
  const reference = crypto.randomUUID();

  let res: Response;
  try {
    res = await fetch(`${base}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.modem_token}`,
      },
      body: JSON.stringify({
        to,
        message: body,
        sender_id: sender,
        reference,
        dlr_url: dlrUrl,
        sim_slot: creds.sim_slot ? Number(creds.sim_slot) : undefined,
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return { status: "failed", provider: acc.label, error: `modem elérhetetlen: ${String(e).slice(0, 200)}` };
  }

  const text = await res.text();
  if (!res.ok) return { status: "failed", provider: acc.label, error: `${res.status}: ${text.slice(0, 300)}` };

  let id: string | null = null;
  let ok = true;
  try {
    const parsed = JSON.parse(text);
    ok = parsed?.ok !== false;
    id = parsed?.id ?? parsed?.message_id ?? reference;
  } catch {
    id = reference;
  }
  if (!ok) return { status: "failed", provider: acc.label, error: text.slice(0, 300) };
  return { status: "sent", provider: acc.label, providerId: id ?? reference };
}

/* ---------- Ország, tiltólista, átbocsátás ---------- */

/** E.164 alapú országhívószám (a leghosszabb egyező előtag). */
export function countryPrefixOf(to: string): string {
  const digits = to.replace(/[^0-9]/g, "");
  const known = ["1", "7", "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49", "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98", "212", "213", "216", "218", "220", "351", "352", "353", "354", "355", "356", "357", "358", "359", "370", "371", "372", "373", "374", "375", "376", "377", "378", "380", "381", "382", "383", "385", "386", "387", "389", "420", "421", "423", "852", "886", "971", "972", "974", "977", "998"];
  let best = "";
  for (const p of known) if (digits.startsWith(p) && p.length > best.length) best = p;
  return best || digits.slice(0, 2);
}

/** Tiltólistán van-e a címzett vagy az országa (csalás/visszaélés védelem). */
export async function isBlocked(
  db: SupabaseClient,
  channel: GatewayChannel,
  to: string,
): Promise<string | null> {
  const address = to.replace(/^whatsapp:/i, "").replace(/[\s\-()]/g, "");
  const country = countryPrefixOf(to);
  const { data } = await db
    .from("comm_blocklist")
    .select("scope, value, reason, channel")
    .in("value", [address, country])
    .limit(10);
  const hit = (data || []).find(
    (r) =>
      (!r.channel || r.channel === channel) &&
      ((r.scope === "address" && r.value === address) || (r.scope === "country" && r.value === country)),
  );
  return hit ? (hit.reason || "blocklisted") : null;
}

/** Másodpercenkénti átbocsátás ellenőrzése szolgáltatói fiókonként. */
async function throughputOk(db: SupabaseClient, accountId: string, maxTps: number): Promise<boolean> {
  try {
    const { data, error } = await db.rpc("comm_hit_throughput", { _account: accountId, _max_tps: maxTps });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/* ---------- Útvonalválasztás ---------- */

export async function pickSender(
  db: SupabaseClient,
  partnerId: string | null,
  channel: GatewayChannel,
  account: ProviderAccount,
): Promise<string | null> {
  if (partnerId) {
    const { data } = await db
      .from("comm_sender_numbers")
      .select("sender")
      .eq("partner_id", partnerId)
      .eq("channel", channel)
      .eq("active", true)
      .order("verified", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.sender) return data.sender;
  }
  return account.default_sender ?? null;
}

type RoutedAccount = ProviderAccount & {
  priority: number;
  max_tps: number;
  allowed_countries: string[];
  blocked_countries: string[];
  consecutive_failures: number;
  _routeId?: string | null;
  _senderOverride?: string | null;
};

/** A saját átjáró: tiltólista → útválasztási szabályok → átbocsátás → küldés, tartalék szolgáltatóval. */
export async function gatewaySend(
  db: SupabaseClient,
  input: { channel: GatewayChannel; to: string; body: string; partnerId?: string | null },
): Promise<GatewayResult & { accountId?: string | null; routeId?: string | null; country?: string }> {
  const { channel, to, body } = input;
  const partnerId = input.partnerId ?? null;
  const country = countryPrefixOf(to);

  const blocked = await isBlocked(db, channel, to);
  if (blocked) return { status: "failed", provider: null, error: `blocked:${blocked}`, country };

  const { data: accounts } = await db
    .from("comm_provider_accounts")
    .select(
      "id, partner_id, label, driver, channels, endpoint, credentials_encrypted, default_sender, priority, max_tps, allowed_countries, blocked_countries, consecutive_failures",
    )
    .eq("active", true)
    .contains("channels", [channel])
    .or(partnerId ? `partner_id.eq.${partnerId},partner_id.is.null` : "partner_id.is.null")
    .order("priority", { ascending: true });

  let ordered = ((accounts || []) as RoutedAccount[]).filter((a) => {
    const allow = a.allowed_countries || [];
    const block = a.blocked_countries || [];
    if (block.includes(country)) return false;
    if (allow.length && !allow.includes(country)) return false;
    return true;
  });

  // Útválasztási szabályok: ország- és csatorna-specifikus sorrend felülírja az alapértelmezettet.
  const { data: rules } = await db
    .from("comm_routing_rules")
    .select("id, partner_id, channel, country_prefix, provider_account_id, priority, sender_override")
    .eq("active", true)
    .eq("channel", channel)
    .in("country_prefix", [country, "*"])
    .or(partnerId ? `partner_id.eq.${partnerId},partner_id.is.null` : "partner_id.is.null")
    .order("priority", { ascending: true });

  const ruleFor = new Map<string, { id: string; rank: number; sender: string | null }>();
  (rules || []).forEach((r, idx) => {
    if (!r.provider_account_id || ruleFor.has(r.provider_account_id)) return;
    const specificity = (r.country_prefix === "*" ? 1000 : 0) + (r.partner_id ? 0 : 100);
    ruleFor.set(r.provider_account_id, {
      id: r.id,
      rank: specificity + (r.priority ?? 100) + idx,
      sender: r.sender_override ?? null,
    });
  });

  ordered = ordered
    .map((a) => {
      const rule = ruleFor.get(a.id);
      return { ...a, _routeId: rule?.id ?? null, _senderOverride: rule?.sender ?? null, priority: rule ? rule.rank : (a.priority ?? 100) + 5000 };
    })
    .sort((a, b) => {
      const own = (x: RoutedAccount) => (partnerId && x.partner_id === partnerId ? 0 : 1);
      return own(a) - own(b) || a.priority - b.priority || (a.consecutive_failures ?? 0) - (b.consecutive_failures ?? 0);
    });

  if (!ordered.length) {
    return { status: "no_provider", provider: null, error: "Nincs bekötött saját átjáró-szolgáltató", country };
  }

  let lastError: string | null = null;
  for (const acc of ordered) {
    try {
      if (!(await throughputOk(db, acc.id, acc.max_tps ?? 10))) {
        lastError = `${acc.label}: átbocsátási korlát (${acc.max_tps ?? 10}/mp)`;
        continue;
      }
      const creds = acc.credentials_encrypted ? await decryptCredentials(acc.credentials_encrypted) : {};
      const sender = acc._senderOverride || (await pickSender(db, partnerId, channel, acc));
      if (!sender) {
        lastError = `${acc.label}: nincs feladó szám`;
        continue;
      }
      const result =
        acc.driver === "twilio"
          ? await sendTwilio(acc, creds, channel, to, body, sender)
          : acc.driver === "gatewayapi"
            ? await sendGatewayApi(acc, creds, channel, to, body, sender)
            : await sendHttpGeneric(acc, creds, channel, to, body, sender);

      const failures = result.status === "sent" ? 0 : (acc.consecutive_failures ?? 0) + 1;
      await db
        .from("comm_provider_accounts")
        .update(
          result.status === "sent"
            ? { last_ok_at: new Date().toISOString(), last_error: null, consecutive_failures: 0, health: "healthy" }
            : {
                last_error: (result.error || "ismeretlen hiba").slice(0, 300),
                consecutive_failures: failures,
                health: failures >= 5 ? "down" : "degraded",
              },
        )
        .eq("id", acc.id);

      if (result.status === "sent") {
        return { ...result, accountId: acc.id, routeId: acc._routeId ?? null, country };
      }
      lastError = result.error ?? null;
    } catch (e) {
      lastError = String(e).slice(0, 300);
    }
  }

  return { status: "failed", provider: null, error: lastError || "Minden szolgáltató sikertelen", country };
}
