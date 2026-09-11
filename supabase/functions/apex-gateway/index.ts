// APEX saját átjáró (gateway) — külön szolgáltatás.
// Itt fut a saját távközlési útvonalválasztás: partner saját fiókjai, majd a platform fiókjai.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, json, logEvent } from "../_shared/comm-core.ts";
import { encryptCredentials, gatewaySend, type GatewayChannel } from "../_shared/gateway-drivers.ts";
import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";

const CHANNELS: GatewayChannel[] = ["sms", "whatsapp", "voice"];
const DRIVERS = ["twilio", "gatewayapi", "http_generic"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Caller = { kind: "internal" }; // belső/admin
type PartnerCaller = { kind: "partner"; partnerId: string; userId: string };

async function resolveCaller(req: Request): Promise<Caller | PartnerCaller | Response> {
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer) {
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false },
    });
    const { data } = await anon.auth.getUser(bearer);
    if (data?.user) {
      const db = adminClient();
      const { data: isAdmin } = await db.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      if (isAdmin) return { kind: "internal" };
      const { data: partner } = await db
        .from("partners")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (partner?.id) return { kind: "partner", partnerId: partner.id, userId: data.user.id };
      return json({ error: "forbidden" }, 403);
    }
  }
  const guard = await requireInternalOrAdmin(req);
  if (!guard.ok) return guard.response;
  return { kind: "internal" };
}

function sanitizeAccount(row: Record<string, unknown>) {
  const { credentials_encrypted: _drop, ...rest } = row as Record<string, unknown>;
  return { ...rest, credentials_set: Boolean(_drop) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;

    let payload: Record<string, unknown>;
    try {
      payload = (await req.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!payload || typeof payload !== "object") return json({ error: "invalid_body" }, 400);

    const action = String(payload.action || "");
    const db = adminClient();
    const isInternal = caller.kind === "internal";
    const callerPartner = caller.kind === "partner" ? caller.partnerId : null;

    // A partner mindig csak a saját erőforrásait éri el.
    const scopePartner = (requested: unknown): string | null | Response => {
      if (callerPartner) return callerPartner;
      if (requested === null || requested === undefined || requested === "") return null;
      if (typeof requested !== "string" || !UUID.test(requested)) return json({ error: "invalid_partner_id" }, 400);
      return requested;
    };

    switch (action) {
      case "list_accounts": {
        const p = scopePartner(payload.partner_id);
        if (p instanceof Response) return p;
        let q = db
          .from("comm_provider_accounts")
          .select("id, partner_id, label, driver, channels, endpoint, default_sender, priority, active, last_ok_at, last_error, credentials_encrypted, created_at")
          .order("priority", { ascending: true });
        q = p ? q.eq("partner_id", p) : q.is("partner_id", null);
        const { data, error } = await q;
        if (error) return json({ error: "db_error", details: error.message }, 500);
        return json({ accounts: (data || []).map(sanitizeAccount) });
      }

      case "save_account": {
        const p = scopePartner(payload.partner_id);
        if (p instanceof Response) return p;
        const label = String(payload.label || "").trim();
        const driver = String(payload.driver || "");
        const channels = Array.isArray(payload.channels) ? (payload.channels as string[]) : [];
        if (!label || label.length > 80) return json({ error: "invalid_label" }, 400);
        if (!DRIVERS.includes(driver)) return json({ error: "invalid_driver" }, 400);
        if (!channels.length || channels.some((c) => !CHANNELS.includes(c as GatewayChannel))) {
          return json({ error: "invalid_channels" }, 400);
        }
        const endpoint = payload.endpoint ? String(payload.endpoint) : null;
        if (endpoint && !/^https:\/\//i.test(endpoint)) return json({ error: "endpoint_must_be_https" }, 400);

        const creds = (payload.credentials && typeof payload.credentials === "object")
          ? (payload.credentials as Record<string, string>)
          : null;
        const row: Record<string, unknown> = {
          partner_id: p,
          label,
          driver,
          channels,
          endpoint,
          default_sender: payload.default_sender ? String(payload.default_sender).slice(0, 40) : null,
          priority: Number(payload.priority ?? 100),
          active: payload.active === false ? false : true,
        };
        if (creds && Object.keys(creds).length) {
          row.credentials_encrypted = await encryptCredentials(creds);
        }

        const id = payload.id ? String(payload.id) : null;
        if (id) {
          if (!UUID.test(id)) return json({ error: "invalid_id" }, 400);
          let upd = db.from("comm_provider_accounts").update(row).eq("id", id);
          upd = p ? upd.eq("partner_id", p) : upd.is("partner_id", null);
          const { data, error } = await upd.select("id").maybeSingle();
          if (error) return json({ error: "db_error", details: error.message }, 500);
          if (!data) return json({ error: "not_found" }, 404);
          return json({ ok: true, id: data.id });
        }
        const { data, error } = await db.from("comm_provider_accounts").insert(row).select("id").single();
        if (error) return json({ error: "db_error", details: error.message }, 500);
        return json({ ok: true, id: data.id });
      }

      case "delete_account": {
        const p = scopePartner(payload.partner_id);
        if (p instanceof Response) return p;
        const id = String(payload.id || "");
        if (!UUID.test(id)) return json({ error: "invalid_id" }, 400);
        let del = db.from("comm_provider_accounts").delete().eq("id", id);
        del = p ? del.eq("partner_id", p) : del.is("partner_id", null);
        const { error } = await del;
        if (error) return json({ error: "db_error", details: error.message }, 500);
        return json({ ok: true });
      }

      case "send":
      case "test": {
        if (!isInternal && !callerPartner) return json({ error: "forbidden" }, 403);
        const p = scopePartner(payload.partner_id);
        if (p instanceof Response) return p;
        const channel = String(payload.channel || "sms") as GatewayChannel;
        if (!CHANNELS.includes(channel)) return json({ error: "invalid_channel" }, 400);
        const to = String(payload.to || "").trim();
        if (!/^\+?[0-9]{6,20}$/.test(to.replace(/^whatsapp:/, ""))) return json({ error: "invalid_phone" }, 400);
        const body = String(payload.body || "").trim();
        if (!body || body.length > 1600) return json({ error: "invalid_body" }, 400);

        const { data: logRow } = await db
          .from("messaging_outbox")
          .insert({
            channel,
            to_address: to,
            body,
            partner_id: p,
            related_type: action === "test" ? "gateway_test" : "partner_manual",
            status: "queued",
          })
          .select("id")
          .maybeSingle();

        const result = await gatewaySend(db, { channel, to, body, partnerId: p });

        if (logRow?.id) {
          await db
            .from("messaging_outbox")
            .update({
              status: result.status,
              provider: result.provider,
              provider_message_id: result.providerId ?? null,
              error: result.error ?? null,
              attempts: 1,
              sent_at: result.status === "sent" ? new Date().toISOString() : null,
            })
            .eq("id", logRow.id);
        }
        await logEvent(db, {
          partnerId: p,
          event: action === "test" ? "gateway.test" : "gateway.send",
          channel,
          provider: result.provider,
          detail: { status: result.status, error: result.error ?? null },
        });
        const status = result.status === "sent" ? 200 : result.status === "no_provider" ? 200 : 502;
        return json(result, status);
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    console.error("apex-gateway hiba:", e);
    return json({ error: "internal_error" }, 500);
  }
});
