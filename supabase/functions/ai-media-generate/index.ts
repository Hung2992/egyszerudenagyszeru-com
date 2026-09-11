// AI kép/videó generálás — saját ingyenes szerverrel (local-first), felhő tartalékkal.
// Bemenet: { kind: "image" | "video", prompt, width?, height?, seconds?, partner_id? }
// Kimenet: { ok, kind, url, storage_path, source, provider, latency_ms }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { generateMedia } from "../_shared/media-router.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authed.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized", message: "Jelentkezz be." }, 401);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body", message: "Hibás kérés." }, 400);
    }
    if (!body || typeof body !== "object") return json({ error: "invalid_body" }, 400);

    const kind = String(body.kind ?? "image");
    if (kind !== "image" && kind !== "video") {
      return json({ error: "invalid_kind", message: "A típus csak kép vagy videó lehet." }, 400);
    }
    const prompt = String(body.prompt ?? "").trim();
    if (prompt.length < 3 || prompt.length > 1500) {
      return json({ error: "invalid_prompt", message: "A leírás 3–1500 karakter legyen." }, 400);
    }
    const partnerId = body.partner_id ? String(body.partner_id) : null;
    if (partnerId && !UUID_RE.test(partnerId)) {
      return json({ error: "invalid_partner", message: "Érvénytelen partner azonosító." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Egyszerű visszaélés-védelem: óránként max 40 generálás felhasználónként.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("ai_generated_media")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= 40) {
      return json({ error: "rate_limited", message: "Óránként legfeljebb 40 generálás." }, 429);
    }

    let media;
    try {
      media = await generateMedia({
        kind,
        prompt,
        width: Number(body.width) || undefined,
        height: Number(body.height) || undefined,
        seconds: Number(body.seconds) || undefined,
      });
    } catch (e) {
      const msg = (e as Error).message || "media_error";
      if (msg.startsWith("no_local_video_server") || msg.startsWith("local_video_unavailable")) {
        return json({
          error: "no_video_server",
          message: "Videóhoz még nincs bekötve saját (ingyenes) videó szerver. Add hozzá az Admin → Saját AI szerver fülön.",
          detail: msg,
        }, 503);
      }
      if (msg === "credits_exhausted" || msg === "ai_blocked" || msg === "ai_unauthorized") {
        return json({
          error: msg,
          message: "A felhős AI most nem elérhető. Köss be saját ingyenes képgeneráló szervert.",
        }, 503);
      }
      return json({ error: "media_failed", message: "A generálás nem sikerült.", detail: msg.slice(0, 200) }, 502);
    }

    const ext = media.contentType.includes("video")
      ? "mp4"
      : media.contentType.includes("jpeg") ? "jpg"
      : media.contentType.includes("webp") ? "webp" : "png";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("ai-media")
      .upload(path, media.bytes, { contentType: media.contentType, upsert: false });
    if (upErr) {
      console.error("upload failed", upErr.message);
      return json({ error: "upload_failed", message: "A fájl mentése nem sikerült." }, 500);
    }

    const { data: signed } = await admin.storage.from("ai-media").createSignedUrl(path, 60 * 60 * 24 * 7);
    const url = signed?.signedUrl ?? "";

    await admin.from("ai_generated_media").insert({
      user_id: user.id,
      partner_id: partnerId,
      kind,
      prompt,
      storage_path: path,
      public_url: url,
      source: media.source,
      provider: media.provider,
      latency_ms: media.latencyMs,
    });

    return json({
      ok: true,
      kind,
      url,
      storage_path: path,
      source: media.source,
      provider: media.provider,
      latency_ms: media.latencyMs,
    });
  } catch (e) {
    console.error("ai-media-generate error", (e as Error).message);
    return json({ error: "server_error", message: "Váratlan hiba." }, 500);
  }
});
