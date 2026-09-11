// APEX saját átjáró (gateway) — szolgáltató-illesztők és útvonalválasztás.
// A partner saját fiókja elsőbbséget élvez a platform fiókjaival szemben.
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
  driver: "twilio" | "gatewayapi" | "http_generic";
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

/** A saját átjáró: kiválasztja a megfelelő szolgáltatói fiókot és kiküldi az üzenetet. */
export async function gatewaySend(
  db: SupabaseClient,
  input: { channel: GatewayChannel; to: string; body: string; partnerId?: string | null },
): Promise<GatewayResult> {
  const { channel, to, body } = input;
  const partnerId = input.partnerId ?? null;

  const { data: accounts } = await db
    .from("comm_provider_accounts")
    .select("id, partner_id, label, driver, channels, endpoint, credentials_encrypted, default_sender, priority")
    .eq("active", true)
    .contains("channels", [channel])
    .or(partnerId ? `partner_id.eq.${partnerId},partner_id.is.null` : "partner_id.is.null")
    .order("priority", { ascending: true });

  const ordered = (accounts || []).sort((a, b) => {
    const own = (x: { partner_id: string | null }) => (partnerId && x.partner_id === partnerId ? 0 : 1);
    return own(a) - own(b) || (a.priority ?? 100) - (b.priority ?? 100);
  }) as (ProviderAccount & { priority: number })[];

  if (!ordered.length) {
    return { status: "no_provider", provider: null, error: "Nincs bekötött saját átjáró-szolgáltató" };
  }

  let lastError: string | null = null;
  for (const acc of ordered) {
    try {
      const creds = acc.credentials_encrypted ? await decryptCredentials(acc.credentials_encrypted) : {};
      const sender = await pickSender(db, partnerId, channel, acc);
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

      await db
        .from("comm_provider_accounts")
        .update(
          result.status === "sent"
            ? { last_ok_at: new Date().toISOString(), last_error: null }
            : { last_error: (result.error || "ismeretlen hiba").slice(0, 300) },
        )
        .eq("id", acc.id);

      if (result.status === "sent") return result;
      lastError = result.error ?? null;
    } catch (e) {
      lastError = String(e).slice(0, 300);
    }
  }

  return { status: "failed", provider: null, error: lastError || "Minden szolgáltató sikertelen" };
}
