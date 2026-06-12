// Accountant TOTP 2FA: enroll / verify / status / disable
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authenticator } from "https://esm.sh/otplib@12.0.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

authenticator.options = { window: 1, step: 30 };

const ISSUER = "Egyszerű de Nagyszerű";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "Nincs bejelentkezve" }, 401);

    const admin = createClient(url, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");

    // Verify caller is accountant or admin
    const { data: isAcc } = await admin.rpc("has_role", { _user_id: user.id, _role: "accountant" });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAcc && !isAdmin) return json({ ok: false, error: "Csak könyvelő vagy admin" }, 403);

    if (action === "status") {
      const { data } = await admin.from("accountant_totp_secrets").select("enabled,verified_at").eq("user_id", user.id).maybeSingle();
      return json({ ok: true, enabled: !!data?.enabled, verified_at: data?.verified_at ?? null });
    }

    if (action === "enroll") {
      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(user.email ?? "konyvelo", ISSUER, secret);
      const qr_data_url = await QRCode.toDataURL(otpauth, { margin: 1, width: 240 });
      const backup = Array.from({ length: 8 }, () =>
        Array.from(crypto.getRandomValues(new Uint8Array(5)))
          .map((b) => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 31]).join(""));
      await admin.from("accountant_totp_secrets").upsert({
        user_id: user.id, secret, enabled: false, backup_codes: backup, verified_at: null,
      }, { onConflict: "user_id" });
      return json({ ok: true, secret, otpauth, qr_data_url, backup_codes: backup });
    }

    if (action === "verify") {
      const code = String(body.code || "").replace(/\s/g, "");
      if (!/^\d{6}$/.test(code)) return json({ ok: false, error: "6 jegyű kód szükséges" }, 400);
      const { data: row } = await admin.from("accountant_totp_secrets").select("secret,enabled,backup_codes").eq("user_id", user.id).maybeSingle();
      if (!row?.secret) return json({ ok: false, error: "Nincs aktiválás folyamatban" }, 400);
      const valid = authenticator.check(code, row.secret);
      const backupHit = !valid && Array.isArray(row.backup_codes) && row.backup_codes.includes(code.toUpperCase());
      if (!valid && !backupHit) return json({ ok: false, error: "Érvénytelen kód" }, 400);

      const update: Record<string, unknown> = { enabled: true, verified_at: new Date().toISOString(), last_used_at: new Date().toISOString() };
      if (backupHit) update.backup_codes = (row.backup_codes as string[]).filter((c) => c !== code.toUpperCase());
      await admin.from("accountant_totp_secrets").update(update).eq("user_id", user.id);

      await admin.from("accountant_access_log").insert({
        user_id: user.id, action: "totp_verified", resource: backupHit ? "backup_code" : "totp",
        ip_address: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      });
      return json({ ok: true, used_backup: backupHit });
    }

    if (action === "disable") {
      await admin.from("accountant_totp_secrets").delete().eq("user_id", user.id);
      await admin.from("accountant_access_log").insert({ user_id: user.id, action: "totp_disabled", resource: "totp" });
      return json({ ok: true });
    }

    return json({ ok: false, error: "Ismeretlen művelet" }, 400);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
